"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import { getEventValue } from "../../../../../dlite-design-system/wc-helpers";
import { DEFAULT_SCORING_RULES } from "../../../../../lib/scoring";
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

  async function handleResetToDefaults() {
    if (!confirm("This will delete all current rules and restore the default set. Continue?")) return;
    await supabase.from("scoring_rules").delete().eq("league_id", leagueId);
    const rows = DEFAULT_SCORING_RULES.map((r) => ({ ...r, league_id: leagueId }));
    await supabase.from("scoring_rules").insert(rows as Record<string, unknown>[]);
    loadRules();
  }

  return (
    <main className="page page--narrow">
      <dl-button variant="ghost" size="sm" onClick={() => router.push(`/admin/league/${leagueId}`)}>
        &larr; Back to League
      </dl-button>
      <dl-heading level={1}>Scoring Rules</dl-heading>

      <div className="cl-dlite-sem-mb-400">
        <dl-button variant="ghost" size="sm" onClick={handleResetToDefaults}>
          Reset to defaults
        </dl-button>
      </div>

      <dl-stack gap="200">
        {rules.map((rule) => (
          <div key={rule.id} className="cl-dlite-card cl-dlite-sem-p-300">
            <dl-cluster justify="between" gap="300">
              <div className="cl-dlite-flex-1">
                <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-sem-text-300">{rule.event_name}</div>
                {rule.description && <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">{rule.description}</div>}
              </div>
              <div className="cl-dlite-flex cl-dlite-items-center cl-dlite-sem-gap-200">
                <input
                  type="number"
                  step="0.25"
                  defaultValue={rule.points}
                  onBlur={(e) => handleUpdate(rule, "points", parseFloat(e.target.value) || 0)}
                  className="cl-dlite-input cl-dlite-text-center cl-dlite-sem-text-300"
                  style={{ width: "4rem" }}
                />
                <span className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">{rule.is_variable ? "(var)" : "pts"}</span>
                <dl-button variant="danger" size="sm" onClick={() => handleDelete(rule.id)}>✕</dl-button>
              </div>
            </dl-cluster>
          </div>
        ))}
      </dl-stack>

      <form onSubmit={handleAdd} className="cl-dlite-card cl-dlite-sem-p-400 cl-dlite-sem-bg-sunken cl-dlite-sem-mt-600">
        <dl-stack gap="300">
          <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold cl-dlite-sem-text-300">Add Custom Rule</span>
          <dl-input
            placeholder="Event name"
            value={name}
            required
            onInput={(e: any) => setName(getEventValue(e))}
          />
          <dl-cluster gap="200">
            <input
              type="number"
              step="0.25"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Points"
              required
              className="cl-dlite-input cl-dlite-sem-text-300"
              style={{ width: "6rem" }}
            />
            <dl-checkbox checked={isVariable || undefined} onChange={() => setIsVariable(!isVariable)}>
              Variable
            </dl-checkbox>
          </dl-cluster>
          <dl-input
            placeholder="Description (optional)"
            value={description}
            onInput={(e: any) => setDescription(getEventValue(e))}
          />
          <dl-button variant="primary" onClick={handleAdd}>Add Rule</dl-button>
        </dl-stack>
      </form>
    </main>
  );
}
