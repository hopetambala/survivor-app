"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import type { League, DraftState } from "../../../../lib/supabase/types";

export default function LeagueOverview() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [survivorCount, setSurvivorCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [episodeCount, setEpisodeCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadLeague();
  }, [leagueId]);

  async function loadLeague() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/admin"); return; }

    const [leagueRes, draftRes, survivorsRes, playersRes, episodesRes] = await Promise.all([
      supabase.from("leagues").select("*").eq("id", leagueId).single(),
      supabase.from("draft_state").select("*").eq("league_id", leagueId).single(),
      supabase.from("survivors").select("id").eq("league_id", leagueId),
      supabase.from("players").select("id").eq("league_id", leagueId),
      supabase.from("episodes").select("id").eq("league_id", leagueId),
    ]);

    if (!leagueRes.data || leagueRes.data.admin_id !== user.id) {
      router.push("/admin/dashboard");
      return;
    }
    setLeague(leagueRes.data);
    setDraftState(draftRes.data);
    setSurvivorCount(survivorsRes.data?.length ?? 0);
    setPlayerCount(playersRes.data?.length ?? 0);
    setEpisodeCount(episodesRes.data?.length ?? 0);
  }

  if (!league) {
    return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;
  }

  const navItems = [
    { label: "Survivors", href: `/admin/league/${leagueId}/survivors`, count: survivorCount, desc: "Manage contestants" },
    { label: "Players", href: `/admin/league/${leagueId}/players`, count: playerCount, desc: "Manage participants" },
    { label: "Draft", href: `/admin/league/${leagueId}/draft`, status: draftState?.status ?? "not_started", desc: "Run the snake draft" },
    { label: "Episodes", href: `/admin/league/${leagueId}/episodes`, count: episodeCount, desc: "Score episodes & attendance" },
    { label: "Scoring Rules", href: `/admin/league/${leagueId}/scoring-rules`, desc: "Manage point values" },
    { label: "Settings", href: `/admin/league/${leagueId}/settings`, desc: "Draft picks, max drafts & more" },
  ];

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <button onClick={() => router.push("/admin/dashboard")} className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; All Leagues
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="text-gray-500">{league.season_name}</p>
        <p className="text-sm mt-1">
          League Code: <span className="font-mono font-bold text-lg">{league.code}</span>
          <span className="text-gray-400 ml-2">(share with participants)</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="border rounded-lg p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="font-semibold flex items-center justify-between">
              {item.label}
              {item.count !== undefined && (
                <span className="text-sm bg-gray-100 px-2 py-0.5 rounded-full">{item.count}</span>
              )}
              {item.status && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  item.status === "completed" ? "bg-green-100 text-green-800" :
                  item.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {item.status.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
