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
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Commissioner {isSignUp ? "Sign Up" : "Login"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
          className="mt-4 text-sm text-gray-500 hover:text-gray-800 underline w-full text-center"
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>

        <div className="mt-6 text-center">
          <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Back
          </button>
        </div>
      </div>
    </main>
  );
}
