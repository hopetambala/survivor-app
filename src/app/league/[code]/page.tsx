import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicLeagueByCode } from "../../../lib/api/league";
import LeaguePublicView from "./LeaguePublicView";

// Dynamic metadata so shares render with the league's real name and season.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const bundle = await fetchPublicLeagueByCode(code);
  if (!bundle) {
    return { title: "League not found" };
  }
  return {
    title: bundle.league.name,
    description: `${bundle.league.name} — ${bundle.league.season_name}. Leaderboard, rosters, and episode scores.`,
    openGraph: {
      title: bundle.league.name,
      description: `${bundle.league.season_name} — Fantasy Survivor league standings.`,
    },
  };
}

export default async function LeaguePublicPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const bundle = await fetchPublicLeagueByCode(code);

  if (!bundle) {
    notFound();
  }

  return (
    <LeaguePublicView
      league={bundle.league}
      survivors={bundle.survivors}
      players={bundle.players}
      draftPicks={bundle.draftPicks}
      rules={bundle.rules}
      episodes={bundle.episodes}
      events={bundle.events}
      attendanceRecords={bundle.attendance}
      leaderboard={bundle.leaderboard}
    />
  );
}
