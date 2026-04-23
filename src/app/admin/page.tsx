"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { getEventValue } from "../../dlite-design-system/wc-helpers";

// Next requires any component reading useSearchParams() to sit inside a
// Suspense boundary. Export a Suspense wrapper; keep the real form below it.
export default function AdminAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="page page--centered">
          <dl-spinner size="md"></dl-spinner>
        </main>
      }
    >
      <AdminAuth />
    </Suspense>
  );
}

function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // If the proxy bounced the user here from a protected route, send them back
  // to that route after sign-in. Restrict to /admin/* to prevent open-redirect
  // abuse.
  const rawNext = searchParams.get("next") ?? "";
  const nextPath = rawNext.startsWith("/admin/") ? rawNext : "/admin/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (isSignUp) {
      setError("Check your email to confirm your account, then sign in.");
      setIsSignUp(false);
      return;
    }

    router.push(nextPath);
  }

  return (
    <main className="page page--centered">
      <div className="cl-dlite-w-full content-md">
        <div className="cl-dlite-text-center cl-dlite-sem-mb-600">
          <dl-heading level={1}>Commissioner {isSignUp ? "Sign Up" : "Login"}</dl-heading>
        </div>

        <form onSubmit={handleSubmit}>
          <dl-stack direction="vertical" gap="400">
            <dl-input
              type="email"
              placeholder="Email"
              value={email}
              required
              onInput={(e: any) => setEmail(getEventValue(e))}
            />
            <dl-input
              type="password"
              placeholder="Password"
              value={password}
              required
              onInput={(e: any) => setPassword(getEventValue(e))}
            />
            {error && (
              <dl-text size="300" color="tertiary">
                {error}
              </dl-text>
            )}
            <dl-button
              variant="primary"
              size="md"
              full-width
              disabled={loading || undefined}
              onClick={handleSubmit}
            >
              {loading
                ? isSignUp
                  ? "Creating account…"
                  : "Signing in…"
                : isSignUp
                  ? "Sign Up"
                  : "Sign In"}
            </dl-button>
          </dl-stack>
        </form>

        <div className="cl-dlite-text-center cl-dlite-sem-mt-400">
          <dl-button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </dl-button>
        </div>

        <div className="cl-dlite-text-center cl-dlite-sem-mt-600">
          <dl-button variant="ghost" size="sm" onClick={() => router.push("/")}>
            &larr; Back
          </dl-button>
        </div>
      </div>
    </main>
  );
}
