import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";

type Props = { pipeline: EventPipeline | null };

export default function ReportCard({ pipeline }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fr = (pipeline?.final_report ?? {}) as Record<string, any>;
  const timeline: string[] = Array.isArray(fr.timeline) ? fr.timeline : [];
  const hasData = Object.keys(fr).length > 0;

  return (
    <CardBlock title="Final Report" tag="Layer 6">
      {!hasData ? (
        <p className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-500">
          No final report generated yet for this incident.
        </p>
      ) : (
        <div className="space-y-3 text-sm text-slate-200">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Owner" value={fr.owner ?? "Unassigned"} />
            <Field label="Status" value={String(fr.status ?? "open").toUpperCase()} />
            <Field label="Priority" value={fr.priority ?? "—"} />
          </div>

          {fr.summary && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Summary</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{fr.summary}</p>
            </div>
          )}

          {timeline.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pipeline Timeline</p>
              <ol className="mt-1.5 space-y-1.5">
                {timeline.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-[9px] font-bold text-cyan-400">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </CardBlock>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-950/60 px-2.5 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      <p className="text-xs font-semibold text-slate-200">{value}</p>
    </div>
  );
}
