import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://127.0.0.1:8000/api/incidents";

export async function GET() {
  try {
    const res = await fetch(BACKEND_URL, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Backend returned error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[incidents proxy GET] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const res = await fetch(BACKEND_URL, {
      method: "DELETE",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Backend returned error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[incidents proxy DELETE] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
