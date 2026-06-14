import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, backendHeaders } from "@/lib/backend";

// Proxy a real log-file upload to the FastAPI backend's full SOC pipeline.
// The backend endpoint (POST /run-pipeline) runs Layers 1-6 on the uploaded
// file and persists the derived incidents to SQLite, which the dashboard then
// reads live via /api/incidents. This route just forwards the multipart body.
const ENDPOINT = `${BACKEND_URL}/run-pipeline`;

// Uploads can be large and must never be statically cached.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Attach a log file under the 'file' field." },
        { status: 400 },
      );
    }

    // Re-pack into a fresh FormData so undici sets a correct multipart boundary
    // when forwarding to the backend (which expects an UploadFile named 'file').
    const forward = new FormData();
    forward.append("file", file, file.name || "upload.json");

    const res = await fetch(ENDPOINT, { method: "POST", body: forward, headers: backendHeaders() });
    const text = await res.text();

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Backend returned a non-JSON response", detail: text.slice(0, 500) };
    }

    if (!res.ok) {
      // Forward the backend's structured error ({status, message}) verbatim so
      // the UI can show a clear reason (e.g. "Invalid log file: ...").
      const d = (data ?? {}) as { message?: string; error?: string };
      return NextResponse.json(
        {
          status: "error",
          error: d.message || d.error || `Pipeline backend error (${res.status})`,
          message: d.message || d.error || `Pipeline backend error (${res.status})`,
        },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[run-pipeline proxy] Error:", msg);
    return NextResponse.json(
      { error: `Could not reach pipeline backend: ${msg}` },
      { status: 502 },
    );
  }
}
