"use client";

/**
 * Extract a string value from a web component event.
 * Works with both CustomEvent (detail.value) and native Event (target.value).
 */
export function getEventValue(e: any): string {
  return e?.detail?.value ?? e?.target?.value ?? "";
}

/**
 * Extract a boolean checked state from a web component event.
 * Works with both CustomEvent (detail.checked) and native Event (target.checked).
 */
export function getEventChecked(e: any): boolean {
  return e?.detail?.checked ?? e?.target?.checked ?? false;
}
