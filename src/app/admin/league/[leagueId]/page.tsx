import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import type { League, DraftState } from "../../../../lib/supabase/types";

// Server component: fetches the league overview in one round trip and hands
// the result to the rendered card grid. No client island needed — the cards
// are plain <Link>s so they support Cmd-click, keyboard nav, and right-click.
export default async function LeagueOverviewPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const [leagueRes, draftRes, survivorsRes, playersRes, episodesRes] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase.from("draft_state").select("*").eq("league_id", leagueId).single(),
    supabase.from("survivors").select("id").eq("league_id", leagueId),
    supabase.from("players").select("id").eq("league_id", leagueId),
    supabase.from("episodes").select("id").eq("league_id", leagueId),
  ]);

  const league = leagueRes.data as League | null;
  if (!league) notFound();

  // RLS enforces admin_id = auth.uid() on the admin policies, so a foreign
  // league would come back null above — but the explicit check here is cheap
  // insurance and keeps intent readable.
  if (league.admin_id !== user.id) {
    redirect("/admin/dashboard");
  }

  const draftState = draftRes.data as DraftState | null;
  const survivorCount = survivorsRes.data?.length ?? 0;
  const playerCount = playersRes.data?.length ?? 0;
  const episodeCount = episodesRes.data?.length ?? 0;

  const navItems = [
    {
      label: "Survivors",
      href: `/admin/league/${leagueId}/survivors`,
      count: survivorCount,
      desc: "Manage contestants",
    },
    {
      label: "Players",
      href: `/admin/league/${leagueId}/players`,
      count: playerCount,
      desc: "Manage participants",
    },
    {
      label: "Draft",
      href: `/admin/league/${leagueId}/draft`,
      status: draftState?.status ?? "not_started",
      desc: "Run the snake draft",
    },
    {
      label: "Episodes",
      href: `/admin/league/${leagueId}/episodes`,
      count: episodeCount,
      desc: "Score episodes & attendance",
    },
    {
      label: "Scoring Rules",
      href: `/admin/league/${leagueId}/scoring-rules`,
      desc: "Manage point values",
    },
    {
      label: "Settings",
      href: `/admin/league/${leagueId}/settings`,
      desc: "Draft picks, max drafts & more",
    },
  ];

  return (
    <main className="page page--narrow">
      <Link href="/admin/dashboard" className="cl-dlite-no-underline">
        <dl-button variant="ghost" size="sm">
          &larr; All Leagues
        </dl-button>
      </Link>

      <div className="cl-dlite-sem-mb-600">
        <dl-heading level={1}>{league.name}</dl-heading>
        <dl-text color="secondary">{league.season_name}</dl-text>
        <dl-text size="300">
          League Code:{" "}
          <span className="cl-dlite-sem-font-mono cl-dlite-prim-font-bold cl-dlite-sem-text-500">
            {league.code}
          </span>
          <span className="cl-dlite-sem-text-tertiary cl-dlite-sem-ml-200">
            (share with participants)
          </span>
        </dl-text>
      </div>

      <div className="grid-2">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} className="cl-dlite-no-underline">
            <dl-card interactive>
              <dl-cluster justify="between" gap="200">
                <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">
                  {item.label}
                </span>
                {item.count !== undefined && <dl-badge variant="default">{item.count}</dl-badge>}
                {item.status && (
                  <dl-badge
                    variant={
                      item.status === "completed"
                        ? "success"
                        : item.status === "in_progress"
                          ? "warning"
                          : "default"
                    }
                  >
                    {item.status.replace("_", " ")}
                  </dl-badge>
                )}
              </dl-cluster>
              <dl-text size="300" color="secondary">
                {item.desc}
              </dl-text>
            </dl-card>
          </Link>
        ))}
      </div>
    </main>
  );
}
