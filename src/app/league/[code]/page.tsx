"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { calculatePlayerScores } from "../../../lib/scoring";
import type { League, Survivor, Player, DraftPick, ScoringRule, Episode, EpisodeEvent, Attendance } from "../../../lib/supabase/types";

type Tab = "leaderboard" | "rosters" | "episodes" | "survivors";

export default function LeaguePublicView() {
  const { code } = useParams<{ code: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [events, setEvents] = useState<EpisodeEvent[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [notFound, setNotFound] = useState(false);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("*")
      .eq("code", code)
      .single();

    if (!leagueData) {
      setNotFound(true);
      return;
    }
    setLeague(leagueData);

    const lid = leagueData.id;
    const [survivorsRes, playersRes, picksRes, rulesRes, epsRes, eventsRes, attendRes] = await Promise.all([
      supabase.from("survivors").select("*").eq("league_id", lid).order("name"),
      supabase.from("players").select("*").eq("league_id", lid).order("name"),
      supabase.from("draft_picks").select("*").eq("league_id", lid).order("pick_number"),
      supabase.from("scoring_rules").select("*").eq("league_id", lid).order("sort_order"),
      supabase.from("episodes").select("*").eq("league_id", lid).order("episode_number"),
      supabase.from("episode_events").select("*, episodes!inner(league_id)").eq("episodes.league_id", lid),
      supabase.from("attendance").select("*, episodes!inner(league_id)").eq("episodes.league_id", lid),
    ]);

    setSurvivors(survivorsRes.data || []);
    setPlayers(playersRes.data || []);
    setDraftPicks(picksRes.data || []);
    setRules(rulesRes.data || []);
    setEpisodes(epsRes.data || []);
    setEvents(eventsRes.data || []);
    setAttendanceRecords(attendRes.data || []);
  }, [code, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">League Not Found</h1>
          <p className="text-gray-500">No league with code &quot;{code}&quot; exists.</p>
          <a href="/" className="text-blue-600 underline mt-4 inline-block">Go back</a>
        </div>
      </main>
    );
  }

  if (!league) {
    return <main className="min-h-screen flex items-center justify-center"><p>Loading...</p></main>;
  }

  const scoredEpisodes = episodes.filter((e) => e.is_scored);
  const playerScores = calculatePlayerScores(
    players, draftPicks, scoredEpisodes, events, rules, attendanceRecords
  ).sort((a, b) => b.totalScore - a.totalScore);

  const tabs: { key: Tab; label: string }[] = [
    { key: "leaderboard", label: "Leaderboard" },
    { key: "rosters", label: "Rosters" },
    { key: "episodes", label: "Episodes" },
    { key: "survivors", label: "Survivors" },
  ];

  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-800">&larr; Home</a>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="text-gray-500">{league.season_name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <LeaderboardView playerScores={playerScores} />
      )}

      {/* Rosters */}
      {activeTab === "rosters" && (
        <RostersView players={players} draftPicks={draftPicks} survivors={survivors} />
      )}

      {/* Episodes */}
      {activeTab === "episodes" && (
        <EpisodesView
          episodes={scoredEpisodes}
          playerScores={playerScores}
          players={players}
          rules={rules}
          events={events}
          survivors={survivors}
          draftPicks={draftPicks}
          attendanceRecords={attendanceRecords}
        />
      )}

      {/* Survivors */}
      {activeTab === "survivors" && (
        <SurvivorsView survivors={survivors} />
      )}
    </main>
  );
}

function LeaderboardView({ playerScores }: { playerScores: ReturnType<typeof calculatePlayerScores> }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Standings</h2>
      <div className="flex flex-col gap-2">
        {playerScores.map((ps, idx) => (
          <div
            key={ps.playerId}
            className={`border rounded-lg p-3 flex items-center justify-between ${
              idx === 0 ? "border-yellow-400 bg-yellow-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-400 w-8">{idx + 1}</span>
              <div>
                <div className="font-semibold">{ps.playerName}</div>
                <div className="text-xs text-gray-400">
                  Survivor: {ps.survivorScore} &middot; Attendance: {ps.attendanceScore}
                </div>
              </div>
            </div>
            <span className="text-xl font-bold">{ps.totalScore}</span>
          </div>
        ))}
        {playerScores.length === 0 && <p className="text-gray-500">No scores yet.</p>}
      </div>
    </div>
  );
}

function RostersView({
  players,
  draftPicks,
  survivors,
}: {
  players: Player[];
  draftPicks: DraftPick[];
  survivors: Survivor[];
}) {
  const survivorMap = new Map(survivors.map((s) => [s.id, s]));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Rosters</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {players.map((player) => {
          const picks = draftPicks
            .filter((dp) => dp.player_id === player.id)
            .map((dp) => survivorMap.get(dp.survivor_id))
            .filter(Boolean);

          return (
            <div key={player.id} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">{player.name}</h3>
              {picks.length === 0 ? (
                <p className="text-gray-400 text-sm">No picks yet</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {picks.map((s) => (
                    <div key={s!.id} className="flex items-center justify-between text-sm">
                      <span className={s!.status === "eliminated" ? "line-through text-gray-400" : ""}>
                        {s!.name}
                      </span>
                      {s!.tribe && <span className="text-xs text-gray-400">{s!.tribe}</span>}
                      {s!.status === "eliminated" && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">out</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EpisodesView({
  episodes,
  playerScores,
  players,
  rules,
  events,
  survivors,
  draftPicks,
  attendanceRecords,
}: {
  episodes: Episode[];
  playerScores: ReturnType<typeof calculatePlayerScores>;
  players: Player[];
  rules: ScoringRule[];
  events: EpisodeEvent[];
  survivors: Survivor[];
  draftPicks: DraftPick[];
  attendanceRecords: Attendance[];
}) {
  const [expandedEp, setExpandedEp] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Episode Breakdown</h2>

      {/* Summary table */}
      <div className="overflow-x-auto mb-6">
        <table className="text-sm border-collapse w-full">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50 text-left">Player</th>
              {episodes.map((ep) => (
                <th key={ep.id} className="border p-2 bg-gray-50 text-center">Ep {ep.episode_number}</th>
              ))}
              <th className="border p-2 bg-gray-50 text-center font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {playerScores.map((ps) => (
              <tr key={ps.playerId}>
                <td className="border p-2 font-medium whitespace-nowrap">{ps.playerName}</td>
                {episodes.map((ep) => {
                  const epScore = ps.episodeScores.find((es) => es.episode === ep.episode_number);
                  return (
                    <td key={ep.id} className="border p-2 text-center">
                      {epScore?.total ?? "—"}
                    </td>
                  );
                })}
                <td className="border p-2 text-center font-bold">{ps.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expandable episode details */}
      <div className="flex flex-col gap-2">
        {episodes.map((ep) => (
          <div key={ep.id} className="border rounded-lg">
            <button
              onClick={() => setExpandedEp(expandedEp === ep.id ? null : ep.id)}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
            >
              <span className="font-semibold">
                Episode {ep.episode_number}
                {ep.title && <span className="text-gray-500 font-normal ml-2">{ep.title}</span>}
              </span>
              <span>{expandedEp === ep.id ? "▲" : "▼"}</span>
            </button>
            {expandedEp === ep.id && (
              <EpisodeDetail
                episode={ep}
                survivors={survivors}
                rules={rules}
                events={events.filter((e) => e.episode_id === ep.id)}
              />
            )}
          </div>
        ))}
        {episodes.length === 0 && <p className="text-gray-500">No scored episodes yet.</p>}
      </div>
    </div>
  );
}

function EpisodeDetail({
  episode,
  survivors,
  rules,
  events,
}: {
  episode: Episode;
  survivors: Survivor[];
  rules: ScoringRule[];
  events: EpisodeEvent[];
}) {
  const survivorsWithEvents = survivors.filter((s) =>
    events.some((e) => e.survivor_id === s.id)
  );
  const rulesMap = new Map(rules.map((r) => [r.id, r]));

  return (
    <div className="p-3 pt-0 overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="border p-1 bg-gray-50 text-left">Survivor</th>
            {rules.map((r) => (
              <th key={r.id} className="border p-1 bg-gray-50 text-center" title={r.description || ""}>
                {r.event_name.substring(0, 15)}
              </th>
            ))}
            <th className="border p-1 bg-gray-50 text-center font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {survivorsWithEvents.map((s) => {
            const survivorEvents = events.filter((e) => e.survivor_id === s.id);
            const total = survivorEvents.reduce((sum, ev) => {
              const rule = rulesMap.get(ev.scoring_rule_id);
              if (!rule) return sum;
              return sum + (rule.is_variable ? ev.value : rule.points * ev.value);
            }, 0);

            return (
              <tr key={s.id}>
                <td className="border p-1 font-medium whitespace-nowrap">{s.name}</td>
                {rules.map((r) => {
                  const ev = survivorEvents.find((e) => e.scoring_rule_id === r.id);
                  return (
                    <td key={r.id} className="border p-1 text-center">
                      {ev && ev.value !== 0 ? ev.value : "—"}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-bold">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SurvivorsView({ survivors }: { survivors: Survivor[] }) {
  const active = survivors.filter((s) => s.status === "active");
  const eliminated = survivors.filter((s) => s.status === "eliminated");

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Survivors</h2>

      <h3 className="font-medium text-green-700 mb-2">Still In ({active.length})</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
        {active.map((s) => (
          <div key={s.id} className="border rounded-lg p-2 text-sm">
            <div className="font-medium">{s.name}</div>
            {s.tribe && <div className="text-xs text-gray-400">{s.tribe}</div>}
          </div>
        ))}
      </div>

      {eliminated.length > 0 && (
        <>
          <h3 className="font-medium text-red-700 mb-2">Eliminated ({eliminated.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {eliminated.map((s) => (
              <div key={s.id} className="border rounded-lg p-2 text-sm bg-gray-50 opacity-60">
                <div className="font-medium line-through">{s.name}</div>
                {s.tribe && <div className="text-xs text-gray-400">{s.tribe}</div>}
                {s.eliminated_episode && <div className="text-xs text-red-400">Ep {s.eliminated_episode}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
