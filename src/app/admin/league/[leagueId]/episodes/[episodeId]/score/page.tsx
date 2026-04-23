"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../../../lib/supabase/client";
import { useToast } from "../../../../../../../components/AppDialogs";
import type {
  Survivor,
  ScoringRule,
  EpisodeEvent,
  Episode,
} from "../../../../../../../lib/supabase/types";

export default function ScoreEpisode() {
  const { leagueId, episodeId } = useParams<{ leagueId: string; episodeId: string }>();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [events, setEvents] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isFinalEpisode, setIsFinalEpisode] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  // Warn on tab close / hard reload if there are unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const loadData = useCallback(async () => {
    const [epRes, survivorsRes, rulesRes, eventsRes] = await Promise.all([
      supabase.from("episodes").select("*").eq("id", episodeId).single(),
      supabase
        .from("survivors")
        .select("*")
        .eq("league_id", leagueId)
        .eq("status", "active")
        .order("name"),
      supabase.from("scoring_rules").select("*").eq("league_id", leagueId).order("sort_order"),
      supabase.from("episode_events").select("*").eq("episode_id", episodeId),
    ]);

    setEpisode(epRes.data);
    setSurvivors(survivorsRes.data || []);
    setRules(rulesRes.data || []);

    // Build events map: { survivorId: { ruleId: value } }
    const evMap: Record<string, Record<string, number>> = {};
    (eventsRes.data || []).forEach((ev: EpisodeEvent) => {
      const bucket = evMap[ev.survivor_id] ?? (evMap[ev.survivor_id] = {});
      bucket[ev.scoring_rule_id] = ev.value;
    });
    setEvents(evMap);
    setIsDirty(false);
  }, [leagueId, episodeId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getValue(survivorId: string, ruleId: string): number {
    return events[survivorId]?.[ruleId] ?? 0;
  }

  function setValue(survivorId: string, ruleId: string, value: number) {
    setEvents((prev) => ({
      ...prev,
      [survivorId]: {
        ...(prev[survivorId] || {}),
        [ruleId]: value,
      },
    }));
    setIsDirty(true);
  }

  function toggleValue(survivorId: string, ruleId: string) {
    const current = getValue(survivorId, ruleId);
    setValue(survivorId, ruleId, current === 0 ? 1 : 0);
  }

  async function handleSave() {
    setSaving(true);

    const rows: { survivor_id: string; scoring_rule_id: string; value: number }[] = [];
    for (const [survivorId, ruleMap] of Object.entries(events)) {
      for (const [ruleId, val] of Object.entries(ruleMap)) {
        if (val !== 0) {
          rows.push({ survivor_id: survivorId, scoring_rule_id: ruleId, value: val });
        }
      }
    }

    // Atomic server-side replace: delete + insert + flag in one transaction.
    // If anything fails the old scores survive.
    const { error } = await supabase.rpc("score_episode", {
      p_episode_id: episodeId,
      p_events: rows,
    });

    setSaving(false);

    if (error) {
      toast(`Failed to save scores: ${error.message}`, "error");
      return;
    }

    toast("Scores saved.", "success");
    setIsDirty(false);
    router.push(`/admin/league/${leagueId}/episodes`);
  }

  if (!episode) {
    return (
      <main className="page page--centered">
        <dl-spinner size="md"></dl-spinner>
      </main>
    );
  }

  return (
    <main className="page page--full">
      <dl-button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/league/${leagueId}/episodes`)}
      >
        &larr; Back to Episodes
      </dl-button>

      <dl-cluster justify="between" gap="400">
        <div>
          <dl-heading level={1}>Score Episode {episode.episode_number}</dl-heading>
          {episode.title && <dl-text color="secondary">{episode.title}</dl-text>}
        </div>
        <dl-button
          variant="primary"
          size="md"
          disabled={saving || !isDirty || undefined}
          onClick={handleSave}
        >
          {saving ? "Saving…" : isDirty ? "Save Scores" : "Saved"}
        </dl-button>
      </dl-cluster>

      <div className="cl-dlite-flex cl-dlite-items-center cl-dlite-sem-gap-400 cl-dlite-sem-mb-400">
        <dl-text size="300" color="secondary">
          Click cells to toggle events (1 = happened). For variable-point events, enter the number
          directly.
        </dl-text>
        <label className="cl-dlite-flex cl-dlite-items-center cl-dlite-sem-gap-200 cl-dlite-sem-text-300 cl-dlite-whitespace-nowrap">
          <input
            type="checkbox"
            checked={isFinalEpisode}
            onChange={(e) => setIsFinalEpisode(e.target.checked)}
          />
          Final episode?
        </label>
      </div>

      <div className="cl-dlite-overflow-x-auto">
        <table className="cl-dlite-table">
          <thead>
            <tr>
              <th className="sticky-col" style={{ minWidth: "12rem" }}>
                Event
              </th>
              <th className="cl-dlite-text-center" style={{ width: "3rem" }}>
                Pts
              </th>
              {survivors.map((s) => (
                <th key={s.id} className="cl-dlite-text-center" style={{ minWidth: "5rem" }}>
                  <div className="cl-dlite-sem-text-200">{s.name}</div>
                  {s.tribe && (
                    <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">
                      {s.tribe}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules
              .filter((rule) => {
                const finalOnly = [
                  "Made final group",
                  "Vote in final group",
                  "Won Survivor",
                  "Won survivor",
                ];
                if (finalOnly.some((f) => rule.event_name.toLowerCase() === f.toLowerCase())) {
                  return isFinalEpisode;
                }
                return true;
              })
              .map((rule) => (
                <tr key={rule.id}>
                  <td className="sticky-col cl-dlite-sem-text-200">
                    {rule.event_name}
                    {rule.description && (
                      <span
                        className="cl-dlite-sem-text-tertiary cl-dlite-sem-ml-100"
                        title={rule.description}
                      >
                        ⓘ
                      </span>
                    )}
                  </td>
                  <td className="cl-dlite-text-center cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">
                    {rule.is_variable ? "var" : rule.points}
                  </td>
                  {survivors.map((s) => {
                    const val = getValue(s.id, rule.id);
                    const cellLabel = `${rule.event_name} for ${s.name}`;
                    return (
                      <td key={s.id} className="cl-dlite-text-center">
                        {rule.is_variable ? (
                          <input
                            type="number"
                            step="0.5"
                            value={val || ""}
                            aria-label={cellLabel}
                            onChange={(e) =>
                              setValue(s.id, rule.id, parseFloat(e.target.value) || 0)
                            }
                            className="cl-dlite-input cl-dlite-text-center cl-dlite-sem-text-300"
                            style={{ width: "3rem" }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleValue(s.id, rule.id)}
                            aria-label={cellLabel}
                            aria-pressed={val > 0}
                            className={`score-toggle ${val > 0 ? "score-toggle--on" : "score-toggle--off"}`}
                          >
                            {val > 0 ? "✓" : "·"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            {/* Totals row */}
            <tr className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">
              <td className="sticky-col cl-dlite-sem-bg-sunken">Total</td>
              <td className="cl-dlite-sem-bg-sunken"></td>
              {survivors.map((s) => {
                const total = rules.reduce((sum, rule) => {
                  const val = getValue(s.id, rule.id);
                  if (rule.is_variable) return sum + val;
                  return sum + (val > 0 ? rule.points : 0);
                }, 0);
                return (
                  <td
                    key={s.id}
                    className="cl-dlite-text-center cl-dlite-sem-text-300 cl-dlite-sem-bg-sunken"
                  >
                    {total !== 0 ? total : "—"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
