"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import type { ScoringRule } from "../../../../../lib/supabase/types";

export default function ScoringRulesPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [name, setName] = useState("");
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [isVariable, setIsVariable] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadRules(); }, [leagueId]);

  async function loadRules() {
    const { data } = await supabase
      .from("scoring_rules")
      .select("*")
      .eq("league_id", leagueId)
      .order("sort_order");
    setRules(data || []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const maxOrder = rules.length > 0 ? Math.max(...rules.map((r) => r.sort_order)) : 0;
    await supabase.from("scoring_rules").insert({
      league_id: leagueId,
      event_name: name.trim(),
      points: parseFloat(points) || 0,
      description: description.trim() || null,
      is_variable: isVariable,
      sort_order: maxOrder + 1,
    });
    setName("");
    setPoints("");
    setDescription("");
    setIsVariable(false);
    loadRules();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this scoring rule?")) return;
    await supabase.from("scoring_rules").delete().eq("id", id);
    loadRules();
  }

  async function handleUpdate(rule: ScoringRule, field: string, value: string | number | boolean) {
    await supabase.from("scoring_rules").update({ [field]: value }).eq("id", rule.id);
    loadRules();
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to League
      </button>
      <h1 className="text-2xl font-bold mb-4">Scoring Rules</h1>

      <div className="flex flex-col gap-2 mb-6">
        {rules.map((rule) => (
          <div key={rule.id} className="border rounded-lg p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium text-sm">{rule.event_name}</div>
              {rule.description && <div className="text-xs text-gray-400">{rule.description}</div>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                step="0.25"
                defaultValue={rule.points}
                onBlur={(e) => handleUpdate(rule, "points", parseFloat(e.target.value) || 0)}
                className="w-16 text-center border rounded px-2 py-1 text-sm"
              />
              <span className="text-xs text-gray-400">{rule.is_variable ? "(var)" : "pts"}</span>
              <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700">✕</button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="border rounded-lg p-4 flex flex-col gap-3 bg-gray-50">
        <h3 className="font-semibold text-sm">Add Custom Rule</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          required
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.25"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Points"
            required
            className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={isVariable} onChange={(e) => setIsVariable(e.target.checked)} />
            Variable
          </label>
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium text-sm hover:bg-green-700">
          Add Rule
        </button>
      </form>
    </main>
  );
}
