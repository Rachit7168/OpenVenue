export function safeVenueUrl(raw: string): string | null {
  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (url.origin !== window.location.origin) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Only relative visitor content paths from this app origin are allowed. */
export function safeContentRef(ref: string): string | null {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.includes("..")) {
    return null;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.origin !== window.location.origin) {
        return null;
      }
      return url.pathname + url.search;
    } catch {
      return null;
    }
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
