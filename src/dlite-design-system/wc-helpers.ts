"use client";

// dlite web components fire CustomEvent with a `detail` payload; native DOM
// elements expose `value`/`checked` on the target. Both shapes show up in the
// same onInput/onChange handlers, so these helpers coalesce them.
//
// We accept a broad surface because consumers pass a mix of React
// SyntheticEvent, native Event, and CustomEvent — the shape that actually
// reaches these helpers has the same two slots for value/checked extraction.

type EventLike = {
  detail?: { value?: unknown; checked?: unknown } | null;
  target?: (EventTarget & { value?: unknown; checked?: unknown }) | null;
};

/**
 * Extract a string value from a web component event.
 * Works with both CustomEvent (detail.value) and native Event (target.value).
 */
export function getEventValue(e: EventLike): string {
  const fromDetail = e?.detail?.value;
  if (typeof fromDetail === "string") return fromDetail;
  const fromTarget = e?.target?.value;
  return typeof fromTarget === "string" ? fromTarget : "";
}

/**
 * Extract a boolean checked state from a web component event.
 * Works with both CustomEvent (detail.checked) and native Event (target.checked).
 */
export function getEventChecked(e: EventLike): boolean {
  const fromDetail = e?.detail?.checked;
  if (typeof fromDetail === "boolean") return fromDetail;
  const fromTarget = e?.target?.checked;
  return typeof fromTarget === "boolean" ? fromTarget : false;
}
