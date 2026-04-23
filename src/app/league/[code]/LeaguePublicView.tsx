"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculatePlayerScores } from "../../../lib/scoring";
import { getEventValue } from "../../../dlite-design-system/wc-helpers";
import EmptyState from "../../../components/EmptyState";
import type {
  PublicLeague,
  Survivor,
  Player,
  DraftPick,
  ScoringRule,
  Episode,
  EpisodeEvent,
  Attendance,
  LeaderboardRow,
} from "../../../lib/supabase/types";

type Tab = "leaderboard" | "rosters" | "episodes" | "survivors";

export type LeaguePublicViewProps = {
  league: PublicLeague;
  survivors: Survivor[];
  players: Player[];
  draftPicks: DraftPick[];
  rules: ScoringRule[];
  episodes: Episode[];
  events: EpisodeEvent[];
  attendanceRecords: Attendance[];
  leaderboard: LeaderboardRow[];
};

export default function LeaguePublicView({
  league,
  survivors,
  players,
  draftPicks,
  rules,
  episodes,
  events,
  attendanceRecords,
  leaderboard,
}: LeaguePublicViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");

  const scoredEpisodes = episodes.filter((e) => e.is_scored);
  const playerScores = calculatePlayerScores(
    players,
    draftPicks,
    scoredEpisodes,
    events,
    rules,
    attendanceRecords
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
        <dl-button variant="ghost" size="sm" onClick={() => router.push("/")}>
          &larr; Home
        </dl-button>
      </div>

      <div className="cl-dlite-sem-mb-600">
        <dl-heading level={1}>{league.name}</dl-heading>
        <dl-text color="secondary">{league.season_name}</dl-text>
      </div>

      <div className="cl-dlite-sem-mb-600">
        <dl-tabs value={activeTab} onChange={(e: any) => setActiveTab(getEventValue(e) as Tab)}>
          {tabs.map((tab) => (
            <dl-tab key={tab.key} label={tab.label} value={tab.key}></dl-tab>
          ))}
        </dl-tabs>
      </div>

      {activeTab === "leaderboard" && <LeaderboardView rows={leaderboard} />}

      {activeTab === "rosters" && (
        <RostersView players={players} draftPicks={draftPicks} survivors={survivors} />
      )}

      {activeTab === "episodes" && (
        <EpisodesView
          episodes={scoredEpisodes}
          playerScores={playerScores}
          rules={rules}
          events={events}
          survivors={survivors}
        />
      )}

      {activeTab === "survivors" && <SurvivorsView survivors={survivors} />}
    </main>
  );
}

function LeaderboardView({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div>
      <dl-heading level={2}>Standings</dl-heading>
      <dl-stack direction="vertical" gap="200">
        {rows.map((r, idx) => (
          <div
            key={r.player_id}
            className={`cl-dlite-card cl-dlite-sem-p-300 cl-dlite-flex cl-dlite-items-center cl-dlite-justify-between ${
              idx === 0 ? "leader-card--gold" : ""
            }`}
          >
            <div className="cl-dlite-flex cl-dlite-items-center cl-dlite-sem-gap-300">
              <span
                className="cl-dlite-sem-font-heading cl-dlite-sem-text-400 cl-dlite-prim-font-bold cl-dlite-sem-text-tertiary"
                style={{ width: "2rem" }}
              >
                {idx + 1}
              </span>
              <div>
                <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">
                  {r.player_name}
                </div>
                <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">
                  Survivor: {r.survivor_score} &middot; Attendance: {r.attendance_score}
                </div>
              </div>
            </div>
            <span className="cl-dlite-sem-font-heading cl-dlite-sem-text-500 cl-dlite-prim-font-bold">
              {r.total_score}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <EmptyState
            title="No scores yet"
            message="Standings appear here once the commissioner scores the first episode."
          />
        )}
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
              <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold cl-dlite-sem-mb-200 cl-dlite-block">
                {player.name}
              </span>
              {picks.length === 0 ? (
                <dl-text size="300" color="tertiary">
                  No picks yet
                </dl-text>
              ) : (
                <dl-stack direction="vertical" gap="100">
                  {picks.map((s) => (
                    <div
                      key={s!.id}
                      className="cl-dlite-flex cl-dlite-items-center cl-dlite-justify-between cl-dlite-sem-text-300"
                    >
                      <span
                        className={
                          s!.status === "eliminated"
                            ? "cl-dlite-line-through cl-dlite-sem-text-tertiary"
                            : ""
                        }
                      >
                        {s!.name}
                      </span>
                      <div className="cl-dlite-flex cl-dlite-items-center cl-dlite-sem-gap-200">
                        {s!.tribe && (
                          <span className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">
                            {s!.tribe}
                          </span>
                        )}
                        {s!.status === "eliminated" && <dl-badge variant="danger">out</dl-badge>}
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
  rules,
  events,
  survivors,
}: {
  episodes: Episode[];
  playerScores: ReturnType<typeof calculatePlayerScores>;
  rules: ScoringRule[];
  events: EpisodeEvent[];
  survivors: Survivor[];
}) {
  const [expandedEp, setExpandedEp] = useState<string | null>(null);

  return (
    <div>
      <dl-heading level={2}>Episode Breakdown</dl-heading>

      <div className="cl-dlite-overflow-x-auto cl-dlite-sem-mb-600">
        <dl-table>
          <table>
            <thead>
              <tr>
                <th className="cl-dlite-text-left">Player</th>
                {episodes.map((ep) => (
                  <th key={ep.id} className="cl-dlite-text-center">
                    Ep {ep.episode_number}
                  </th>
                ))}
                <th className="cl-dlite-text-center cl-dlite-prim-font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {playerScores.map((ps) => (
                <tr key={ps.playerId}>
                  <td className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-whitespace-nowrap">
                    {ps.playerName}
                  </td>
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
        </dl-table>
      </div>

      <dl-stack direction="vertical" gap="200">
        {episodes.map((ep) => (
          <div key={ep.id} className="cl-dlite-card" style={{ padding: 0 }}>
            <button
              type="button"
              onClick={() => setExpandedEp(expandedEp === ep.id ? null : ep.id)}
              aria-expanded={expandedEp === ep.id}
              aria-controls={`episode-panel-${ep.id}`}
              className="cl-dlite-w-full cl-dlite-sem-p-300 cl-dlite-flex cl-dlite-items-center cl-dlite-justify-between cl-dlite-cursor-pointer cl-dlite-sem-transition-colors"
            >
              <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">
                Episode {ep.episode_number}
                {ep.title && (
                  <span className="cl-dlite-sem-text-secondary cl-dlite-prim-font-normal cl-dlite-sem-ml-200">
                    {ep.title}
                  </span>
                )}
              </span>
              <span aria-hidden="true">{expandedEp === ep.id ? "▲" : "▼"}</span>
            </button>
            {expandedEp === ep.id && (
              <div
                id={`episode-panel-${ep.id}`}
                role="region"
                aria-label={`Episode ${ep.episode_number} details`}
              >
                <EpisodeDetail
                  survivors={survivors}
                  rules={rules}
                  events={events.filter((e) => e.episode_id === ep.id)}
                />
              </div>
            )}
          </div>
        ))}
        {episodes.length === 0 && (
          <EmptyState
            title="No scored episodes yet"
            message="Episode-by-episode breakdowns will appear here as the commissioner scores each one."
          />
        )}
      </dl-stack>
    </div>
  );
}

function EpisodeDetail({
  survivors,
  rules,
  events,
}: {
  survivors: Survivor[];
  rules: ScoringRule[];
  events: EpisodeEvent[];
}) {
  const survivorsWithEvents = survivors.filter((s) => events.some((e) => e.survivor_id === s.id));
  const rulesMap = new Map(rules.map((r) => [r.id, r]));

  return (
    <div className="cl-dlite-sem-p-300 cl-dlite-overflow-x-auto" style={{ paddingTop: 0 }}>
      <dl-table>
        <table>
          <thead>
            <tr>
              <th className="cl-dlite-text-left">Survivor</th>
              {rules.map((r) => (
                <th
                  key={r.id}
                  className="cl-dlite-text-center"
                  title={r.description ? `${r.event_name} — ${r.description}` : r.event_name}
                  style={{
                    maxWidth: "8rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.event_name}
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
                  <td className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-whitespace-nowrap">
                    {s.name}
                  </td>
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
      </dl-table>
    </div>
  );
}

function SurvivorsView({ survivors }: { survivors: Survivor[] }) {
  const active = survivors.filter((s) => s.status === "active");
  const eliminated = survivors.filter((s) => s.status === "eliminated");

  return (
    <div>
      <dl-heading level={2}>Survivors</dl-heading>

      <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-sem-text-success cl-dlite-sem-mb-200 cl-dlite-block">
        Still In ({active.length})
      </span>
      <div className="grid-responsive cl-dlite-sem-mb-600">
        {active.map((s) => (
          <div key={s.id} className="cl-dlite-card cl-dlite-sem-p-200 cl-dlite-sem-text-300">
            <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium">{s.name}</div>
            {s.tribe && (
              <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">{s.tribe}</div>
            )}
          </div>
        ))}
      </div>

      {eliminated.length > 0 && (
        <>
          <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-sem-text-danger cl-dlite-sem-mb-200 cl-dlite-block">
            Eliminated ({eliminated.length})
          </span>
          <div className="grid-responsive">
            {eliminated.map((s) => (
              <div
                key={s.id}
                className="cl-dlite-card cl-dlite-sem-p-200 cl-dlite-sem-text-300 cl-dlite-sem-bg-sunken"
                style={{ opacity: 0.6 }}
              >
                <div className="cl-dlite-sem-font-heading cl-dlite-prim-font-medium cl-dlite-line-through">
                  {s.name}
                </div>
                {s.tribe && (
                  <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-tertiary">{s.tribe}</div>
                )}
                {s.eliminated_episode && (
                  <div className="cl-dlite-sem-text-200 cl-dlite-sem-text-danger">
                    Ep {s.eliminated_episode}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
