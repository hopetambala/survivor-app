// Root-level loading UI. Shown by Next's Suspense machinery while the
// initial page module + data are resolving.
export default function Loading() {
  return (
    <main className="page page--centered" aria-busy="true" aria-live="polite">
      <dl-spinner size="md"></dl-spinner>
      <span className="cl-dlite-sr-only">Loading…</span>
    </main>
  );
}
