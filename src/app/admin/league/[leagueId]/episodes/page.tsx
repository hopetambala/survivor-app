"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import type { Episode } from "../../../../../lib/supabase/types";

export default function ManageEpisodes() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [title, setTitle] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadEpisodes(); }, [leagueId]);

  async function loadEpisodes() {
    const { data } = await supabase
      .from("episodes")
      .select("*")
      .eq("league_id", leagueId)
      .order("episode_number");
    setEpisodes(data || []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const nextEp = episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number)) + 1 : 1;
    await supabase.from("episodes").insert({
      league_id: leagueId,
      episode_number: nextEp,
      title: title.trim() || null,
    });
    setTitle("");
    loadEpisodes();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this episode and all its scores?")) return;
    await supabase.from("episodes").delete().eq("id", id);
    loadEpisodes();
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to League
      </button>
      <h1 className="text-2xl font-bold mb-4">Episodes</h1>

      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Episode title (optional)"
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-green-700">
          + Add Episode
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {episodes.map((ep) => (
          <div key={ep.id} className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">Episode {ep.episode_number}</span>
                {ep.title && <span className="text-gray-500 ml-2">{ep.title}</span>}
                {ep.is_scored && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">scored</span>}
              </div>
              <button onClick={() => handleDelete(ep.id)} className="text-red-500 hover:text-red-700 text-sm">
                ✕
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => router.push(`/admin/league/${leagueId}/episodes/${ep.id}/score`)}
                className="text-sm bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700"
              >
                {ep.is_scored ? "Edit Scores" : "Score Episode"}
              </button>
              <button
                onClick={() => router.push(`/admin/league/${leagueId}/episodes/${ep.id}/attendance`)}
                className="text-sm bg-gray-200 text-gray-800 rounded px-3 py-1 hover:bg-gray-300"
              >
                Attendance
              </button>
            </div>
          </div>
        ))}
        {episodes.length === 0 && <p className="text-gray-500">No episodes yet.</p>}
      </div>
    </main>
  );
}
