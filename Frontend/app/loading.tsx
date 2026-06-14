export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="inline-block h-3 w-3 animate-ping rounded-full bg-cyan-400" />
        <span className="text-sm font-medium tracking-wide">Loading SOC console…</span>
      </div>
    </div>
  );
}
