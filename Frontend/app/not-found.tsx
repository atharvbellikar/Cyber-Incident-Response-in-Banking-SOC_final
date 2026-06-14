import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400/80">SENTRA · 404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-100">Page not found</h1>
      <p className="mt-1 max-w-md text-sm text-slate-400">The page you’re looking for doesn’t exist or has moved.</p>
      <Link
        href="/dashboard"
        className="mt-5 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
