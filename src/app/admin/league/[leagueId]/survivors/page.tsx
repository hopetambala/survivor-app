"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import type { Survivor } from "../../../../../lib/supabase/types";

export default function ManageSurvivors() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [name, setName] = useState("");
  const [tribe, setTribe] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadSurvivors(); }, [leagueId]);

  async function loadSurvivors() {
    const { data } = await supabase
      .from("survivors")
      .select("*")
      .eq("league_id", leagueId)
      .order("name");
    setSurvivors(data || []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from("survivors").insert({
      league_id: leagueId,
      name: name.trim(),
      tribe: tribe.trim() || null,
    });
    setName("");
    setTribe("");
    loadSurvivors();
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const names = bulkNames.split("\n").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    const rows = names.map((n) => ({ league_id: leagueId, name: n }));
    await supabase.from("survivors").insert(rows);
    setBulkNames("");
    setShowBulk(false);
    loadSurvivors();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this survivor?")) return;
    await supabase.from("survivors").delete().eq("id", id);
    loadSurvivors();
  }

  async function toggleStatus(survivor: Survivor) {
    const newStatus = survivor.status === "active" ? "eliminated" : "active";
    await supabase.from("survivors").update({
      status: newStatus,
      eliminated_episode: newStatus === "eliminated" ? null : null,
    }).eq("id", survivor.id);
    loadSurvivors();
  }

  async function handleTribeUpdate(id: string, newTribe: string) {
    await supabase.from("survivors").update({ tribe: newTribe || null }).eq("id", id);
    loadSurvivors();
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to League
      </button>
      <h1 className="text-2xl font-bold mb-4">Survivors</h1>

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
            placeholder="Survivor name"
            required
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={tribe}
            onChange={(e) => setTribe(e.target.value)}
            placeholder="Tribe"
            className="w-28 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-green-700">
            Add
          </button>
        </form>
      )}

      <div className="text-sm text-gray-500 mb-2">{survivors.length} survivors</div>

      <div className="flex flex-col gap-2">
        {survivors.map((s) => (
          <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
            <div className="flex-1">
              <span className={s.status === "eliminated" ? "line-through text-gray-400" : "font-medium"}>
                {s.name}
              </span>
              {s.tribe && <span className="text-xs text-gray-400 ml-2">{s.tribe}</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                defaultValue={s.tribe || ""}
                placeholder="tribe"
                onBlur={(e) => handleTribeUpdate(s.id, e.target.value)}
                className="w-20 text-xs border rounded px-2 py-1"
              />
              <button
                onClick={() => toggleStatus(s)}
                className={`text-xs px-2 py-1 rounded ${
                  s.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {s.status}
              </button>
              <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-sm">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
