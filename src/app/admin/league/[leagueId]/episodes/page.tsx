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
    <main className="page page--narrow">
      <button onClick={() => router.push(`/admin/league/${leagueId}`)} className="btn-back">
        &larr; Back to League
      </button>
      <dl-heading level={1}>Episodes</dl-heading>

      <form onSubmit={handleAdd} className="cl-dlite-sem-mb-600">
        <dl-cluster gap="200">
          <div className="cl-dlite-flex-1">
            <dl-input
              placeholder="Episode title (optional)"
              value={title}
              onInput={(e: any) => setTitle((e.target as any).value ?? "")}
            />
          </div>
          <dl-button variant="primary" onClick={handleAdd}>+ Add Episode</dl-button>
        </dl-cluster>
      </form>

      <dl-stack gap="200">
        {episodes.map((ep) => (
          <div key={ep.id} className="cl-dlite-card cl-dlite-sem-p-300">
            <dl-cluster justify="between" gap="200">
              <div>
                <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">Episode {ep.episode_number}</span>
                {ep.title && <span className="cl-dlite-sem-text-secondary cl-dlite-sem-ml-200">{ep.title}</span>}
                {ep.is_scored && <dl-badge variant="success">scored</dl-badge>}
              </div>
              <dl-button variant="danger" size="sm" onClick={() => handleDelete(ep.id)}>✕</dl-button>
            </dl-cluster>
            <div className="cl-dlite-sem-mt-200">
              <dl-cluster gap="200">
                <dl-button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/admin/league/${leagueId}/episodes/${ep.id}/score`)}
                >
                  {ep.is_scored ? "Edit Scores" : "Score Episode"}
                </dl-button>
                <dl-button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/admin/league/${leagueId}/episodes/${ep.id}/attendance`)}
                >
                  Attendance
                </dl-button>
              </dl-cluster>
            </div>
          </div>
        ))}
        {episodes.length === 0 && <dl-text color="secondary">No episodes yet.</dl-text>}
      </dl-stack>
    </main>
  );
}
