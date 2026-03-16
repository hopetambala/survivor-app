"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getEventValue } from "../dlite-design-system/wc-helpers";

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
    <main className="page page--centered">
      <div className="cl-dlite-text-center">
        <dl-heading level={1}>Fantasy Survivor</dl-heading>
        <dl-text color="secondary">Enter your league code or sign in as commissioner</dl-text>
      </div>

      <form onSubmit={handleJoin} className="cl-dlite-flex cl-dlite-flex-col cl-dlite-items-center cl-dlite-sem-gap-400 cl-dlite-w-full" style={{ maxWidth: "20rem" }}>
        <dl-input
          type="text"
          placeholder="4-digit league code"
          value={code}
          style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.1em" }}
          onInput={(e: any) => {
            const val = getEventValue(e).replace(/\D/g, "");
            setCode(val.slice(0, 4));
          }}
        />
        <dl-button
          variant="primary"
          full-width
          disabled={code.length !== 4 || undefined}
          onClick={handleJoin}
        >
          View League
        </dl-button>
      </form>

      <div style={{ maxWidth: "20rem" }} className="cl-dlite-w-full">
        <dl-divider />
        <div className="cl-dlite-text-center cl-dlite-sem-mt-400">
          <button
            onClick={() => router.push("/admin")}
            className="btn-link cl-dlite-sem-text-200"
          >
            Commissioner Login
          </button>
        </div>
      </div>
    </main>
  );
}
