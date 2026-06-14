"use client";

import { useEffect } from "react";

// Route-segment error boundary (covers /dashboard, /incident/*, /upload, etc.).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-400/80">SENTRA · Error</p>
      <h1 className="mt-2 text-xl font-bold text-slate-100">Something went wrong loading this view</h1>
      <p className="mt-1 max-w-md text-sm text-slate-400">
        The SOC console hit an error rendering this page. This is usually transient — retry, or check that the
        backend API is reachable.
      </p>
      {error?.digest && <p className="mt-1 font-mono text-[11px] text-slate-600">ref: {error.digest}</p>}
      <div className="mt-5 flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
        >
          Retry
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
