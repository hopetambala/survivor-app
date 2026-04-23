"use client";

import type { ReactNode } from "react";

// Reusable empty-state block for list pages. Gives the user a heading, a
// supporting line, and an optional call-to-action — much more guiding than
// a blank space or a terse "No items." line.
export default function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="cl-dlite-card cl-dlite-sem-p-500 cl-dlite-text-center" role="status">
      <dl-heading level={3}>{title}</dl-heading>
      {message && (
        <div className="cl-dlite-sem-mt-200">
          <dl-text color="secondary">{message}</dl-text>
        </div>
      )}
      {action && <div className="cl-dlite-sem-mt-400">{action}</div>}
    </div>
  );
}
