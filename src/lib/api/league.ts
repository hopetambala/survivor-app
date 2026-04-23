// Typed wrappers around the code-gated RPC functions introduced in migrations
// 0002 and 0007. Keeps the public-page data path in one place so we can call
// it from both server components and (if needed) client code.

import { createServerSupabaseClient } from "../supabase/server";
import { normalizeLeagueCode } from "../scoring";
import type {
  PublicLeague,
  Survivor,
  Player,
  DraftPick,
  ScoringRule,
  Episode,
  EpisodeEvent,
  Attendance,
  LeaderboardRow,
} from "../supabase/types";

export type PublicLeagueBundle = {
  league: PublicLeague;
  survivors: Survivor[];
  players: Player[];
  draftPicks: DraftPick[];
  rules: ScoringRule[];
  episodes: Episode[];
  events: EpisodeEvent[];
  attendance: Attendance[];
  leaderboard: LeaderboardRow[];
};

// Returns null when the code doesn't resolve to a league. Callers should treat
// that as a 404 (invoke notFound() in a server component).
export async function fetchPublicLeagueByCode(code: string): Promise<PublicLeagueBundle | null> {
  const normalized = normalizeLeagueCode(code);
  const supabase = await createServerSupabaseClient();

  const [
    leagueRes,
    survivorsRes,
    playersRes,
    picksRes,
    rulesRes,
    epsRes,
    eventsRes,
    attendRes,
    leaderboardRes,
  ] = await Promise.all([
    supabase.rpc("get_league_by_code", { p_code: normalized }),
    supabase.rpc("get_survivors_for_code", { p_code: normalized }),
    supabase.rpc("get_players_for_code", { p_code: normalized }),
    supabase.rpc("get_draft_picks_for_code", { p_code: normalized }),
    supabase.rpc("get_scoring_rules_for_code", { p_code: normalized }),
    supabase.rpc("get_episodes_for_code", { p_code: normalized }),
    supabase.rpc("get_episode_events_for_code", { p_code: normalized }),
    supabase.rpc("get_attendance_for_code", { p_code: normalized }),
    supabase.rpc("get_leaderboard_for_code", { p_code: normalized }),
  ]);

  const league = leagueRes.data?.[0];
  if (!league) return null;

  return {
    league,
    survivors: survivorsRes.data ?? [],
    players: playersRes.data ?? [],
    draftPicks: picksRes.data ?? [],
    rules: rulesRes.data ?? [],
    episodes: epsRes.data ?? [],
    events: eventsRes.data ?? [],
    attendance: attendRes.data ?? [],
    leaderboard: leaderboardRes.data ?? [],
  };
}
