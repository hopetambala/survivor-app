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
    return <main className="page page--centered"><p>Loading...</p></main>;
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
    <main className="page page--narrow">
      <button onClick={() => router.push("/admin/dashboard")} className="btn-back">
        &larr; All Leagues
      </button>

      <div className="cl-dlite-sem-mb-600">
        <dl-heading level={1}>{league.name}</dl-heading>
        <dl-text color="secondary">{league.season_name}</dl-text>
        <dl-text size="300">
          League Code: <span className="cl-dlite-sem-font-mono cl-dlite-prim-font-bold cl-dlite-sem-text-500">{league.code}</span>
          <span className="cl-dlite-sem-text-tertiary cl-dlite-sem-ml-200">(share with participants)</span>
        </dl-text>
      </div>

      <div className="grid-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className="cl-dlite-card cl-dlite-text-left cl-dlite-cursor-pointer cl-dlite-sem-transition-colors"
            style={{ display: "block", width: "100%" }}
          >
            <dl-cluster justify="between" gap="200">
              <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">{item.label}</span>
              {item.count !== undefined && (
                <dl-badge>{item.count}</dl-badge>
              )}
              {item.status && (
                <dl-badge variant={
                  item.status === "completed" ? "success" :
                  item.status === "in_progress" ? "warning" :
                  "default"
                }>
                  {item.status.replace("_", " ")}
                </dl-badge>
              )}
            </dl-cluster>
            <dl-text size="300" color="secondary">{item.desc}</dl-text>
          </button>
        ))}
      </div>
    </main>
  );
}
