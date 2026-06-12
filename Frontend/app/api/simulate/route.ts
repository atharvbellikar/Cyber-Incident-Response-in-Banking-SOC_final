import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.events)) {
      return NextResponse.json({ error: "Invalid payload — expected { events: [] }" }, { status: 400 });
    }

    const output = {
      status: "success",
      total_events: body.events.length,
      events: body.events,
    };

    // Write to Frontend/public/frontend_output.json (served statically by Next.js)
    const outputPath = path.join(process.cwd(), "public", "frontend_output.json");
    await writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");

    return NextResponse.json({ status: "success", events: body.events.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[simulate route] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
