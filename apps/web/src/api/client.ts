export function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw !== "string" || !raw.trim()) {
    return "";
  }
  return raw.replace(/\/$/, "");
}

export function backendAuthEnabled(): boolean {
  return import.meta.env.VITE_USE_API_AUTH !== "false" && apiBase().length > 0;
}

function readCookie(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? "") : "";
}

export function csrfToken(): string {
  return readCookie("csrftoken");
}

let csrfReady: Promise<void> | null = null;

export async function ensureCsrf(): Promise<void> {
  if (!apiBase()) {
    return;
  }
  csrfReady ??= fetch(`${apiBase()}/auth/csrf/`, { credentials: "include" }).then(() => undefined);
  await csrfReady;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = apiBase();
  if (!base) {
    throw new Error("API URL is not configured.");
  }
  await ensureCsrf();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = csrfToken();
  if (token) {
    headers.set("X-CSRFToken", token);
  }
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : `Request failed (${response.status}).`;
    throw new Error(detail);
  }
  return payload as T;
}
