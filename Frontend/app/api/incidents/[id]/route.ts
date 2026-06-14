import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders, safeId } from "@/lib/backend";

type Params = { params: Promise<{ id: string }> };

// Incident reads/mutations must always hit the live backend, never a static cache.
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set([
  "true_positive", "false_positive", "escalate", "contain",
  "close", "Closed", "Investigate", "investigating", "Investigating", "open", "Open",
]);

export async function GET(_request: NextRequest, context: Params) {
  const { id } = await context.params;
  try {
    const res = await fetch(`${BACKEND_URL}/api/incidents/${safeId(id)}`, {
      cache: "no-store",
      headers: backendHeaders(),
    });
    if (!res.ok) {
      // Forward the backend's real message/status (e.g. 404 {"message":"Incident not found"})
      // under both keys so the UI can surface the actual reason.
      const err = (await res.json().catch(() => ({}))) as { message?: string; detail?: string; error?: string };
      const reason = err.message || err.detail || err.error || `Backend returned error: ${res.status}`;
      return NextResponse.json({ error: reason, message: reason }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[incidents/[id] proxy GET] Error:", msg);
    return NextResponse.json({ error: "Could not reach the SOC backend." }, { status: 502 });
  }
}

export async function POST(request: NextRequest, context: Params) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { action?: unknown };
    if (typeof body.action !== "string" || !ALLOWED_ACTIONS.has(body.action)) {
      return NextResponse.json({ message: "Invalid action." }, { status: 400 });
    }
    const res = await fetch(`${BACKEND_URL}/api/incidents/${safeId(id)}/action`, {
      method: "POST",
      headers: backendHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action: body.action }),
    });
    if (!res.ok) {
      // Forward the backend's real message/status (e.g. 404 {"message":"Incident not found"})
      // under both keys so the UI can surface the actual reason.
      const err = (await res.json().catch(() => ({}))) as { message?: string; detail?: string; error?: string };
      const reason = err.message || err.detail || err.error || `Backend returned error: ${res.status}`;
      return NextResponse.json({ error: reason, message: reason }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[incidents/[id] proxy POST] Error:", msg);
    return NextResponse.json({ error: "Could not reach the SOC backend." }, { status: 502 });
  }
}
