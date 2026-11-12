const PUBLIC_VENUE_PATH =
  /^\/api\/v1\/public\/venues\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

export function trustedApiOrigins(): string[] {
  const raw =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ORIGIN
      ? String(import.meta.env.VITE_API_ORIGIN)
      : "";
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isAllowedVenuePath(pathname: string): boolean {
  if (PUBLIC_VENUE_PATH.test(pathname)) {
    return true;
  }
  return pathname.endsWith(".json") && !pathname.includes("..");
}

export function safeVenueUrl(raw: string): string | null {
  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (url.origin === window.location.origin && isAllowedVenuePath(url.pathname)) {
      return url.toString();
    }
    if (trustedApiOrigins().includes(url.origin) && isAllowedVenuePath(url.pathname)) {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function publicVenueIdFromUrl(raw: string): { venueId: string; apiOrigin: string } | null {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(raw, base);
    const match = url.pathname.match(PUBLIC_VENUE_PATH);
    if (!match?.[1]) {
      return null;
    }
    return { venueId: match[1], apiOrigin: url.origin };
  } catch {
    return null;
  }
}

export function publicContentFetchUrl(
  venueId: string,
  apiOrigin: string,
  contentRef: string,
): string {
  const params = new URLSearchParams({ ref: contentRef });
  return `${apiOrigin}/api/v1/public/venues/${venueId}/content/?${params.toString()}`;
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
