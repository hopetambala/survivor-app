"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { getSnakeDraftCurrentPlayer } from "../../../../../lib/scoring";
import type { Player, Survivor, DraftState, DraftPick } from "../../../../../lib/supabase/types";

export default function DraftPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [numPicks, setNumPicks] = useState(6);
  const [maxDrafts, setMaxDrafts] = useState(5);
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const [playersRes, survivorsRes, draftStateRes, picksRes, leagueRes] = await Promise.all([
      supabase.from("players").select("*").eq("league_id", leagueId).order("draft_order"),
      supabase.from("survivors").select("*").eq("league_id", leagueId).order("name"),
      supabase.from("draft_state").select("*").eq("league_id", leagueId).single(),
      supabase.from("draft_picks").select("*").eq("league_id", leagueId).order("pick_number"),
      supabase.from("leagues").select("num_picks_per_player, max_times_drafted").eq("id", leagueId).single(),
    ]);
    setPlayers(playersRes.data || []);
    setSurvivors(survivorsRes.data || []);
    setDraftState(draftStateRes.data);
    setDraftPicks(picksRes.data || []);
    if (leagueRes.data) {
      setNumPicks(leagueRes.data.num_picks_per_player);
      setMaxDrafts(leagueRes.data.max_times_drafted);
    }
  }, [leagueId, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // How many times has each survivor been drafted?
  function draftCountFor(survivorId: string) {
    return draftPicks.filter((p) => p.survivor_id === survivorId).length;
  }

  // Get picks for a specific player
  function picksForPlayer(playerId: string) {
    return draftPicks
      .filter((p) => p.player_id === playerId)
      .map((p) => survivors.find((s) => s.id === p.survivor_id)?.name ?? "?");
  }

  const currentPlayerId = draftState
    ? getSnakeDraftCurrentPlayer(draftState.draft_order, draftState.current_round, draftState.current_pick_index)
    : null;
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const totalPicksMade = draftPicks.length;
  const totalPicksNeeded = players.length * numPicks;
  const isDraftDone = totalPicksMade >= totalPicksNeeded;

  async function startDraft() {
    if (players.length < 2) {
      alert("Need at least 2 players to start a draft.");
      return;
    }
    if (survivors.length < 2) {
      alert("Need at least 2 survivors to start a draft.");
      return;
    }
    const draftOrder = players.map((p) => p.id);
    await supabase.from("draft_state").update({
      status: "in_progress",
      current_round: 1,
      current_pick_index: 0,
      draft_order: draftOrder,
      updated_at: new Date().toISOString(),
    }).eq("league_id", leagueId);
    loadData();
  }

  async function makePick(survivorId: string) {
    if (!draftState || !currentPlayerId) return;

    const pickNumber = totalPicksMade + 1;
    const { error } = await supabase.from("draft_picks").insert({
      league_id: leagueId,
      player_id: currentPlayerId,
      survivor_id: survivorId,
      round: draftState.current_round,
      pick_number: pickNumber,
    });

    if (error) {
      alert("Failed to make pick: " + error.message);
      return;
    }

    // Advance to next pick
    let nextPickIndex = draftState.current_pick_index + 1;
    let nextRound = draftState.current_round;

    if (nextPickIndex >= players.length) {
      nextPickIndex = 0;
      nextRound += 1;
    }

    const newStatus = pickNumber >= totalPicksNeeded ? "completed" : "in_progress";

    await supabase.from("draft_state").update({
      current_round: nextRound,
      current_pick_index: nextPickIndex,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq("league_id", leagueId);

    loadData();
  }

  async function undoLastPick() {
    if (draftPicks.length === 0) return;
    if (!confirm("Undo the last pick?")) return;

    const lastPick = draftPicks[draftPicks.length - 1];
    await supabase.from("draft_picks").delete().eq("id", lastPick.id);

    // Rewind the draft state
    let prevPickIndex = (draftState?.current_pick_index ?? 1) - 1;
    let prevRound = draftState?.current_round ?? 1;

    if (prevPickIndex < 0) {
      prevPickIndex = players.length - 1;
      prevRound = Math.max(1, prevRound - 1);
    }

    await supabase.from("draft_state").update({
      current_round: prevRound,
      current_pick_index: prevPickIndex,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    }).eq("league_id", leagueId);

    loadData();
  }

  async function resetDraft() {
    if (!confirm("Reset the entire draft? All picks will be deleted.")) return;
    await supabase.from("draft_picks").delete().eq("league_id", leagueId);
    await supabase.from("draft_state").update({
      status: "not_started",
      current_round: 1,
      current_pick_index: 0,
      draft_order: [],
      updated_at: new Date().toISOString(),
    }).eq("league_id", leagueId);
    loadData();
  }

  return (
    <main className="min-h-screen p-4 max-w-7xl mx-auto">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to League
      </button>
      <h1 className="text-2xl font-bold mb-2">Snake Draft</h1>
      <p className="text-sm text-gray-500 mb-4">
        {numPicks} picks per player &middot; Each survivor can be drafted up to {maxDrafts} times
      </p>

      {/* Draft Status */}
      {draftState?.status === "not_started" && (
        <div className="border rounded-lg p-4 mb-6 bg-blue-50">
          <p className="mb-3">Ready to start the draft with {players.length} players and {survivors.length} survivors.</p>
          <p className="text-sm text-gray-500 mb-3">
            Snake order: Round 1 goes 1→{players.length}, Round 2 goes {players.length}→1, etc.
          </p>
          <button onClick={startDraft} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700">
            Start Draft
          </button>
        </div>
      )}

      {draftState?.status === "completed" && (
        <div className="border rounded-lg p-4 mb-6 bg-green-50">
          <p className="font-semibold text-green-800">Draft Complete! 🎉</p>
          <p className="text-sm text-gray-600 mt-1">{totalPicksMade} picks made.</p>
          <button onClick={resetDraft} className="mt-2 text-sm text-red-600 underline hover:text-red-800">
            Reset Draft
          </button>
        </div>
      )}

      {draftState?.status === "in_progress" && (
        <div className="border rounded-lg p-4 mb-6 bg-yellow-50">
          <p className="text-sm text-gray-500">
            Round {draftState.current_round} &middot; Pick {totalPicksMade + 1} of {totalPicksNeeded}
          </p>
          <p className="text-lg font-bold mt-1">
            {currentPlayer?.name}&apos;s turn to pick
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={undoLastPick} disabled={draftPicks.length === 0} className="text-sm text-gray-500 hover:text-gray-800 underline disabled:opacity-50">
              Undo Last Pick
            </button>
            <button onClick={resetDraft} className="text-sm text-red-600 underline hover:text-red-800">
              Reset Draft
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side: Draft Board + Available Survivors */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Draft Board */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold mb-2">Draft Board</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-50 text-left">Player</th>
                  {Array.from({ length: numPicks }, (_, i) => (
                    <th key={i} className="border p-2 bg-gray-50 text-center">Pick {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => {
                  const picks = picksForPlayer(player.id);
                  const isCurrentPick = currentPlayerId === player.id && draftState?.status === "in_progress";
                  return (
                    <tr key={player.id} className={isCurrentPick ? "bg-yellow-50" : ""}>
                      <td className="border p-2 font-medium whitespace-nowrap">
                        {player.name}
                        {isCurrentPick && <span className="ml-1">👈</span>}
                      </td>
                      {Array.from({ length: numPicks }, (_, i) => (
                        <td key={i} className="border p-2 text-center text-xs">
                          {picks[i] || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Survivors */}
        {draftState?.status === "in_progress" && !isDraftDone && (
          <div className="lg:w-72 lg:flex-shrink-0">
            <h2 className="font-semibold mb-2">Available Survivors</h2>
            <div className="flex flex-col gap-2 lg:max-h-[70vh] lg:overflow-y-auto">
              {survivors.map((s) => {
                const count = draftCountFor(s.id);
                const remaining = maxDrafts - count;
                let bgClass: string;
                if (remaining <= 0) {
                  bgClass = "bg-red-50 border-red-200 opacity-60 cursor-not-allowed";
                } else if (remaining === 1) {
                  bgClass = "bg-yellow-50 border-yellow-200 hover:bg-yellow-100 cursor-pointer";
                } else if (count === 0) {
                  bgClass = "bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer";
                } else {
                  bgClass = "bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer";
                }
                const available = remaining > 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => available && makePick(s.id)}
                    disabled={!available}
                    className={`border rounded-lg p-2 text-left text-sm transition-colors ${bgClass}`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-400">
                      {s.tribe && `${s.tribe} · `}
                      {count}/{maxDrafts} drafted
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
