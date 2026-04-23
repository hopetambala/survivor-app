"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { getSnakeDraftCurrentPlayer } from "../../../../../lib/scoring";
import { useToast, useConfirm } from "../../../../../components/AppDialogs";
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
  const toast = useToast();
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    const [playersRes, survivorsRes, draftStateRes, picksRes, leagueRes] = await Promise.all([
      supabase.from("players").select("*").eq("league_id", leagueId).order("draft_order"),
      supabase.from("survivors").select("*").eq("league_id", leagueId).order("name"),
      supabase.from("draft_state").select("*").eq("league_id", leagueId).single(),
      supabase.from("draft_picks").select("*").eq("league_id", leagueId).order("pick_number"),
      supabase
        .from("leagues")
        .select("num_picks_per_player, max_times_drafted")
        .eq("id", leagueId)
        .single(),
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    ? getSnakeDraftCurrentPlayer(
        draftState.draft_order,
        draftState.current_round,
        draftState.current_pick_index
      )
    : null;
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const totalPicksMade = draftPicks.length;
  const totalPicksNeeded = players.length * numPicks;
  const isDraftDone = totalPicksMade >= totalPicksNeeded;

  // Supabase returns the serialization_failure code (40001) when the
  // optimistic-version check inside a draft RPC fails. Treat that as "another
  // admin moved first — reload and let the user retry."
  function isVersionConflict(error: { code?: string } | null): boolean {
    return error?.code === "40001";
  }

  async function handleDraftError(label: string, error: { code?: string; message: string } | null) {
    if (!error) return;
    if (isVersionConflict(error)) {
      toast("The draft was just updated by someone else. Reloading…", "warning");
    } else {
      toast(`${label}: ${error.message}`, "error");
    }
    await loadData();
  }

  async function startDraft() {
    if (players.length < 2) {
      toast("Need at least 2 players to start a draft.", "warning");
      return;
    }
    if (survivors.length < 2) {
      toast("Need at least 2 survivors to start a draft.", "warning");
      return;
    }
    const { error } = await supabase.rpc("start_draft", {
      p_league_id: leagueId,
      p_draft_order: players.map((p) => p.id),
    });
    if (error) {
      await handleDraftError("Failed to start draft", error);
      return;
    }
    await loadData();
  }

  async function makePick(survivorId: string) {
    if (!draftState || !currentPlayerId) return;

    const { error } = await supabase.rpc("make_draft_pick", {
      p_league_id: leagueId,
      p_player_id: currentPlayerId,
      p_survivor_id: survivorId,
      p_expected_version: draftState.version,
    });

    if (error) {
      await handleDraftError("Failed to make pick", error);
      return;
    }
    await loadData();
  }

  async function undoLastPick() {
    if (draftPicks.length === 0 || !draftState) return;
    const ok = await confirm({
      title: "Undo the last pick?",
      message: "This will remove the most recent selection and rewind the draft one step.",
      confirmLabel: "Undo",
    });
    if (!ok) return;

    const { error } = await supabase.rpc("undo_last_draft_pick", {
      p_league_id: leagueId,
      p_expected_version: draftState.version,
    });
    if (error) {
      await handleDraftError("Failed to undo pick", error);
      return;
    }
    await loadData();
  }

  async function resetDraft() {
    const ok = await confirm({
      title: "Reset the entire draft?",
      message: "All picks will be deleted. This cannot be undone.",
      confirmLabel: "Reset draft",
      variant: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.rpc("reset_draft", { p_league_id: leagueId });
    if (error) {
      await handleDraftError("Failed to reset draft", error);
      return;
    }
    await loadData();
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
          <dl-text>
            Ready to start the draft with {players.length} players and {survivors.length} survivors.
          </dl-text>
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
          <dl-text size="300" color="secondary">
            {totalPicksMade} picks made.
          </dl-text>
          <div className="cl-dlite-sem-mt-200">
            <dl-button variant="ghost" size="sm" onClick={resetDraft}>
              Reset Draft
            </dl-button>
          </div>
        </div>
      )}

      {draftState?.status === "in_progress" && (
        <div className="cl-dlite-card cl-dlite-sem-p-400 cl-dlite-sem-mt-600 cl-dlite-sem-mb-600 status-card--warning draft-status-sticky">
          <dl-text size="300" color="secondary">
            Round {draftState.current_round} &middot; Pick {totalPicksMade + 1} of{" "}
            {totalPicksNeeded}
          </dl-text>
          <dl-text size="400" weight="bold">
            {currentPlayer?.name}&apos;s turn to pick
          </dl-text>
          <div className="cl-dlite-flex cl-dlite-sem-gap-200 cl-dlite-sem-mt-300">
            <dl-button
              variant="ghost"
              size="sm"
              disabled={draftPicks.length === 0 || undefined}
              onClick={undoLastPick}
            >
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
          <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold cl-dlite-sem-mb-200 cl-dlite-block">
            Draft Board
          </span>
          <div className="cl-dlite-overflow-x-auto">
            <dl-table>
              <table>
                <thead>
                  <tr>
                    <th className="cl-dlite-text-left">Player</th>
                    {Array.from({ length: numPicks }, (_, i) => (
                      <th key={i} className="cl-dlite-text-center">
                        Pick {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => {
                    const picks = picksForPlayer(player.id);
                    const isCurrentPick =
                      currentPlayerId === player.id && draftState?.status === "in_progress";
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
            <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold cl-dlite-sem-mb-200 cl-dlite-block">
              Available Survivors
            </span>
            <div className="cl-dlite-flex cl-dlite-flex-col cl-dlite-sem-gap-200 lg-max-h-70vh">
              {survivors.map((s) => {
                const count = draftCountFor(s.id);
                const remaining = maxDrafts - count;
                let statusClass: string;
                let statusLabel: string;
                if (remaining <= 0) {
                  statusClass = "draft-pick--taken";
                  statusLabel = "unavailable";
                } else if (remaining === 1) {
                  statusClass = "draft-pick--limited";
                  statusLabel = "one slot left";
                } else if (count === 0) {
                  statusClass = "draft-pick--available";
                  statusLabel = "available";
                } else {
                  statusClass = "draft-pick--drafted";
                  statusLabel = "partially drafted";
                }
                const available = remaining > 0;
                return (
                  <dl-card
                    key={s.id}
                    interactive
                    disabled={!available || undefined}
                    className={statusClass}
                    padding="300"
                    role="button"
                    tabIndex={available ? 0 : -1}
                    aria-label={`${s.name}${s.tribe ? `, ${s.tribe}` : ""}: ${statusLabel}, ${count} of ${maxDrafts} drafted`}
                    aria-disabled={!available || undefined}
                    onClick={() => available && makePick(s.id)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (!available) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        makePick(s.id);
                      }
                    }}
                  >
                    <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">
                      {s.name}
                    </div>
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
