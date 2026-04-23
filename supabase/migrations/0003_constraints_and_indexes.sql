-- 0003_constraints_and_indexes.sql
--
-- Database-level input validation that the app has been trusting the UI to
-- enforce, plus a uniqueness guard on draft_picks and two missing indexes.
-- All statements are scoped to survivor-app tables only.
--
-- Code format is deliberately NOT constrained here — migration 0004 widens
-- `leagues.code` and will add the stricter regex then.

-- ============================================
-- CHECK constraints: non-empty, reasonably-bounded text
-- ============================================
alter table leagues
  add constraint leagues_name_nonempty
  check (length(trim(name)) between 1 and 128);

alter table leagues
  add constraint leagues_season_name_nonempty
  check (length(trim(season_name)) between 1 and 128);

alter table survivors
  add constraint survivors_name_nonempty
  check (length(trim(name)) between 1 and 128);

alter table survivors
  add constraint survivors_tribe_length
  check (tribe is null or length(trim(tribe)) between 1 and 64);

alter table players
  add constraint players_name_nonempty
  check (length(trim(name)) between 1 and 128);

alter table scoring_rules
  add constraint scoring_rules_event_name_nonempty
  check (length(trim(event_name)) between 1 and 128);

alter table episodes
  add constraint episodes_number_positive
  check (episode_number >= 1 and episode_number <= 1000);

-- ============================================
-- Uniqueness: a player can draft a given survivor at most once per league
-- ============================================
-- Different players can still each draft the same survivor (the league-level
-- `max_times_drafted` setting governs how many times total). Migration 0005
-- enforces that cap atomically inside the make_draft_pick RPC.
alter table draft_picks
  add constraint draft_picks_one_pick_per_player_survivor
  unique (league_id, player_id, survivor_id);

-- ============================================
-- Missing indexes (performance only, no behavioural change)
-- ============================================
create index if not exists idx_episode_events_survivor_rule
  on episode_events(survivor_id, scoring_rule_id);

create index if not exists idx_attendance_player
  on attendance(player_id);
