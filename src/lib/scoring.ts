import type { ScoringRule } from "./supabase/types";

// Default scoring rules based on the spreadsheet
export const DEFAULT_SCORING_RULES: Omit<ScoringRule, "id" | "league_id" | "created_at">[] = [
  { event_name: "Won team reward", points: 1, description: "Worth nothing if combined with immunity. In 3-team scenario: 1st=1pt, 2nd=0.5pt, 3rd=0.", is_variable: false, sort_order: 1 },
  { event_name: "Won individual reward", points: 2, description: "Worth nothing if combined with immunity.", is_variable: false, sort_order: 2 },
  { event_name: "Taken on individual reward", points: 1, description: "Excludes the winner.", is_variable: false, sort_order: 3 },
  { event_name: "Won team immunity", points: 1, description: null, is_variable: false, sort_order: 4 },
  { event_name: "Won individual immunity", points: 2, description: null, is_variable: false, sort_order: 5 },
  { event_name: "Has idol at end of episode (at tribal)", points: 1, description: "Per idol held. Excludes episode where you use it.", is_variable: false, sort_order: 6 },
  { event_name: "Uses idol (or successful dice)", points: 0.5, description: "0.5 per vote saved. Points go to the person who physically played it.", is_variable: true, sort_order: 7 },
  { event_name: "Voted off with idol", points: -3, description: "Per idol held when voted off.", is_variable: false, sort_order: 8 },
  { event_name: "Survived an elimination", points: 1, description: null, is_variable: false, sort_order: 9 },
  { event_name: "Has episode title or hashtag", points: 0.25, description: "Must be about a specific person/subset, not a whole tribe.", is_variable: false, sort_order: 10 },
  { event_name: "Goes home with dice", points: -0.5, description: null, is_variable: false, sort_order: 11 },
  { event_name: "Mini reward victory", points: 0.5, description: "For participants.", is_variable: false, sort_order: 12 },
  { event_name: "Made final group", points: 2, description: "Final three in modern Survivor.", is_variable: false, sort_order: 13 },
  { event_name: "Vote in final group", points: 0.5, description: "Per vote cast on you.", is_variable: true, sort_order: 14 },
  { event_name: "Won Survivor", points: 7.5, description: "Assume all unshown votes go to winner. Gets final group points too.", is_variable: false, sort_order: 15 },
];

// Generate a random 4-digit league code
export function generateLeagueCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Determine who picks next in a snake draft
export function getSnakeDraftCurrentPlayer(
  draftOrder: string[],
  currentRound: number,
  currentPickIndex: number
): string | null {
  if (draftOrder.length === 0) return null;
  const isEvenRound = currentRound % 2 === 0;
  // Snake: odd rounds go forward, even rounds go backward
  if (isEvenRound) {
    const reverseIndex = draftOrder.length - 1 - currentPickIndex;
    return draftOrder[reverseIndex] ?? null;
  }
  return draftOrder[currentPickIndex] ?? null;
}

// Calculate player scores from episode events + attendance
export interface PlayerScore {
  playerId: string;
  playerName: string;
  totalScore: number;
  survivorScore: number;
  attendanceScore: number;
  episodeScores: { episode: number; survivorScore: number; attendanceScore: number; total: number }[];
}

export function calculatePlayerScores(
  players: { id: string; name: string }[],
  draftPicks: { player_id: string; survivor_id: string }[],
  episodes: { id: string; episode_number: number }[],
  episodeEvents: { episode_id: string; survivor_id: string; scoring_rule_id: string; value: number }[],
  scoringRules: { id: string; points: number; is_variable: boolean }[],
  attendanceRecords: { episode_id: string; player_id: string; points: number }[]
): PlayerScore[] {
  const rulesMap = new Map(scoringRules.map((r) => [r.id, r]));

  return players.map((player) => {
    const playerSurvivorIds = new Set(
      draftPicks.filter((dp) => dp.player_id === player.id).map((dp) => dp.survivor_id)
    );

    const episodeScores = episodes
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((episode) => {
        // Sum survivor scores for this episode
        const survivorScore = episodeEvents
          .filter((ee) => ee.episode_id === episode.id && playerSurvivorIds.has(ee.survivor_id))
          .reduce((sum, ee) => {
            const rule = rulesMap.get(ee.scoring_rule_id);
            if (!rule) return sum;
            return sum + (rule.is_variable ? ee.value : rule.points * ee.value);
          }, 0);

        const attendanceRecord = attendanceRecords.find(
          (a) => a.episode_id === episode.id && a.player_id === player.id
        );
        const attendanceScore = attendanceRecord?.points ?? 0;

        return {
          episode: episode.episode_number,
          survivorScore,
          attendanceScore,
          total: survivorScore + attendanceScore,
        };
      });

    const totalSurvivor = episodeScores.reduce((s, e) => s + e.survivorScore, 0);
    const totalAttendance = episodeScores.reduce((s, e) => s + e.attendanceScore, 0);

    return {
      playerId: player.id,
      playerName: player.name,
      totalScore: totalSurvivor + totalAttendance,
      survivorScore: totalSurvivor,
      attendanceScore: totalAttendance,
      episodeScores,
    };
  });
}
