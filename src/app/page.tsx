"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getEventValue } from "../dlite-design-system/wc-helpers";
import { isValidLeagueCode, normalizeLeagueCode } from "../lib/scoring";

export default function Home() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (isValidLeagueCode(code)) {
      router.push(`/league/${code}`);
    }
  }

  return (
    <main className="page page--centered">
      <div className="cl-dlite-text-center">
        <dl-heading level={1}>Fantasy Survivor</dl-heading>
        <dl-text color="secondary">Enter your league code or sign in as commissioner</dl-text>
      </div>

      <form
        onSubmit={handleJoin}
        className="cl-dlite-flex cl-dlite-flex-col cl-dlite-items-center cl-dlite-sem-gap-400 cl-dlite-w-full content-sm"
      >
        <dl-input
          type="text"
          placeholder="League code"
          value={code}
          className="code-input"
          onInput={(e: any) => {
            // Restrict to valid Crockford chars + legacy digits; cap at 6.
            const normalized = normalizeLeagueCode(getEventValue(e));
            const stripped = normalized.replace(/[^0-9A-HJKMNP-TV-Z]/g, "").slice(0, 6);
            setCode(stripped);
          }}
        />
        <dl-button
          variant="primary"
          full-width
          size="md"
          disabled={!isValidLeagueCode(code) || undefined}
          onClick={handleJoin}
        >
          View League
        </dl-button>
      </form>

      <div className="cl-dlite-w-full content-sm">
        <dl-divider orientation="horizontal" />
        <div className="cl-dlite-text-center cl-dlite-sem-mt-400">
          <dl-button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
            Commissioner Login
          </dl-button>
        </div>
      </div>
    </main>
  );
}
