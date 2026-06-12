import { EventPipeline } from "@/lib/mockData";
import EntityPivot from "@/components/shared/EntityPivot";

type Props = {
  pipeline: EventPipeline;
};

export default function ThreatTopology({ pipeline }: Props) {
  const sourceIp = pipeline?.dashboard?.source_ip ?? "N/A";
  const threat = pipeline?.detection?.threat_type ?? pipeline?.detection?.label ?? "Threat";
  const user = pipeline?.dashboard?.affected_user ?? "unknown-user";

  return (
    <div className="rounded-sm border border-slate-700/50 bg-slate-950/60 p-3">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">Threat Topology</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <EntityPivot type="ip" value={sourceIp} />
        <span className="text-slate-500">-&gt;</span>
        <span className="rounded-sm border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 font-mono text-slate-200">
          {threat}
        </span>
        <span className="text-slate-500">-&gt;</span>
        <EntityPivot type="user" value={user} />
      </div>
    </div>
  );
}