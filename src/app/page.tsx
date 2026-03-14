"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length === 4) {
      router.push(`/league/${trimmed}`);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Fantasy Survivor</h1>
        <p className="text-gray-500">Enter your league code or sign in as commissioner</p>
      </div>

      <form onSubmit={handleJoin} className="flex flex-col items-center gap-4 w-full max-w-xs">
        <input
          type="text"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="4-digit league code"
          className="w-full text-center text-2xl tracking-widest border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={code.length !== 4}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          View League
        </button>
      </form>

      <div className="border-t pt-4 w-full max-w-xs text-center">
        <button
          onClick={() => router.push("/admin")}
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          Commissioner Login
        </button>
      </div>
    </main>
  );
}
