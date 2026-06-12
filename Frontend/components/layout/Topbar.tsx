"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import { ShieldCheck, Clock, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPipelineById } from "@/lib/mockData";
import { usePipeline } from "@/hooks/usePipeline";
import { severityTone } from "@/lib/utils";

const PAGE_TITLES: Record<string, { label: string; sub: string }> = {
  "/dashboard": { label: "Security Operations Dashboard", sub: "Active incident queue & analytics" },
  "/upload":    { label: "Event Ingestion Pipeline",      sub: "Upload logs & simulate cyber events" },
};

export default function Topbar() {
  const pathname = usePathname();
  const params = useParams();
  const uploadedPipeline = usePipeline();
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  const incidentId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const pipeline = useMemo(() => (incidentId ? getPipelineById(incidentId, uploadedPipeline) : null), [incidentId, uploadedPipeline]);
  const isIncidentPage = pathname.startsWith("/incident");

  const page = useMemo(() => {
    if (isIncidentPage && pipeline) {
      return {
        label: pipeline.dashboard?.alert_title || "Incident Details",
        sub: `Event · ${pipeline.event_id}`,
      };
    }
    for (const [key, val] of Object.entries(PAGE_TITLES)) {
      if (pathname.startsWith(key)) return val;
    }
    return { label: "SENTRA Console", sub: "Security Operations Platform" };
  }, [pathname, isIncidentPage, pipeline]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/90 px-6 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-6">

        {/* Left: page context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-200">{page.label}</p>
            <div className="flex items-center gap-2">
              <p className="truncate text-[11px] text-slate-500">{page.sub}</p>
              {isIncidentPage && pipeline && (
                <Badge className={`${severityTone(pipeline.dashboard?.severity)} text-[9px] py-0`}>
                  {pipeline.dashboard?.severity?.toUpperCase() || "LOW"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right: status chips */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Live monitor */}
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-emerald-400">Monitoring Active</span>
          </div>

          {/* Clock */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-slate-800/60 bg-slate-900/60 px-3 py-1.5 sm:flex">
            <Clock className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-mono text-[11px] text-slate-500">{time}</span>
          </div>

          {/* Analyst badge */}
          <button className="flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800/60">
            <UserCircle2 className="h-4 w-4 text-sky-400" />
            Analyst
          </button>
        </div>
      </div>
    </header>
  );
}