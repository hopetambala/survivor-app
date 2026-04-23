import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "./lib/env";

// Guards /admin/* routes. Unauthenticated requests are redirected to /admin
// (the login page) before any page code runs, so protected content never
// flashes. The /admin page itself stays open so users can sign in.
//
// Next 16 renamed this convention from `middleware.ts` to `proxy.ts`; the
// exported function name (`proxy`) follows the new convention.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Mirror the standard Supabase SSR pattern: write refreshed cookies
        // to both the incoming request (so subsequent code sees them) and
        // the outgoing response (so the browser stores them).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin";

  if (isAdminArea && !isAdminLogin && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If a signed-in user lands on /admin (the login page), send them to the dashboard.
  if (isAdminLogin && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
