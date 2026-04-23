-- 0006_score_episode_rpc.sql
--
-- Replaces the client's delete-then-insert-then-flag flow with an atomic RPC.
-- Today a network blip between the delete and the insert wipes the episode's
-- scoring history. Wrapping in a PL/pgSQL function runs inside a single
-- transaction — either all three steps succeed or none of them do.
--
-- Scoped to survivor-app tables; no listings_tracker_* changes.

create or replace function public.score_episode(
  p_episode_id uuid,
  p_events     jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_league_id uuid;
begin
  -- Validate the episode exists and capture its league (admin RLS applies).
  select e.league_id into v_league_id
    from episodes e
   where e.id = p_episode_id;

  if v_league_id is null then
    raise exception 'Episode % not found', p_episode_id using errcode = 'P0002';
  end if;

  -- Replace the event set atomically. A failure anywhere below rolls back
  -- everything, including the delete — previously-entered scores survive.
  delete from episode_events where episode_id = p_episode_id;

  -- Only rows with a non-zero value are persisted; the UI treats zero as the
  -- absence of an event. Skip gracefully when the caller passes an empty array.
  if jsonb_typeof(p_events) = 'array' and jsonb_array_length(p_events) > 0 then
    insert into episode_events (episode_id, survivor_id, scoring_rule_id, value)
    select
      p_episode_id,
      (elem->>'survivor_id')::uuid,
      (elem->>'scoring_rule_id')::uuid,
      (elem->>'value')::numeric
    from jsonb_array_elements(p_events) as elem
    where (elem->>'value')::numeric <> 0;
  end if;

  update episodes set is_scored = true where id = p_episode_id;
end;
$$;

grant execute on function public.score_episode(uuid, jsonb) to authenticated;
