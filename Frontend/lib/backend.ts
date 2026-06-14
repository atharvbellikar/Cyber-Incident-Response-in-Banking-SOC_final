// Single source of truth for reaching the FastAPI backend from the Next.js
// route handlers (server side). Configurable via env so the app deploys outside
// localhost without code changes:
//   BACKEND_URL      - base URL of the SOC API (default http://127.0.0.1:8000)
//   BACKEND_API_KEY  - forwarded as X-API-Key when the backend has auth enabled
export const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? "";

export function backendHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (BACKEND_API_KEY) headers["X-API-Key"] = BACKEND_API_KEY;
  return headers;
}

// Validate/encode a path segment (incident id) before interpolating into a URL.
export function safeId(id: string): string {
  return encodeURIComponent(String(id));
}
