"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Route-segment error boundary. Catches render/data errors in the app tree
// below the root layout. The root layout (and its DliteProvider) is still
// mounted, so dl-* components render correctly.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="page page--centered">
      <div className="cl-dlite-text-center" style={{ maxWidth: "32rem" }}>
        <dl-heading level={1}>Something went wrong</dl-heading>
        <dl-text color="secondary">
          An unexpected error occurred loading this page. Try again, or head back home.
        </dl-text>
        {error.digest && (
          <div className="cl-dlite-sem-mt-300">
            <dl-text size="200" color="tertiary">
              Reference: {error.digest}
            </dl-text>
          </div>
        )}
        <div className="cl-dlite-flex cl-dlite-justify-center cl-dlite-sem-gap-200 cl-dlite-sem-mt-400">
          <dl-button variant="primary" size="md" onClick={() => reset()}>
            Try again
          </dl-button>
          <dl-button variant="ghost" size="md" onClick={() => router.push("/")}>
            Go home
          </dl-button>
        </div>
      </div>
    </main>
  );
}
