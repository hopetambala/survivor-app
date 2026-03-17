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
    <main className="page page--full">
      <dl-button variant="ghost" size="sm" onClick={() => router.push(`/admin/league/${leagueId}`)}>
        &larr; Back to League
      </dl-button>
      <dl-heading level={1}>Snake Draft</dl-heading>
      <dl-text size="300" color="secondary">
        {numPicks} picks per player &middot; Each survivor can be drafted up to {maxDrafts} times
      </dl-text>

      {/* Draft Status */}
      {draftState?.status === "not_started" && (
        <div className="cl-dlite-card cl-dlite-sem-p-400 cl-dlite-sem-mt-600 cl-dlite-sem-mb-600 status-card--info">
          <dl-text>Ready to start the draft with {players.length} players and {survivors.length} survivors.</dl-text>
          <dl-text size="300" color="secondary">
            Snake order: Round 1 goes 1→{players.length}, Round 2 goes {players.length}→1, etc.
          </dl-text>
          <div className="cl-dlite-sem-mt-300">
            <dl-button variant="primary" size="md" onClick={startDraft}>
              Start Draft
            </dl-button>
          </div>
        </div>
      )}

      {draftState?.status === "completed" && (
        <div className="cl-dlite-card cl-dlite-sem-p-400 cl-dlite-sem-mt-600 cl-dlite-sem-mb-600 status-card--success">
          <dl-text weight="semibold">Draft Complete! 🎉</dl-text>
          <dl-text size="300" color="secondary">{totalPicksMade} picks made.</dl-text>
          <div className="cl-dlite-sem-mt-200">
            <dl-button variant="ghost" size="sm" onClick={resetDraft}>
              Reset Draft
            </dl-button>
          </div>
        </div>
      )}

      {draftState?.status === "in_progress" && (
        <div className="cl-dlite-card cl-dlite-sem-p-400 cl-dlite-sem-mt-600 cl-dlite-sem-mb-600 status-card--warning">
          <dl-text size="300" color="secondary">
            Round {draftState.current_round} &middot; Pick {totalPicksMade + 1} of {totalPicksNeeded}
          </dl-text>
          <dl-text size="400" weight="bold">
            {currentPlayer?.name}&apos;s turn to pick
          </dl-text>
          <div className="cl-dlite-flex cl-dlite-sem-gap-200 cl-dlite-sem-mt-300">
            <dl-button variant="ghost" size="sm" disabled={draftPicks.length === 0 || undefined} onClick={undoLastPick}>
              Undo Last Pick
            </dl-button>
            <dl-button variant="ghost" size="sm" onClick={resetDraft}>
              Reset Draft
            </dl-button>
          </div>
        </div>
      )}

      {/* Side-by-side: Draft Board + Available Survivors */}
      <div className="flex-col-lg-row cl-dlite-sem-gap-600">
        {/* Draft Board */}
        <div className="cl-dlite-flex-1 cl-dlite-min-w-0">
          <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold cl-dlite-sem-mb-200 cl-dlite-block">Draft Board</span>
          <div className="cl-dlite-overflow-x-auto">
            <dl-table>
              <table>
                <thead>
                  <tr>
                    <th className="cl-dlite-text-left">Player</th>
                    {Array.from({ length: numPicks }, (_, i) => (
                      <th key={i} className="cl-dlite-text-center">Pick {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => {
                    const picks = picksForPlayer(player.id);
                    const isCurrentPick = currentPlayerId === player.id && draftState?.status === "in_progress";
                    return (
                      <tr key={player.id} className={isCurrentPick ? "row-highlight" : ""}>
                        <td className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-whitespace-nowrap">
                          {player.name}
                          {isCurrentPick && <span className="cl-dlite-sem-ml-100">👈</span>}
                        </td>
                        {Array.from({ length: numPicks }, (_, i) => (
                          <td key={i} className="cl-dlite-text-center cl-dlite-sem-text-200">
                            {picks[i] || "—"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </dl-table>
          </div>
        </div>

        {/* Available Survivors */}
        {draftState?.status === "in_progress" && !isDraftDone && (
          <div className="lg-w-72">
            <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold cl-dlite-sem-mb-200 cl-dlite-block">Available Survivors</span>
            <div className="cl-dlite-flex cl-dlite-flex-col cl-dlite-sem-gap-200 lg-max-h-70vh">
              {survivors.map((s) => {
                const count = draftCountFor(s.id);
                const remaining = maxDrafts - count;
                let statusClass: string;
                if (remaining <= 0) {
                  statusClass = "draft-pick--taken";
                } else if (remaining === 1) {
                  statusClass = "draft-pick--limited";
                } else if (count === 0) {
                  statusClass = "draft-pick--available";
                } else {
                  statusClass = "draft-pick--drafted";
                }
                const available = remaining > 0;
                return (
                  <dl-card
                    key={s.id}
                    interactive
                    disabled={!available || undefined}
                    className={statusClass}
                    padding="300"
                    onClick={() => available && makePick(s.id)}
                  >
                    <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{s.name}</div>
                    <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">
                      {s.tribe && `${s.tribe} · `}
                      {count}/{maxDrafts} drafted
                    </div>
                  </dl-card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
