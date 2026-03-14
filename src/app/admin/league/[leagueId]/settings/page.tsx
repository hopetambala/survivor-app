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
    return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to League
      </button>
      <h1 className="text-2xl font-bold mb-2">League Settings</h1>
      <p className="text-sm text-gray-500 mb-6">{league.name} &middot; {league.season_name}</p>

      {/* Current roster info */}
      <div className="border rounded-lg p-4 mb-6 bg-gray-50">
        <h2 className="font-semibold mb-2">Current Roster</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Players: <span className="font-medium">{playerCount}</span></div>
          <div>Survivors: <span className="font-medium">{survivorCount}</span></div>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Picks per player */}
        <div>
          <label className="block font-medium mb-1">Picks per Player</label>
          <p className="text-sm text-gray-500 mb-2">How many survivors each player drafts (their team size).</p>
          <input
            type="number"
            min={1}
            max={20}
            value={numPicksPerPlayer}
            onChange={(e) => setNumPicksPerPlayer(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max times drafted */}
        <div>
          <label className="block font-medium mb-1">Max Times a Survivor Can Be Drafted</label>
          <p className="text-sm text-gray-500 mb-2">
            How many different players can pick the same survivor. Needs to be high enough so every player can fill their team.
          </p>
          <input
            type="number"
            min={1}
            max={50}
            value={maxTimesDrafted}
            onChange={(e) => setMaxTimesDrafted(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Recommendation / validation */}
        <div className={`border rounded-lg p-4 ${isEnoughSlots ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <h3 className="font-semibold mb-1">{isEnoughSlots ? "Looks good" : "Not enough survivor slots"}</h3>
          <div className="text-sm space-y-1">
            <p>Total picks needed: <span className="font-medium">{playerCount} players × {numPicksPerPlayer} picks = {totalPicksNeeded}</span></p>
            <p>Available survivor slots: <span className="font-medium">{survivorCount} survivors × {maxTimesDrafted} max drafts = {totalSurvivorSlots}</span></p>
            {!isEnoughSlots && survivorCount > 0 && (
              <p className="mt-2">
                <button
                  type="button"
                  onClick={() => setMaxTimesDrafted(recommendedMax)}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Set to recommended: {recommendedMax}
                </button>
              </p>
            )}
            {survivorCount === 0 && (
              <p className="text-gray-500 mt-1">Add survivors first to see recommendations.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 w-fit"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && <p className="text-green-600 text-sm -mt-4">Settings saved!</p>}
      </form>
    </main>
  );
}
