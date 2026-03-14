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
    return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Leagues</h1>
        <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-800 underline">
          Sign Out
        </button>
      </div>

      <button
        onClick={() => setShowCreate(!showCreate)}
        className="mb-6 bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 transition-colors"
      >
        + New League
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 border rounded-lg p-4 flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="League name (e.g. Fantasy Survivor)"
            required
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder="Season name (e.g. Season 50 CA)"
            required
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-green-700">
            Create League
          </button>
        </form>
      )}

      {leagues.length === 0 ? (
        <p className="text-gray-500">No leagues yet. Create one to get started.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => router.push(`/admin/league/${league.id}`)}
              className="border rounded-lg p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold">{league.name}</div>
              <div className="text-sm text-gray-500">{league.season_name}</div>
              <div className="text-xs text-gray-400 mt-1">Code: <span className="font-mono font-bold">{league.code}</span></div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
