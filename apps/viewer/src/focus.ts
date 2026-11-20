const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    const style = typeof getComputedStyle === "function" ? getComputedStyle(element) : null;
    return style?.visibility !== "hidden" && style?.display !== "none";
  });
}

/** Next index when Tab / Shift+Tab wraps inside a dialog. */
export function wrapFocusIndex(count: number, current: number, reverse: boolean): number {
  if (count <= 0) {
    return -1;
  }
  if (reverse) {
    return current <= 0 ? count - 1 : current - 1;
  }
  return current >= count - 1 ? 0 : current + 1;
}

/** Keep Tab cycling inside a dialog. Returns true when the event was handled. */
export function trapTabKey(root: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== "Tab") {
    return false;
  }
  const items = focusableElements(root);
  if (items.length === 0) {
    event.preventDefault();
    root.focus();
    return true;
  }
  const active = document.activeElement as HTMLElement | null;
  const current = active ? items.indexOf(active) : -1;
  const atEdge =
    current < 0 ||
    (event.shiftKey && current === 0) ||
    (!event.shiftKey && current === items.length - 1);
  if (!atEdge) {
    return false;
  }
  event.preventDefault();
  const next = wrapFocusIndex(items.length, Math.max(current, 0), event.shiftKey);
  items[next]?.focus();
  return true;
}

export function focusFirst(root: HTMLElement | null): void {
  if (!root) {
    return;
  }
  const items = focusableElements(root);
  (items[0] ?? root).focus();
}
