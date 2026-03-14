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
    return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;
  }

  return (
    <main className="min-h-screen p-4 max-w-lg mx-auto">
      <button
        onClick={() => router.push(`/admin/league/${leagueId}/episodes`)}
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block"
      >
        &larr; Back to Episodes
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-gray-500">Episode {episode.episode_number}{episode.title ? ` — ${episode.title}` : ""}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Tap to cycle: <span className="font-mono">0</span> → <span className="font-mono">0.5</span> (watched remotely) → <span className="font-mono">1</span> (attended) → <span className="font-mono">0</span>
      </p>

      <div className="flex flex-col gap-2">
        {players.map((player) => {
          const pts = attendance[player.id] ?? 0;
          return (
            <button
              key={player.id}
              onClick={() => cycleAttendance(player.id)}
              className="border rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">{player.name}</span>
              <span className={`text-lg font-mono font-bold ${
                pts === 1 ? "text-green-600" : pts === 0.5 ? "text-yellow-600" : "text-gray-300"
              }`}>
                {pts === 1 ? "1 ✓" : pts === 0.5 ? "0.5" : "0"}
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
