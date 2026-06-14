import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { BACKEND_URL, backendHeaders } from "@/lib/backend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.events)) {
      return NextResponse.json({ error: "Invalid payload — expected { events: [] }" }, { status: 400 });
    }

    // Persist simulated events to the backend DB so they appear via /api/incidents
    // (the dashboard's primary source) — not just the static fallback file.
    let backendCount = 0;
    let backendOk = false;
    let backendError: string | null = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulate`, {
        method: "POST",
        headers: backendHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ events: body.events }),
      });
      if (res.ok) {
        backendOk = true;
        backendCount = (await res.json())?.count ?? 0;
      } else {
        // Surface the real backend failure instead of silently reporting success.
        const err = (await res.json().catch(() => ({}))) as { message?: string; detail?: string };
        backendError = err.message || err.detail || `backend ${res.status}`;
      }
    } catch (e) {
      backendError = e instanceof Error ? e.message : String(e);
      console.error("[simulate route] backend forward failed (non-fatal):", e);
    }

    // Also write the static fallback file (best-effort).
    try {
      const outputPath = path.join(process.cwd(), "public", "frontend_output.json");
      await writeFile(outputPath, JSON.stringify({ status: "success", total_events: body.events.length, events: body.events }, null, 2), "utf-8");
    } catch (e) {
      console.error("[simulate route] static write failed (non-fatal):", e);
    }

    // localStorage is the dashboard's primary persistence path, so the sim itself
    // succeeded even if the backend mirror failed/deduped — keep status "success"
    // and HTTP 200 (callers use bare fetch().catch()), but report the real backend
    // outcome via persisted/backend_ok/backendError so partial failures are visible.
    return NextResponse.json({
      status: "success",
      events: body.events.length,
      submitted: body.events.length,
      persisted: backendCount,
      backend_ok: backendOk,
      backendError,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[simulate route] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
