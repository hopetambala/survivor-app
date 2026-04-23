"use client";

import { useEffect } from "react";

// Last-resort error boundary. Replaces the entire root layout (including
// <html>/<body>) when something throws at that level, so dl-* components
// cannot be used here — the DliteProvider hasn't mounted.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#111",
        }}
      >
        <main
          style={{
            maxWidth: "32rem",
            margin: "4rem auto",
            padding: "0 1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p style={{ color: "#999", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
