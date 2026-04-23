-- 0002_lockdown_rls.sql
--
-- Replace wide-open "public read" RLS with code-gated security-definer RPCs.
--
-- Before this migration: anyone with the anon key could SELECT every row from
-- every survivor-app table. After: the 9 tables are readable only by the
-- league admin (via existing admin policies), or through the RPCs below which
-- filter by a supplied league code.
--
-- This migration is scoped to survivor-app tables only. It does not touch
-- listings_tracker_* tables or any shared auth/storage objects.

-- ============================================
-- 1. DROP the blanket public-read policies
-- ============================================
drop policy if exists "Public read leagues by code" on leagues;
drop policy if exists "Public read survivors"       on survivors;
drop policy if exists "Public read players"         on players;
drop policy if exists "Public read draft_state"     on draft_state;
drop policy if exists "Public read draft_picks"     on draft_picks;
drop policy if exists "Public read scoring_rules"   on scoring_rules;
drop policy if exists "Public read episodes"        on episodes;
drop policy if exists "Public read episode_events"  on episode_events;
drop policy if exists "Public read attendance"      on attendance;

-- Admin `for all` policies from 0001_initial.sql remain in place.

-- ============================================
-- 2. Code-gated RPC functions (security definer)
-- ============================================
-- Each function filters by the league code the caller supplied, so a random
-- anon request can only pull data for a league whose code it already knows.
-- `set search_path = public` prevents schema-hijack; `stable` allows planner
-- caching within a statement.

create or replace function public.get_league_by_code(p_code text)
returns table(
  id                    uuid,
  name                  text,
  season_name           text,
  code                  text,
  num_survivors         int,
  num_picks_per_player  int,
  max_times_drafted     int,
  created_at            timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  -- admin_id intentionally omitted — PII link to auth.users.
  select l.id, l.name, l.season_name, l.code::text, l.num_survivors,
         l.num_picks_per_player, l.max_times_drafted, l.created_at
  from leagues l
  where l.code = p_code
  limit 1;
$$;

create or replace function public.get_survivors_for_code(p_code text)
returns setof survivors
language sql
security definer
stable
set search_path = public
as $$
  select s.*
  from survivors s
  join leagues l on l.id = s.league_id
  where l.code = p_code
  order by s.name;
$$;

create or replace function public.get_players_for_code(p_code text)
returns setof players
language sql
security definer
stable
set search_path = public
as $$
  select p.*
  from players p
  join leagues l on l.id = p.league_id
  where l.code = p_code
  order by p.name;
$$;

create or replace function public.get_draft_picks_for_code(p_code text)
returns setof draft_picks
language sql
security definer
stable
set search_path = public
as $$
  select dp.*
  from draft_picks dp
  join leagues l on l.id = dp.league_id
  where l.code = p_code
  order by dp.pick_number;
$$;

create or replace function public.get_scoring_rules_for_code(p_code text)
returns setof scoring_rules
language sql
security definer
stable
set search_path = public
as $$
  select sr.*
  from scoring_rules sr
  join leagues l on l.id = sr.league_id
  where l.code = p_code
  order by sr.sort_order;
$$;

create or replace function public.get_episodes_for_code(p_code text)
returns setof episodes
language sql
security definer
stable
set search_path = public
as $$
  select e.*
  from episodes e
  join leagues l on l.id = e.league_id
  where l.code = p_code
  order by e.episode_number;
$$;

create or replace function public.get_episode_events_for_code(p_code text)
returns setof episode_events
language sql
security definer
stable
set search_path = public
as $$
  select ee.*
  from episode_events ee
  join episodes e on e.id = ee.episode_id
  join leagues  l on l.id = e.league_id
  where l.code = p_code;
$$;

create or replace function public.get_attendance_for_code(p_code text)
returns setof attendance
language sql
security definer
stable
set search_path = public
as $$
  select a.*
  from attendance a
  join episodes e on e.id = a.episode_id
  join leagues  l on l.id = e.league_id
  where l.code = p_code;
$$;

-- ============================================
-- 3. Grant execution to anon + authenticated
-- ============================================
-- Only these 8 functions are exposed; tables remain locked behind admin RLS.
grant execute on function public.get_league_by_code(text)           to anon, authenticated;
grant execute on function public.get_survivors_for_code(text)       to anon, authenticated;
grant execute on function public.get_players_for_code(text)         to anon, authenticated;
grant execute on function public.get_draft_picks_for_code(text)     to anon, authenticated;
grant execute on function public.get_scoring_rules_for_code(text)   to anon, authenticated;
grant execute on function public.get_episodes_for_code(text)        to anon, authenticated;
grant execute on function public.get_episode_events_for_code(text)  to anon, authenticated;
grant execute on function public.get_attendance_for_code(text)      to anon, authenticated;

-- Rate-limiting note: Supabase's API gateway provides per-IP throttling for
-- the anon role. If brute-force enumeration becomes a real concern, add a
-- bucket table keyed by inet_client_addr() and check it inside each function.
-- Deferred — out of scope for the current (small private + portfolio) target.
