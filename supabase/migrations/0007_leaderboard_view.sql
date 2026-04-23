-- 0007_leaderboard_view.sql
--
-- DB-side leaderboard view + code-gated RPC. Until now every client has had
-- to replicate scoring math; making the database the single source of truth
-- means the admin view and the public view can never silently disagree.
--
-- Scoped to survivor-app tables; no listings_tracker_* changes.

create or replace view public.v_player_scores as
select
  p.id                                     as player_id,
  p.league_id,
  p.name                                   as player_name,
  coalesce(survivor_agg.pts, 0)            as survivor_score,
  coalesce(attendance_agg.pts, 0)          as attendance_score,
  coalesce(survivor_agg.pts, 0)
    + coalesce(attendance_agg.pts, 0)      as total_score
from players p
left join lateral (
  -- Sum of scoring-event contributions from survivors this player drafted.
  -- Rules flagged is_variable use the event's value directly; fixed rules
  -- multiply the rule's points by the event's value.
  select sum(
    case when sr.is_variable then ee.value else sr.points * ee.value end
  ) as pts
  from draft_picks dp
  join episode_events ee on ee.survivor_id = dp.survivor_id
  join scoring_rules  sr on sr.id          = ee.scoring_rule_id
  join episodes       e  on e.id           = ee.episode_id
  where dp.player_id = p.id
    and e.league_id  = p.league_id
    and e.is_scored  = true
) as survivor_agg on true
left join lateral (
  -- Attendance points are per-player-per-episode regardless of drafted survivors.
  select sum(a.points) as pts
  from attendance a
  join episodes   e on e.id = a.episode_id
  where a.player_id = p.id
    and e.is_scored = true
    and e.league_id = p.league_id
) as attendance_agg on true;

create or replace function public.get_leaderboard_for_code(p_code text)
returns table(
  player_id        uuid,
  player_name      text,
  survivor_score   numeric,
  attendance_score numeric,
  total_score      numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select v.player_id, v.player_name, v.survivor_score, v.attendance_score, v.total_score
    from v_player_scores v
    join leagues         l on l.id = v.league_id
   where l.code = p_code
   order by v.total_score desc, v.player_name;
$$;

grant execute on function public.get_leaderboard_for_code(text) to anon, authenticated;
