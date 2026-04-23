import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import type { League } from "../../../lib/supabase/types";
import DashboardView from "./DashboardView";

// Server component: fetches this commissioner's leagues at request time and
// passes them down to a small client island for interactivity. The proxy
// already gates /admin/* on authentication; this belt-and-suspenders check
// guarantees we always have a user row for the admin_id filter.
export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin");
  }

  const { data } = await supabase
    .from("leagues")
    .select("*")
    .eq("admin_id", user.id)
    .order("created_at", { ascending: false });

  const leagues = (data as League[] | null) ?? [];

  return <DashboardView initialLeagues={leagues} />;
}
