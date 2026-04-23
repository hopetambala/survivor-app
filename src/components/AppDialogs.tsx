"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ----------------------------------------------------------------------------
// Toast + ConfirmDialog, both provided by a single root `<AppDialogs>` context.
// Replaces browser alert()/confirm() with styled, accessible, non-blocking UI.
// ----------------------------------------------------------------------------

export type ToastVariant = "info" | "success" | "warning" | "error";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
};

type Ctx = {
  toast: (message: string, variant?: ToastVariant) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const AppDialogsContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(AppDialogsContext);
  if (!ctx) throw new Error("useToast must be used inside <AppDialogs>");
  return ctx.toast;
}

export function useConfirm() {
  const ctx = useContext(AppDialogsContext);
  if (!ctx) throw new Error("useConfirm must be used inside <AppDialogs>");
  return ctx.confirm;
}

const TOAST_DURATION_MS = 4000;

export default function AppDialogs({ children }: { children: React.ReactNode }) {
  // ----- toast state -----
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<Ctx["toast"]>(
    (message, variant = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  // ----- confirm-dialog state -----
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback<Ctx["confirm"]>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (pending && !node.open) {
      node.showModal();
      // Focus the primary action for keyboard users.
      const primary = node.querySelector<HTMLElement>("[data-confirm-primary]");
      primary?.focus();
    } else if (!pending && node.open) {
      node.close();
    }
  }, [pending]);

  const handleChoice = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  return (
    <AppDialogsContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack — fixed bottom-right, announced to screen readers. */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          maxWidth: "calc(100vw - 2rem)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          // Wrapper captures the click-to-dismiss interaction; dl-alert's own
          // `dismissible` event isn't typed in the dlite React JSX surface.
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => dismiss(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") dismiss(t.id);
            }}
            style={{
              pointerEvents: "auto",
              minWidth: "18rem",
              maxWidth: "28rem",
              cursor: "pointer",
            }}
          >
            {/* dl-alert uses "danger" where we use "error" publicly. */}
            <dl-alert variant={t.variant === "error" ? "danger" : t.variant}>{t.message}</dl-alert>
          </div>
        ))}
      </div>

      {/* Single dialog element reused for all confirm() calls. */}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          handleChoice(false);
        }}
        style={{
          border: "none",
          borderRadius: "var(--tk-dlite-semantic-border-radius-300, 0.5rem)",
          padding: 0,
          background: "transparent",
          maxWidth: "32rem",
          width: "calc(100vw - 2rem)",
        }}
      >
        {pending && (
          <div
            className="cl-dlite-card cl-dlite-sem-p-500"
            style={{ background: "var(--tk-dlite-semantic-color-background-surface, #fff)" }}
          >
            <dl-heading level={2}>{pending.title}</dl-heading>
            {pending.message && (
              <div className="cl-dlite-sem-mt-200">
                <dl-text color="secondary">{pending.message}</dl-text>
              </div>
            )}
            <div className="cl-dlite-flex cl-dlite-justify-end cl-dlite-sem-gap-200 cl-dlite-sem-mt-400">
              <dl-button variant="ghost" size="md" onClick={() => handleChoice(false)}>
                {pending.cancelLabel ?? "Cancel"}
              </dl-button>
              <dl-button
                variant={pending.variant === "danger" ? "primary" : "primary"}
                size="md"
                data-confirm-primary
                onClick={() => handleChoice(true)}
              >
                {pending.confirmLabel ?? "Confirm"}
              </dl-button>
            </div>
          </div>
        )}
      </dialog>
    </AppDialogsContext.Provider>
  );
}
