import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";

type Props = { pipeline: EventPipeline };

export default function SummaryCard({ pipeline }: Props) {
  return (
    <CardBlock title="Incident Summary" tag={pipeline?.event_id} severity={pipeline?.dashboard?.severity}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Alert" value={pipeline?.dashboard?.alert_title ?? "N/A"} />
        <Metric label="CVSS" value={(pipeline?.dashboard?.cvss_score ?? 0).toFixed(1)} />
        <Metric label="Source IP" value={pipeline?.dashboard?.source_ip ?? "N/A"} />
        <Metric label="Affected User" value={pipeline?.dashboard?.affected_user ?? "N/A"} />
      </div>
    </CardBlock>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const technical = label === "CVSS" || label === "Source IP";

  return (
    <div className="rounded-sm border border-slate-700/50 bg-slate-950/80 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 text-sm text-slate-100 ${technical ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}