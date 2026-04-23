"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { generateLeagueCode, DEFAULT_SCORING_RULES } from "../../../lib/scoring";
import { getEventValue } from "../../../dlite-design-system/wc-helpers";
import { useToast } from "../../../components/AppDialogs";
import EmptyState from "../../../components/EmptyState";
import type { League } from "../../../lib/supabase/types";

// Interactive island for the dashboard: create-league form + clickable
// league cards. The server component supplies the initial list.
export default function DashboardView({ initialLeagues }: { initialLeagues: League[] }) {
  const [leagues, setLeagues] = useState<League[]>(initialLeagues);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const code = generateLeagueCode();
    const { data: leagueRaw, error } = await supabase
      .from("leagues")
      .insert({ admin_id: user.id, name, season_name: seasonName, code } as Record<string, unknown>)
      .select()
      .single();

    const league = leagueRaw as League | null;
    if (error || !league) {
      setCreating(false);
      toast("Failed to create league: " + (error?.message || "Unknown error"), "error");
      return;
    }

    const rules = DEFAULT_SCORING_RULES.map((r) => ({ ...r, league_id: league.id }));
    await supabase.from("scoring_rules").insert(rules as Record<string, unknown>[]);
    await supabase.from("draft_state").insert({
      league_id: league.id,
      status: "not_started",
      draft_order: [],
    } as Record<string, unknown>);

    setLeagues((prev) => [league, ...prev]);
    setName("");
    setSeasonName("");
    setShowCreate(false);
    setCreating(false);
    toast(`League created. Share code ${league.code} with participants.`, "success");
    // Keep the server's leagues list in sync for subsequent navigations.
    router.refresh();
  }

  return (
    <main className="page page--narrow">
      <dl-heading level={1}>My Leagues</dl-heading>

      <div className="cl-dlite-sem-mt-600 cl-dlite-sem-mb-600">
        <dl-button variant="primary" size="md" onClick={() => setShowCreate(!showCreate)}>
          + New League
        </dl-button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="cl-dlite-sem-mb-600">
          <dl-card>
            <dl-stack direction="vertical" gap="300">
              <dl-input
                placeholder="League name (e.g. Fantasy Survivor)"
                value={name}
                required
                onInput={(e: any) => setName(getEventValue(e))}
              />
              <dl-input
                placeholder="Season name (e.g. Season 50 CA)"
                value={seasonName}
                required
                onInput={(e: any) => setSeasonName(getEventValue(e))}
              />
              <dl-button
                variant="primary"
                size="md"
                disabled={creating || undefined}
                onClick={handleCreate}
              >
                {creating ? "Creating…" : "Create League"}
              </dl-button>
            </dl-stack>
          </dl-card>
        </form>
      )}

      {leagues.length === 0 ? (
        <EmptyState
          title="No leagues yet"
          message="Create your first league to add survivors, players, and scoring rules."
          action={
            <dl-button variant="primary" size="md" onClick={() => setShowCreate(true)}>
              + New League
            </dl-button>
          }
        />
      ) : (
        <dl-stack direction="vertical" gap="300">
          {leagues.map((league) => (
            <dl-card
              key={league.id}
              interactive
              onClick={() => router.push(`/admin/league/${league.id}`)}
            >
              <div className="cl-dlite-sem-font-heading cl-dlite-sem-text-400 cl-dlite-prim-font-semibold">
                {league.name}
              </div>
              <dl-text size="300" color="secondary">
                {league.season_name}
              </dl-text>
              <dl-text size="200" color="tertiary">
                Code:{" "}
                <span className="cl-dlite-sem-font-mono cl-dlite-prim-font-bold">
                  {league.code}
                </span>
              </dl-text>
            </dl-card>
          ))}
        </dl-stack>
      )}
    </main>
  );
}
