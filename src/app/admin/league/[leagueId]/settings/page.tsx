"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import type { League } from "../../../../../lib/supabase/types";

export default function LeagueSettings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [numPicksPerPlayer, setNumPicksPerPlayer] = useState(6);
  const [maxTimesDrafted, setMaxTimesDrafted] = useState(5);
  const [survivorCount, setSurvivorCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [leagueId]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/admin"); return; }

    const [leagueRes, survivorsRes, playersRes] = await Promise.all([
      supabase.from("leagues").select("*").eq("id", leagueId).single(),
      supabase.from("survivors").select("id").eq("league_id", leagueId),
      supabase.from("players").select("id").eq("league_id", leagueId),
    ]);

    if (!leagueRes.data || leagueRes.data.admin_id !== user.id) {
      router.push("/admin/dashboard");
      return;
    }

    const l = leagueRes.data as League;
    setLeague(l);
    setNumPicksPerPlayer(l.num_picks_per_player);
    setMaxTimesDrafted(l.max_times_drafted);
    setSurvivorCount(survivorsRes.data?.length ?? 0);
    setPlayerCount(playersRes.data?.length ?? 0);
  }

  const totalPicksNeeded = playerCount * numPicksPerPlayer;
  const totalSurvivorSlots = survivorCount * maxTimesDrafted;
  const isEnoughSlots = survivorCount > 0 && totalSurvivorSlots >= totalPicksNeeded;
  const recommendedMax =
    survivorCount > 0 ? Math.ceil(totalPicksNeeded / survivorCount) : numPicksPerPlayer;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await supabase
      .from("leagues")
      .update({
        num_picks_per_player: numPicksPerPlayer,
        max_times_drafted: maxTimesDrafted,
      })
      .eq("id", leagueId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!league) {
    return <main className="page page--centered"><p>Loading...</p></main>;
  }

  return (
    <main className="page page--narrow">
      <dl-button variant="ghost" size="sm" onClick={() => router.push(`/admin/league/${leagueId}`)}>
        &larr; Back to League
      </dl-button>
      <dl-heading level={1}>League Settings</dl-heading>
      <dl-text size="300" color="secondary">{league.name} &middot; {league.season_name}</dl-text>

      {/* Current roster info */}
      <div className="cl-dlite-card cl-dlite-sem-p-400 cl-dlite-sem-bg-sunken cl-dlite-sem-mt-600 cl-dlite-sem-mb-600">
        <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">Current Roster</span>
        <div className="grid-2 cl-dlite-sem-mt-200 cl-dlite-sem-text-300">
          <div>Players: <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{playerCount}</span></div>
          <div>Survivors: <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{survivorCount}</span></div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <dl-stack gap="600">
          {/* Picks per player */}
          <div>
            <label className="cl-dlite-block cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-sem-mb-100">Picks per Player</label>
            <dl-text size="300" color="secondary">How many survivors each player drafts (their team size).</dl-text>
            <div className="cl-dlite-sem-mt-200">
              <input
                type="number"
                min={1}
                max={20}
                value={numPicksPerPlayer}
                onChange={(e) => setNumPicksPerPlayer(Number(e.target.value))}
                className="cl-dlite-input"
                style={{ width: "6rem" }}
              />
            </div>
          </div>

          {/* Max times drafted */}
          <div>
            <label className="cl-dlite-block cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-sem-mb-100">Max Times a Survivor Can Be Drafted</label>
            <dl-text size="300" color="secondary">
              How many different players can pick the same survivor. Needs to be high enough so every player can fill their team.
            </dl-text>
            <div className="cl-dlite-sem-mt-200">
              <input
                type="number"
                min={1}
                max={50}
                value={maxTimesDrafted}
                onChange={(e) => setMaxTimesDrafted(Number(e.target.value))}
                className="cl-dlite-input"
                style={{ width: "6rem" }}
              />
            </div>
          </div>

          {/* Recommendation / validation */}
          <div className={`cl-dlite-card cl-dlite-sem-p-400 ${isEnoughSlots ? "status-card--success" : "status-card--danger"}`}>
            <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">{isEnoughSlots ? "Looks good" : "Not enough survivor slots"}</span>
            <div className="cl-dlite-sem-text-300">
              <p>Total picks needed: <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{playerCount} players × {numPicksPerPlayer} picks = {totalPicksNeeded}</span></p>
              <p>Available survivor slots: <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{survivorCount} survivors × {maxTimesDrafted} max drafts = {totalSurvivorSlots}</span></p>
              {!isEnoughSlots && survivorCount > 0 && (
                <div className="cl-dlite-sem-mt-200">
                  <dl-button variant="ghost" size="sm" onClick={() => setMaxTimesDrafted(recommendedMax)}>
                    Set to recommended: {recommendedMax}
                  </dl-button>
                </div>
              )}
              {survivorCount === 0 && (
                <dl-text size="300" color="secondary">Add survivors first to see recommendations.</dl-text>
              )}
            </div>
          </div>

          <dl-button variant="primary" disabled={saving || undefined} onClick={handleSave}>
            {saving ? "Saving…" : "Save Settings"}
          </dl-button>
          {saved && <dl-text size="300" color="secondary" style={{ color: "var(--tk-dlite-semantic-color-feedback-success)" }}>Settings saved!</dl-text>}
        </dl-stack>
      </form>
    </main>
  );
}
