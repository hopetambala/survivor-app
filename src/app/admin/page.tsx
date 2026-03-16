"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function AdminAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

    router.push("/admin/dashboard");
  }

  return (
    <main className="page page--centered">
      <div className="cl-dlite-w-full" style={{ maxWidth: "24rem" }}>
        <div className="cl-dlite-text-center cl-dlite-sem-mb-600">
          <dl-heading level={1}>
            Commissioner {isSignUp ? "Sign Up" : "Login"}
          </dl-heading>
        </div>

        <form onSubmit={handleSubmit}>
          <dl-stack gap="400">
            <dl-input
              type="email"
              placeholder="Email"
              value={email}
              required
              onInput={(e: any) => setEmail((e.target as any).value ?? "")}
            />
            <dl-input
              type="password"
              placeholder="Password"
              value={password}
              required
              onInput={(e: any) => setPassword((e.target as any).value ?? "")}
            />
            {error && <dl-text size="300" color="tertiary">{error}</dl-text>}
            <dl-button
              variant="primary"
              full-width
              disabled={loading || undefined}
              onClick={handleSubmit}
            >
              {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
            </dl-button>
          </dl-stack>
        </form>

        <div className="cl-dlite-text-center cl-dlite-sem-mt-400">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            className="btn-link cl-dlite-sem-text-200"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
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
