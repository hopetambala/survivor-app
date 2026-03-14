"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
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
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to League
      </button>
      <h1 className="text-2xl font-bold mb-4">Players</h1>
      <p className="text-sm text-gray-500 mb-4">Add participants and set their draft order (drag to reorder).</p>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowBulk(false)} className={`text-sm px-3 py-1 rounded ${!showBulk ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
          Add One
        </button>
        <button onClick={() => setShowBulk(true)} className={`text-sm px-3 py-1 rounded ${showBulk ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
          Bulk Add
        </button>
      </div>

      {showBulk ? (
        <form onSubmit={handleBulkAdd} className="mb-6 flex flex-col gap-2">
          <textarea
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            placeholder="One name per line"
            rows={6}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-green-700">
            Add All
          </button>
        </form>
      ) : (
        <form onSubmit={handleAdd} className="mb-6 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            required
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-green-700">
            Add
          </button>
        </form>
      )}

      <div className="text-sm text-gray-500 mb-2">{players.length} players</div>

      <div className="flex flex-col gap-2">
        {players.map((p, idx) => (
          <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-mono text-sm w-6">{idx + 1}.</span>
              <span className="font-medium">{p.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleReorder(p.id, "up")}
                disabled={idx === 0}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-25 px-1"
              >
                ▲
              </button>
              <button
                onClick={() => handleReorder(p.id, "down")}
                disabled={idx === players.length - 1}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-25 px-1"
              >
                ▼
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-sm ml-2">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
