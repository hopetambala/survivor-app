"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { generateLeagueCode, DEFAULT_SCORING_RULES } from "../../../lib/scoring";
import type { League } from "../../../lib/supabase/types";

export default function AdminDashboard() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin");
      return;
    }
    const { data } = await supabase
      .from("leagues")
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });
    setLeagues((data as League[]) || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = generateLeagueCode();
    const { data: leagueRaw, error } = await supabase
      .from("leagues")
      .insert({ admin_id: user.id, name, season_name: seasonName, code } as Record<string, unknown>)
      .select()
      .single();

    const league = leagueRaw as League | null;
    if (error || !league) {
      alert("Failed to create league: " + (error?.message || "Unknown error"));
      return;
    }

    // Insert default scoring rules
    const rules = DEFAULT_SCORING_RULES.map((r) => ({
      ...r,
      league_id: league.id,
    }));
    await supabase.from("scoring_rules").insert(rules as Record<string, unknown>[]);

    // Create draft state
    await supabase.from("draft_state").insert({
      league_id: league.id,
      status: "not_started",
      draft_order: [],
    } as Record<string, unknown>);

    setName("");
    setSeasonName("");
    setShowCreate(false);
    checkAuthAndLoad();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return <main className="page page--centered"><p>Loading...</p></main>;
  }

  return (
    <main className="page page--narrow">
      <dl-cluster justify="between" gap="400">
        <dl-heading level={1}>My Leagues</dl-heading>
        <button onClick={handleSignOut} className="btn-link cl-dlite-sem-text-200">
          Sign Out
        </button>
      </dl-cluster>

      <div className="cl-dlite-sem-mt-600 cl-dlite-sem-mb-600">
        <dl-button variant="primary" onClick={() => setShowCreate(!showCreate)}>
          + New League
        </dl-button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="cl-dlite-sem-mb-600">
          <dl-card>
            <dl-stack gap="300">
              <dl-input
                placeholder="League name (e.g. Fantasy Survivor)"
                value={name}
                required
                onInput={(e: any) => setName((e.target as any).value ?? "")}
              />
              <dl-input
                placeholder="Season name (e.g. Season 50 CA)"
                value={seasonName}
                required
                onInput={(e: any) => setSeasonName((e.target as any).value ?? "")}
              />
              <dl-button variant="primary" onClick={handleCreate}>Create League</dl-button>
            </dl-stack>
          </dl-card>
        </form>
      )}

      {leagues.length === 0 ? (
        <dl-text color="secondary">No leagues yet. Create one to get started.</dl-text>
      ) : (
        <dl-stack gap="300">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => router.push(`/admin/league/${league.id}`)}
              className="cl-dlite-card cl-dlite-text-left cl-dlite-cursor-pointer cl-dlite-sem-transition-colors"
              style={{ display: "block", width: "100%" }}
            >
              <div className="cl-dlite-sem-font-heading cl-dlite-sem-text-400 cl-dlite-prim-font-semibold">{league.name}</div>
              <dl-text size="300" color="secondary">{league.season_name}</dl-text>
              <dl-text size="200" color="tertiary">
                Code: <span className="cl-dlite-sem-font-mono cl-dlite-prim-font-bold">{league.code}</span>
              </dl-text>
            </button>
          ))}
        </dl-stack>
      )}
    </main>
  );
}
