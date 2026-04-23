-- 0005_draft_concurrency.sql
--
-- Adds optimistic-lock versioning to draft_state and four RPCs that make
-- every draft mutation atomic. Today the draft page issues 2+ sequential
-- write requests per action; if two admins act at once the state advances
-- twice and a pick is lost.
--
-- Scoped to survivor-app tables; no listings_tracker_* changes.

-- ============================================
-- 1. Version column on draft_state
-- ============================================
alter table draft_state
  add column if not exists version int not null default 1;

-- ============================================
-- 2. start_draft(league_id, draft_order) -> new_version
-- ============================================
create or replace function public.start_draft(
  p_league_id    uuid,
  p_draft_order  uuid[]
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_version int;
begin
  if coalesce(array_length(p_draft_order, 1), 0) < 2 then
    raise exception 'Need at least 2 players to start a draft'
      using errcode = 'P0001';
  end if;

  update draft_state
    set status             = 'in_progress',
        current_round      = 1,
        current_pick_index = 0,
        draft_order        = p_draft_order,
        version            = version + 1,
        updated_at         = now()
    where league_id = p_league_id
    returning version into v_new_version;

  if v_new_version is null then
    raise exception 'No draft_state for league %', p_league_id using errcode = 'P0002';
  end if;

  return v_new_version;
end;
$$;

grant execute on function public.start_draft(uuid, uuid[]) to authenticated;

-- ============================================
-- 3. make_draft_pick — the key atomic operation
-- ============================================
create or replace function public.make_draft_pick(
  p_league_id        uuid,
  p_player_id        uuid,
  p_survivor_id      uuid,
  p_expected_version int
)
returns table(new_version int, pick_number int)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_state           draft_state%rowtype;
  v_league          leagues%rowtype;
  v_survivor_drafts int;
  v_total_needed    int;
  v_pick_number     int;
  v_next_round      int;
  v_next_index      int;
  v_new_status      text;
  v_new_version     int;
begin
  -- Lock the draft_state row; serializes concurrent admins through this
  -- function for the same league.
  select * into v_state
    from draft_state
   where league_id = p_league_id
   for update;

  if not found then
    raise exception 'No draft_state for league %', p_league_id using errcode = 'P0002';
  end if;

  if v_state.version <> p_expected_version then
    -- Custom code 40001 (serialization_failure) signals "retry after reload".
    raise exception 'Draft state was modified by another request'
      using errcode = '40001';
  end if;

  if v_state.status <> 'in_progress' then
    raise exception 'Draft is not in progress' using errcode = 'P0001';
  end if;

  select * into v_league from leagues where id = p_league_id;

  -- Enforce per-league max_times_drafted.
  select count(*) into v_survivor_drafts
    from draft_picks
   where league_id = p_league_id and survivor_id = p_survivor_id;

  if v_survivor_drafts >= v_league.max_times_drafted then
    raise exception 'Survivor has already been drafted the maximum number of times'
      using errcode = 'P0001';
  end if;

  -- Next pick number is MAX(pick_number)+1 under the lock.
  select coalesce(max(dp.pick_number), 0) + 1 into v_pick_number
    from draft_picks dp
   where dp.league_id = p_league_id;

  v_total_needed := array_length(v_state.draft_order, 1) * v_league.num_picks_per_player;

  -- Unique constraint (league_id, player_id, survivor_id) from migration 0003
  -- catches the "same player picks same survivor twice" case.
  insert into draft_picks (league_id, player_id, survivor_id, round, pick_number)
    values (p_league_id, p_player_id, p_survivor_id, v_state.current_round, v_pick_number);

  -- Advance the draft cursor.
  v_next_index := v_state.current_pick_index + 1;
  v_next_round := v_state.current_round;
  if v_next_index >= array_length(v_state.draft_order, 1) then
    v_next_index := 0;
    v_next_round := v_next_round + 1;
  end if;

  if v_pick_number >= v_total_needed then
    v_new_status := 'completed';
  else
    v_new_status := 'in_progress';
  end if;

  v_new_version := v_state.version + 1;

  update draft_state
    set current_round      = v_next_round,
        current_pick_index = v_next_index,
        status             = v_new_status,
        version            = v_new_version,
        updated_at         = now()
    where league_id = p_league_id;

  return query select v_new_version, v_pick_number;
end;
$$;

grant execute on function public.make_draft_pick(uuid, uuid, uuid, int) to authenticated;

-- ============================================
-- 4. undo_last_draft_pick(league_id, expected_version) -> new_version
-- ============================================
create or replace function public.undo_last_draft_pick(
  p_league_id        uuid,
  p_expected_version int
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_state       draft_state%rowtype;
  v_last_pick   draft_picks%rowtype;
  v_prev_round  int;
  v_prev_index  int;
  v_new_version int;
begin
  select * into v_state
    from draft_state
   where league_id = p_league_id
   for update;

  if not found then
    raise exception 'No draft_state for league %', p_league_id using errcode = 'P0002';
  end if;

  if v_state.version <> p_expected_version then
    raise exception 'Draft state was modified by another request' using errcode = '40001';
  end if;

  select * into v_last_pick
    from draft_picks
   where league_id = p_league_id
   order by pick_number desc
   limit 1;

  if not found then
    raise exception 'No pick to undo' using errcode = 'P0001';
  end if;

  delete from draft_picks where id = v_last_pick.id;

  v_prev_index := v_state.current_pick_index - 1;
  v_prev_round := v_state.current_round;
  if v_prev_index < 0 then
    v_prev_index := array_length(v_state.draft_order, 1) - 1;
    v_prev_round := greatest(1, v_prev_round - 1);
  end if;

  v_new_version := v_state.version + 1;

  update draft_state
    set current_round      = v_prev_round,
        current_pick_index = v_prev_index,
        status             = 'in_progress',
        version            = v_new_version,
        updated_at         = now()
    where league_id = p_league_id;

  return v_new_version;
end;
$$;

grant execute on function public.undo_last_draft_pick(uuid, int) to authenticated;

-- ============================================
-- 5. reset_draft(league_id) -> new_version
-- ============================================
-- A reset is a full-stop action. It doesn't take an expected_version because
-- the commissioner explicitly intends to wipe whatever state exists.
create or replace function public.reset_draft(p_league_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_version int;
begin
  delete from draft_picks where league_id = p_league_id;

  update draft_state
    set status             = 'not_started',
        current_round      = 1,
        current_pick_index = 0,
        draft_order        = '{}'::uuid[],
        version            = version + 1,
        updated_at         = now()
    where league_id = p_league_id
    returning version into v_new_version;

  if v_new_version is null then
    raise exception 'No draft_state for league %', p_league_id using errcode = 'P0002';
  end if;

  return v_new_version;
end;
$$;

grant execute on function public.reset_draft(uuid) to authenticated;
