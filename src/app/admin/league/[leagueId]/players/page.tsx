"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { getEventValue } from "../../../../../dlite-design-system/wc-helpers";
import type { Player } from "../../../../../lib/supabase/types";

export default function ManagePlayers() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadPlayers(); }, [leagueId]);

  async function loadPlayers() {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("league_id", leagueId)
      .order("draft_order", { ascending: true, nullsFirst: false });
    setPlayers(data || []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const nextOrder = players.length + 1;
    await supabase.from("players").insert({
      league_id: leagueId,
      name: name.trim(),
      draft_order: nextOrder,
    });
    setName("");
    loadPlayers();
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const names = bulkNames.split("\n").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    const startOrder = players.length + 1;
    const rows = names.map((n, i) => ({
      league_id: leagueId,
      name: n,
      draft_order: startOrder + i,
    }));
    await supabase.from("players").insert(rows);
    setBulkNames("");
    setShowBulk(false);
    loadPlayers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this player?")) return;
    await supabase.from("players").delete().eq("id", id);
    loadPlayers();
  }

  async function handleReorder(playerId: string, direction: "up" | "down") {
    const idx = players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= players.length) return;

    const a = players[idx];
    const b = players[swapIdx];
    await Promise.all([
      supabase.from("players").update({ draft_order: b.draft_order }).eq("id", a.id),
      supabase.from("players").update({ draft_order: a.draft_order }).eq("id", b.id),
    ]);
    loadPlayers();
  }

  return (
    <main className="page page--narrow">
      <dl-button variant="ghost" size="sm" onClick={() => router.push(`/admin/league/${leagueId}`)}>
        &larr; Back to League
      </dl-button>
      <dl-heading level={1}>Players</dl-heading>
      <dl-text size="300" color="secondary">Add participants and set their draft order (drag to reorder).</dl-text>

      <div className="cl-dlite-sem-mb-400 cl-dlite-sem-mt-400">
        <dl-tabs value={showBulk ? "bulk" : "one"} onChange={(e: any) => setShowBulk(e.detail.value === "bulk")}>
          <dl-tab label="Add One" value="one"></dl-tab>
          <dl-tab label="Bulk Add" value="bulk"></dl-tab>
        </dl-tabs>
      </div>

      {showBulk ? (
        <form onSubmit={handleBulkAdd} className="cl-dlite-sem-mb-600">
          <dl-stack direction="vertical" gap="200">
            <dl-textarea
              placeholder="One name per line"
              rows={6}
              value={bulkNames}
              onInput={(e: any) => setBulkNames(getEventValue(e))}
            />
            <dl-button variant="primary" size="md" onClick={handleBulkAdd}>Add All</dl-button>
          </dl-stack>
        </form>
      ) : (
        <form onSubmit={handleAdd} className="cl-dlite-sem-mb-600">
          <dl-cluster gap="200">
            <div className="cl-dlite-flex-1">
              <dl-input
                placeholder="Player name"
                value={name}
                required
                onInput={(e: any) => setName(getEventValue(e))}
              />
            </div>
            <dl-button variant="primary" size="md" onClick={handleAdd}>Add</dl-button>
          </dl-cluster>
        </form>
      )}

      <dl-text size="300" color="secondary">{players.length} players</dl-text>

      <dl-stack direction="vertical" gap="200">
        {players.map((p, idx) => (
          <div key={p.id} className="cl-dlite-card cl-dlite-sem-p-300">
            <dl-cluster justify="between" gap="200">
              <dl-cluster gap="300">
                <span className="cl-dlite-sem-font-mono cl-dlite-sem-text-300 cl-dlite-sem-text-tertiary" style={{ width: "1.5rem" }}>{idx + 1}.</span>
                <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{p.name}</span>
              </dl-cluster>
              <dl-cluster gap="100">
                <dl-icon-button
                  variant="ghost"
                  size="sm"
                  label="Move up"
                  disabled={idx === 0 || undefined}
                  onClick={() => handleReorder(p.id, "up")}
                >
                  ▲
                </dl-icon-button>
                <dl-icon-button
                  variant="ghost"
                  size="sm"
                  label="Move down"
                  disabled={idx === players.length - 1 || undefined}
                  onClick={() => handleReorder(p.id, "down")}
                >
                  ▼
                </dl-icon-button>
                <dl-icon-button variant="secondary" size="sm" label="Delete player" onClick={() => handleDelete(p.id)}>✕</dl-icon-button>
              </dl-cluster>
            </dl-cluster>
          </div>
        ))}
      </dl-stack>
    </main>
  );
}
