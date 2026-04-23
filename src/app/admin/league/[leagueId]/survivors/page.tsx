"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { getEventValue } from "../../../../../dlite-design-system/wc-helpers";
import { useConfirm } from "../../../../../components/AppDialogs";
import EmptyState from "../../../../../components/EmptyState";
import type { Survivor } from "../../../../../lib/supabase/types";

export default function ManageSurvivors() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [name, setName] = useState("");
  const [tribe, setTribe] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const confirm = useConfirm();

  useEffect(() => {
    loadSurvivors();
  }, [leagueId]);

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
    setSubmitting(true);
    await supabase.from("survivors").insert({
      league_id: leagueId,
      name: name.trim(),
      tribe: tribe.trim() || null,
    });
    setName("");
    setTribe("");
    setSubmitting(false);
    loadSurvivors();
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setSubmitting(true);
    const rows = names.map((n) => ({ league_id: leagueId, name: n }));
    await supabase.from("survivors").insert(rows);
    setBulkNames("");
    setShowBulk(false);
    setSubmitting(false);
    loadSurvivors();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Remove this survivor?",
      message: "All draft picks and episode events for this survivor will be deleted.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    await supabase.from("survivors").delete().eq("id", id);
    loadSurvivors();
  }

  async function toggleStatus(survivor: Survivor) {
    const newStatus = survivor.status === "active" ? "eliminated" : "active";

    // Auto-populate eliminated_episode with the latest numbered episode in this
    // league. If there are no episodes yet, leave it null — the column is just
    // for display ("Ep 5" badge on the public survivors view) so an empty
    // value degrades gracefully. Cleared on un-elimination.
    let eliminatedEpisode: number | null = null;
    if (newStatus === "eliminated") {
      const { data: latestEp } = await supabase
        .from("episodes")
        .select("episode_number")
        .eq("league_id", leagueId)
        .order("episode_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      eliminatedEpisode = latestEp?.episode_number ?? null;
    }

    await supabase
      .from("survivors")
      .update({
        status: newStatus,
        eliminated_episode: eliminatedEpisode,
      })
      .eq("id", survivor.id);
    loadSurvivors();
  }

  async function handleTribeUpdate(id: string, newTribe: string) {
    await supabase
      .from("survivors")
      .update({ tribe: newTribe || null })
      .eq("id", id);
    loadSurvivors();
  }

  return (
    <main className="page page--narrow">
      <dl-button variant="ghost" size="sm" onClick={() => router.push(`/admin/league/${leagueId}`)}>
        &larr; Back to League
      </dl-button>
      <dl-heading level={1}>Survivors</dl-heading>

      <div className="cl-dlite-sem-mb-400 cl-dlite-sem-mt-400">
        <dl-tabs
          value={showBulk ? "bulk" : "one"}
          onChange={(e: any) => setShowBulk(e.detail.value === "bulk")}
        >
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
            <dl-button
              variant="primary"
              size="md"
              disabled={submitting || undefined}
              onClick={handleBulkAdd}
            >
              {submitting ? "Adding…" : "Add All"}
            </dl-button>
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
                onInput={(e: any) => setName(getEventValue(e))}
              />
            </div>
            <div style={{ width: "7rem" }}>
              <dl-input
                placeholder="Tribe"
                value={tribe}
                onInput={(e: any) => setTribe(getEventValue(e))}
              />
            </div>
            <dl-button
              variant="primary"
              size="md"
              disabled={submitting || undefined}
              onClick={handleAdd}
            >
              {submitting ? "Adding…" : "Add"}
            </dl-button>
          </dl-cluster>
        </form>
      )}

      <dl-text size="300" color="secondary">
        {survivors.length} survivors
      </dl-text>

      {survivors.length === 0 ? (
        <div className="cl-dlite-sem-mt-400">
          <EmptyState
            title="No survivors yet"
            message="Add the show's contestants so players can draft them."
          />
        </div>
      ) : null}

      <dl-stack direction="vertical" gap="200">
        {survivors.map((s) => (
          <div key={s.id} className="cl-dlite-card cl-dlite-sem-p-300">
            <dl-cluster justify="between" gap="200">
              <div className="cl-dlite-flex-1">
                <span
                  className={`cl-dlite-sem-font-heading ${s.status === "eliminated" ? "cl-dlite-sem-text-tertiary cl-dlite-line-through" : "cl-dlite-prim-font-medium"}`}
                >
                  {s.name}
                </span>
                {s.tribe && (
                  <span className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary cl-dlite-sem-ml-200">
                    {s.tribe}
                  </span>
                )}
              </div>
              <dl-cluster gap="200">
                <dl-input
                  placeholder="tribe"
                  value={s.tribe || ""}
                  style={{ width: "5rem", fontSize: "0.75rem" }}
                  onBlur={(e: any) => handleTribeUpdate(s.id, getEventValue(e))}
                />
                <dl-button
                  variant={s.status === "active" ? "secondary" : "danger"}
                  size="sm"
                  onClick={() => toggleStatus(s)}
                >
                  <dl-badge variant={s.status === "active" ? "success" : "danger"}>
                    {s.status}
                  </dl-badge>
                </dl-button>
                <dl-icon-button
                  variant="secondary"
                  size="sm"
                  label="Delete survivor"
                  onClick={() => handleDelete(s.id)}
                >
                  ✕
                </dl-icon-button>
              </dl-cluster>
            </dl-cluster>
          </div>
        ))}
      </dl-stack>
    </main>
  );
}
