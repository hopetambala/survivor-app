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
    <main className="page page--narrow">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="btn-back">
        &larr; Back to League
      </button>
      <dl-heading level={1}>Survivors</dl-heading>

      <div className="cl-dlite-flex cl-dlite-sem-gap-200 cl-dlite-sem-mb-400 cl-dlite-sem-mt-400">
        <button onClick={() => setShowBulk(false)} className={`tab ${!showBulk ? "tab--active" : "tab--inactive"}`}>
          Add One
        </button>
        <button onClick={() => setShowBulk(true)} className={`tab ${showBulk ? "tab--active" : "tab--inactive"}`}>
          Bulk Add
        </button>
      </div>

      {showBulk ? (
        <form onSubmit={handleBulkAdd} className="cl-dlite-sem-mb-600">
          <dl-stack gap="200">
            <dl-textarea
              placeholder="One name per line"
              rows={6}
              value={bulkNames}
              onInput={(e: any) => setBulkNames((e.target as any).value ?? "")}
            />
            <dl-button variant="primary" onClick={handleBulkAdd}>Add All</dl-button>
          </dl-stack>
        </form>
      ) : (
        <form onSubmit={handleAdd} className="cl-dlite-sem-mb-600">
          <dl-cluster gap="200">
            <div className="cl-dlite-flex-1">
              <dl-input
                placeholder="Survivor name"
                value={name}
                required
                onInput={(e: any) => setName((e.target as any).value ?? "")}
              />
            </div>
            <div style={{ width: "7rem" }}>
              <dl-input
                placeholder="Tribe"
                value={tribe}
                onInput={(e: any) => setTribe((e.target as any).value ?? "")}
              />
            </div>
            <dl-button variant="primary" onClick={handleAdd}>Add</dl-button>
          </dl-cluster>
        </form>
      )}

      <dl-text size="300" color="secondary">{survivors.length} survivors</dl-text>

      <dl-stack gap="200">
        {survivors.map((s) => (
          <div key={s.id} className="cl-dlite-card cl-dlite-sem-p-300">
            <dl-cluster justify="between" gap="200">
              <div className="cl-dlite-flex-1">
                <span
                  className={`cl-dlite-sem-font-heading ${s.status === "eliminated" ? "cl-dlite-sem-text-tertiary cl-dlite-line-through" : "cl-dlite-prim-font-medium"}`}
                >
                  {s.name}
                </span>
                {s.tribe && <span className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary cl-dlite-sem-ml-200">{s.tribe}</span>}
              </div>
              <dl-cluster gap="200">
                <dl-input
                  placeholder="tribe"
                  value={s.tribe || ""}
                  style={{ width: "5rem", fontSize: "0.75rem" }}
                  onChange={(e: any) => handleTribeUpdate(s.id, (e.target as any).value ?? "")}
                />
                <dl-badge variant={s.status === "active" ? "success" : "danger"}>
                  {s.status}
                </dl-badge>
                <dl-button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>
                  ✕
                </dl-button>
              </dl-cluster>
            </dl-cluster>
          </div>
        ))}
      </dl-stack>
    </main>
  );
}
