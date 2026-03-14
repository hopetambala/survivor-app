"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../../../lib/supabase/client";
import type { Survivor, ScoringRule, EpisodeEvent, Episode } from "../../../../../../../lib/supabase/types";

export default function ScoreEpisode() {
  const { leagueId, episodeId } = useParams<{ leagueId: string; episodeId: string }>();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [events, setEvents] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const [epRes, survivorsRes, rulesRes, eventsRes] = await Promise.all([
      supabase.from("episodes").select("*").eq("id", episodeId).single(),
      supabase.from("survivors").select("*").eq("league_id", leagueId).eq("status", "active").order("name"),
      supabase.from("scoring_rules").select("*").eq("league_id", leagueId).order("sort_order"),
      supabase.from("episode_events").select("*").eq("episode_id", episodeId),
    ]);

    setEpisode(epRes.data);
    setSurvivors(survivorsRes.data || []);
    setRules(rulesRes.data || []);

    // Build events map: { survivorId: { ruleId: value } }
    const evMap: Record<string, Record<string, number>> = {};
    (eventsRes.data || []).forEach((ev: EpisodeEvent) => {
      if (!evMap[ev.survivor_id]) evMap[ev.survivor_id] = {};
      evMap[ev.survivor_id][ev.scoring_rule_id] = ev.value;
    });
    setEvents(evMap);
  }, [leagueId, episodeId, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

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
  }

  function toggleValue(survivorId: string, ruleId: string) {
    const current = getValue(survivorId, ruleId);
    setValue(survivorId, ruleId, current === 0 ? 1 : 0);
  }

  async function handleSave() {
    setSaving(true);

    // Delete existing events for this episode
    await supabase.from("episode_events").delete().eq("episode_id", episodeId);

    // Insert all non-zero events
    const rows: { episode_id: string; survivor_id: string; scoring_rule_id: string; value: number }[] = [];
    for (const survivorId of Object.keys(events)) {
      for (const ruleId of Object.keys(events[survivorId])) {
        const val = events[survivorId][ruleId];
        if (val !== 0) {
          rows.push({ episode_id: episodeId, survivor_id: survivorId, scoring_rule_id: ruleId, value: val });
        }
      }
    }

    if (rows.length > 0) {
      await supabase.from("episode_events").insert(rows);
    }

    // Mark episode as scored
    await supabase.from("episodes").update({ is_scored: true }).eq("id", episodeId);

    setSaving(false);
    router.push(`/admin/league/${leagueId}/episodes`);
  }

  if (!episode) {
    return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;
  }

  return (
    <main className="min-h-screen p-4 max-w-full mx-auto">
      <button
        onClick={() => router.push(`/admin/league/${leagueId}/episodes`)}
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
      >
        &larr; Back to Episodes
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Score Episode {episode.episode_number}</h1>
          {episode.title && <p className="text-gray-500">{episode.title}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white rounded-lg px-6 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Scores"}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Click cells to toggle events (1 = happened). For variable-point events (like idol saves), enter the number directly.
      </p>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse min-w-full">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50 text-left sticky left-0 z-10 min-w-48">Event</th>
              <th className="border p-2 bg-gray-50 text-center w-12">Pts</th>
              {survivors.map((s) => (
                <th key={s.id} className="border p-2 bg-gray-50 text-center min-w-20">
                  <div className="text-xs">{s.name}</div>
                  {s.tribe && <div className="text-xs text-gray-400">{s.tribe}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="border p-2 bg-white sticky left-0 z-10 text-xs">
                  {rule.event_name}
                  {rule.description && (
                    <span className="text-gray-400 ml-1" title={rule.description}>ⓘ</span>
                  )}
                </td>
                <td className="border p-2 text-center text-xs text-gray-500">
                  {rule.is_variable ? "var" : rule.points}
                </td>
                {survivors.map((s) => {
                  const val = getValue(s.id, rule.id);
                  return (
                    <td key={s.id} className="border p-1 text-center">
                      {rule.is_variable ? (
                        <input
                          type="number"
                          step="0.5"
                          value={val || ""}
                          onChange={(e) => setValue(s.id, rule.id, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center text-sm border rounded px-1 py-0.5"
                        />
                      ) : (
                        <button
                          onClick={() => toggleValue(s.id, rule.id)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                            val > 0
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
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
            <tr className="font-semibold bg-gray-50">
              <td className="border p-2 sticky left-0 z-10 bg-gray-50">Total</td>
              <td className="border p-2"></td>
              {survivors.map((s) => {
                const total = rules.reduce((sum, rule) => {
                  const val = getValue(s.id, rule.id);
                  if (rule.is_variable) return sum + val;
                  return sum + (val > 0 ? rule.points : 0);
                }, 0);
                return (
                  <td key={s.id} className="border p-2 text-center text-sm">
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
