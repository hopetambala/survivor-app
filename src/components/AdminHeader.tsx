"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { useToast } from "./AppDialogs";

// Persistent chrome for every authenticated admin page. Gives commissioners
// a home link and a sign-out button from anywhere in the admin surface —
// previously sign-out was only reachable from the dashboard.
export default function AdminHeader() {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast(`Sign-out failed: ${error.message}`, "error");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <header className="admin-header">
      <Link href="/admin/dashboard" className="admin-header__brand">
        <span className="cl-dlite-sem-font-heading cl-dlite-prim-font-semibold">
          Fantasy Survivor
        </span>
        <span className="cl-dlite-sem-text-tertiary cl-dlite-sem-ml-200 cl-dlite-sem-text-300">
          admin
        </span>
      </Link>
      <dl-button variant="ghost" size="sm" onClick={handleSignOut}>
        Sign out
      </dl-button>
    </header>
  );
}
