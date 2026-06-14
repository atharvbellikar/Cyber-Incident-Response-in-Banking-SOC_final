import { NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders } from "@/lib/backend";

const ENDPOINT = `${BACKEND_URL}/api/incidents`;

// Incident listing/clearing must always hit the live backend, never a static cache.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(ENDPOINT, { cache: "no-store", headers: backendHeaders() });
    if (!res.ok) {
      // Forward the backend's structured message (e.g. 401 {"detail":"Invalid or missing API key"}).
      const err = (await res.json().catch(() => ({}))) as { message?: string; detail?: string; error?: string };
      const reason = err.message || err.detail || err.error || `Backend returned error: ${res.status}`;
      return NextResponse.json({ error: reason, message: reason }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[incidents proxy GET] Error:", msg);
    return NextResponse.json({ error: "Could not reach the SOC backend." }, { status: 502 });
  }
}

export async function DELETE() {
  try {
    const res = await fetch(ENDPOINT, { method: "DELETE", headers: backendHeaders() });
    if (!res.ok) {
      // Forward the backend's structured message so the UI shows the real reason.
      const err = (await res.json().catch(() => ({}))) as { message?: string; detail?: string; error?: string };
      const reason = err.message || err.detail || err.error || `Backend returned error: ${res.status}`;
      return NextResponse.json({ error: reason, message: reason }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[incidents proxy DELETE] Error:", msg);
    return NextResponse.json({ error: "Could not reach the SOC backend." }, { status: 502 });
  }
}
