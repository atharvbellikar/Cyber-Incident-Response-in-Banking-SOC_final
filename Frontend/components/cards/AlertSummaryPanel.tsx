"use client";

import { EventPipeline } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { severityTone } from "@/lib/utils";

type Props = {
  pipeline: EventPipeline;
  timestamp?: string;
  status: "Open" | "Investigating" | "Closed";
  onStatusChange?: (status: "Open" | "Investigating" | "Closed") => void;
  onAction?: (action: "Block IP" | "Reset Password" | "Investigate") => void;
};

export default function AlertSummaryPanel({ pipeline, status, onStatusChange }: Props) {
  const eventId = pipeline?.event_id || "unknown";

  return (
    <section className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/95 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-base font-semibold leading-relaxed text-slate-100">{pipeline?.dashboard?.alert_title ?? "Unknown Alert"}</span>
          <Badge className={severityTone(pipeline?.dashboard?.severity)}>{pipeline?.dashboard?.severity?.toUpperCase() ?? "LOW"}</Badge>
          <span className="font-mono text-slate-400">Event ID: {eventId}</span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Status:</span>
          <select
            value={status}
            onChange={(e) => onStatusChange?.(e.target.value as any)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-slate-500/80 transition-colors cursor-pointer"
          >
            <option value="Open">Open</option>
            <option value="Investigating">Investigating</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>
    </section>
  );
}
