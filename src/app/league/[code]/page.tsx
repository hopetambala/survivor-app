"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { calculatePlayerScores } from "../../../lib/scoring";
import { getEventValue } from "../../../dlite-design-system/wc-helpers";
import type { League, Survivor, Player, DraftPick, ScoringRule, Episode, EpisodeEvent, Attendance } from "../../../lib/supabase/types";

type Tab = "leaderboard" | "rosters" | "episodes" | "survivors";

export default function LeaguePublicView() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
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
      <main className="page page--centered">
        <div className="cl-dlite-text-center">
          <dl-heading level={1}>League Not Found</dl-heading>
          <dl-text color="secondary">No league with code &quot;{code}&quot; exists.</dl-text>
          <div className="cl-dlite-sem-mt-400">
            <dl-button variant="ghost" size="sm" onClick={() => router.push("/")}>Go back</dl-button>
          </div>
        </div>
      </main>
    );
  }

  if (!league) {
    return <main className="page page--centered"><p>Loading...</p></main>;
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
    <main className="page page--wide">
      <div className="cl-dlite-sem-mb-400">
        <dl-button variant="ghost" size="sm" onClick={() => router.push("/")}>&larr; Home</dl-button>
      </div>

      <div className="cl-dlite-sem-mb-600">
        <dl-heading level={1}>{league.name}</dl-heading>
        <dl-text color="secondary">{league.season_name}</dl-text>
      </div>

      {/* Tabs */}
      <div className="cl-dlite-sem-mb-600">
        <dl-tabs value={activeTab} onChange={(e: any) => setActiveTab(getEventValue(e) as Tab)}>
          {tabs.map((tab) => (
            <dl-tab key={tab.key} label={tab.label} value={tab.key}>
              {/* Content rendered conditionally below */}
            </dl-tab>
          ))}
        </dl-tabs>
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
      <dl-heading level={2}>Standings</dl-heading>
      <dl-stack gap="200">
        {playerScores.map((ps, idx) => (
          <div
            key={ps.playerId}
            className={`cl-dlite-card cl-dlite-sem-p-300 cl-dlite-flex cl-dlite-items-center cl-dlite-justify-between ${
              idx === 0 ? "leader-card--gold" : ""
            }`}
          >
            <div className="cl-dlite-flex cl-dlite-items-center cl-dlite-sem-gap-300">
              <span className="cl-dlite-sem-font-heading cl-dlite-sem-text-400 cl-dlite-prim-font-bold cl-dlite-sem-text-tertiary" style={{ width: "2rem" }}>{idx + 1}</span>
              <div>
                <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">{ps.playerName}</div>
                <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">
                  Survivor: {ps.survivorScore} &middot; Attendance: {ps.attendanceScore}
                </div>
              </div>
            </div>
            <span className="cl-dlite-sem-font-heading cl-dlite-sem-text-500 cl-dlite-prim-font-bold">{ps.totalScore}</span>
          </div>
        ))}
        {playerScores.length === 0 && <dl-text color="secondary">No scores yet.</dl-text>}
      </dl-stack>
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
      <dl-heading level={2}>Rosters</dl-heading>
      <div className="grid-2">
        {players.map((player) => {
          const picks = draftPicks
            .filter((dp) => dp.player_id === player.id)
            .map((dp) => survivorMap.get(dp.survivor_id))
            .filter(Boolean);

          return (
            <div key={player.id} className="cl-dlite-card cl-dlite-sem-p-400">
              <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold cl-dlite-sem-mb-200 cl-dlite-block">{player.name}</span>
              {picks.length === 0 ? (
                <dl-text size="300" color="tertiary">No picks yet</dl-text>
              ) : (
                <dl-stack gap="100">
                  {picks.map((s) => (
                    <div key={s!.id} className="cl-dlite-flex cl-dlite-items-center cl-dlite-justify-between cl-dlite-sem-text-300">
                      <span className={s!.status === "eliminated" ? "cl-dlite-line-through cl-dlite-sem-text-tertiary" : ""}>
                        {s!.name}
                      </span>
                      <div className="cl-dlite-flex cl-dlite-items-center cl-dlite-sem-gap-200">
                        {s!.tribe && <span className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">{s!.tribe}</span>}
                        {s!.status === "eliminated" && (
                          <span className="cl-dlite-badge cl-dlite-badge-danger">out</span>
                        )}
                      </div>
                    </div>
                  ))}
                </dl-stack>
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
      <dl-heading level={2}>Episode Breakdown</dl-heading>

      {/* Summary table */}
      <div className="cl-dlite-overflow-x-auto cl-dlite-sem-mb-600">
        <table className="cl-dlite-table">
          <thead>
            <tr>
              <th className="cl-dlite-text-left">Player</th>
              {episodes.map((ep) => (
                <th key={ep.id} className="cl-dlite-text-center">Ep {ep.episode_number}</th>
              ))}
              <th className="cl-dlite-text-center cl-dlite-prim-font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {playerScores.map((ps) => (
              <tr key={ps.playerId}>
                <td className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-whitespace-nowrap">{ps.playerName}</td>
                {episodes.map((ep) => {
                  const epScore = ps.episodeScores.find((es) => es.episode === ep.episode_number);
                  return (
                    <td key={ep.id} className="cl-dlite-text-center">
                      {epScore?.total ?? "—"}
                    </td>
                  );
                })}
                <td className="cl-dlite-text-center cl-dlite-prim-font-bold">{ps.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expandable episode details */}
      <dl-stack gap="200">
        {episodes.map((ep) => (
          <div key={ep.id} className="cl-dlite-card" style={{ padding: 0 }}>
            <button
              onClick={() => setExpandedEp(expandedEp === ep.id ? null : ep.id)}
              className="cl-dlite-w-full cl-dlite-sem-p-300 cl-dlite-flex cl-dlite-items-center cl-dlite-justify-between cl-dlite-cursor-pointer cl-dlite-sem-transition-colors"
            >
              <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">
                Episode {ep.episode_number}
                {ep.title && <span className="cl-dlite-sem-text-secondary cl-dlite-prim-font-normal cl-dlite-sem-ml-200">{ep.title}</span>}
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
        {episodes.length === 0 && <dl-text color="secondary">No scored episodes yet.</dl-text>}
      </dl-stack>
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
    <div className="cl-dlite-sem-p-300 cl-dlite-overflow-x-auto" style={{ paddingTop: 0 }}>
      <table className="cl-dlite-table">
        <thead>
          <tr>
            <th className="cl-dlite-text-left">Survivor</th>
            {rules.map((r) => (
              <th key={r.id} className="cl-dlite-text-center" title={r.description || ""}>
                {r.event_name.substring(0, 15)}
              </th>
            ))}
            <th className="cl-dlite-text-center cl-dlite-prim-font-bold">Total</th>
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
                <td className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-whitespace-nowrap">{s.name}</td>
                {rules.map((r) => {
                  const ev = survivorEvents.find((e) => e.scoring_rule_id === r.id);
                  return (
                    <td key={r.id} className="cl-dlite-text-center">
                      {ev && ev.value !== 0 ? ev.value : "—"}
                    </td>
                  );
                })}
                <td className="cl-dlite-text-center cl-dlite-prim-font-bold">{total}</td>
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
      <dl-heading level={2}>Survivors</dl-heading>

      <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-sem-text-success cl-dlite-sem-mb-200 cl-dlite-block">Still In ({active.length})</span>
      <div className="grid-responsive cl-dlite-sem-mb-600">
        {active.map((s) => (
          <div key={s.id} className="cl-dlite-card cl-dlite-sem-p-200 cl-dlite-sem-text-300">
            <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{s.name}</div>
            {s.tribe && <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">{s.tribe}</div>}
          </div>
        ))}
      </div>

      {eliminated.length > 0 && (
        <>
          <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-sem-text-danger cl-dlite-sem-mb-200 cl-dlite-block">Eliminated ({eliminated.length})</span>
          <div className="grid-responsive">
            {eliminated.map((s) => (
              <div key={s.id} className="cl-dlite-card cl-dlite-sem-p-200 cl-dlite-sem-text-300 cl-dlite-sem-bg-sunken" style={{ opacity: 0.6 }}>
                <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-line-through">{s.name}</div>
                {s.tribe && <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">{s.tribe}</div>}
                {s.eliminated_episode && <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-danger">Ep {s.eliminated_episode}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
