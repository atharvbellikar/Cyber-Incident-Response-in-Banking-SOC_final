// Deterministic, timezone-stable timestamp formatting.
//
// `toLocaleString()` / `toLocaleTimeString()` format using the runtime's local
// timezone, which differs between the server (UTC during SSR) and the browser
// (the user's local zone). Rendering those directly causes React hydration
// mismatches ("server rendered text didn't match the client"). Formatting in
// UTC via toISOString() is identical on both sides, so it hydrates cleanly.

export function formatTimestamp(input?: string | number | null): string {
  if (input === undefined || input === null || input === "") return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

export function formatTimeOnly(input?: string | number | null): string {
  if (input === undefined || input === null || input === "") return "--:--:--";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return `${d.toISOString().slice(11, 19)}Z`;
}

/** Add `seconds` to an ISO timestamp and return a stable UTC HH:MM:SSZ string. */
export function formatTimeOnlyPlus(input: string | undefined, seconds: number): string {
  if (!input) return "--:--:--";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  d.setSeconds(d.getSeconds() + seconds);
  return `${d.toISOString().slice(11, 19)}Z`;
}
