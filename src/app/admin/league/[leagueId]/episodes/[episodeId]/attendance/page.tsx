"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../../../lib/supabase/client";
import type { Player, Episode, Attendance } from "../../../../../../../lib/supabase/types";

export default function AttendancePage() {
  const { leagueId, episodeId } = useParams<{ leagueId: string; episodeId: string }>();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const [epRes, playersRes, attendRes] = await Promise.all([
      supabase.from("episodes").select("*").eq("id", episodeId).single(),
      supabase.from("players").select("*").eq("league_id", leagueId).order("name"),
      supabase.from("attendance").select("*").eq("episode_id", episodeId),
    ]);
    setEpisode(epRes.data);
    setPlayers(playersRes.data || []);

    const attMap: Record<string, number> = {};
    (attendRes.data || []).forEach((a: Attendance) => {
      attMap[a.player_id] = a.points;
    });
    setAttendance(attMap);
  }, [leagueId, episodeId, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function cycleAttendance(playerId: string) {
    const current = attendance[playerId] ?? 0;
    // Cycle: 0 → 0.5 → 1 → 0
    const next = current === 0 ? 0.5 : current === 0.5 ? 1 : 0;
    setAttendance((prev) => ({ ...prev, [playerId]: next }));
  }

  async function handleSave() {
    setSaving(true);

    // Delete existing attendance
    await supabase.from("attendance").delete().eq("episode_id", episodeId);

    // Insert all non-zero records
    const rows = Object.entries(attendance)
      .filter(([, points]) => points > 0)
      .map(([playerId, points]) => ({
        episode_id: episodeId,
        player_id: playerId,
        points,
      }));

    if (rows.length > 0) {
      await supabase.from("attendance").insert(rows);
    }

    setSaving(false);
    router.push(`/admin/league/${leagueId}/episodes`);
  }

  if (!episode) {
    return <main className="page page--centered"><p>Loading...</p></main>;
  }

  return (
    <main className="page" style={{ maxWidth: "32rem", marginInline: "auto" }}>
      <dl-button variant="ghost" size="sm" onClick={() => router.push(`/admin/league/${leagueId}/episodes`)}>
        &larr; Back to Episodes
      </dl-button>

      <dl-cluster justify="between" gap="400">
        <div>
          <dl-heading level={1}>Attendance</dl-heading>
          <dl-text color="secondary">Episode {episode.episode_number}{episode.title ? ` — ${episode.title}` : ""}</dl-text>
        </div>
        <dl-button
          variant="primary"
          disabled={saving || undefined}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save"}
        </dl-button>
      </dl-cluster>

      <dl-text size="300" color="secondary">
        Tap to cycle: <span className="cl-dlite-sem-font-mono">0</span> → <span className="cl-dlite-sem-font-mono">0.5</span> (watched remotely) → <span className="cl-dlite-sem-font-mono">1</span> (attended) → <span className="cl-dlite-sem-font-mono">0</span>
      </dl-text>

      <div className="cl-dlite-sem-mt-400">
        <dl-stack gap="200">
          {players.map((player) => {
            const pts = attendance[player.id] ?? 0;
            return (
              <dl-card
                key={player.id}
                interactive
                onClick={() => cycleAttendance(player.id)}
              >
                <dl-cluster justify="between" gap="200">
                  <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{player.name}</span>
                  <span className={`cl-dlite-sem-font-mono cl-dlite-prim-font-bold cl-dlite-sem-text-400 ${
                    pts === 1 ? "cl-dlite-sem-text-success" : pts === 0.5 ? "cl-dlite-sem-text-warning" : "cl-dlite-sem-text-muted"
                  }`}>
                    {pts === 1 ? "1 ✓" : pts === 0.5 ? "0.5" : "0"}
                  </span>
                </dl-cluster>
              </dl-card>
            );
          })}
        </dl-stack>
      </div>
    </main>
  );
}
