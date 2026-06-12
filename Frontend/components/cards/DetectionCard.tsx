"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { severityTone } from "@/lib/utils";
import EntityPivot from "@/components/shared/EntityPivot";

type Props = { pipeline: EventPipeline };

export default function DetectionCard({ pipeline }: Props) {
  const [expanded, setExpanded] = useState(true);
  const confidence = Math.max(0, Math.min(100, (pipeline?.detection?.confidence ?? 0) * 100));

  return (
    <CardBlock
      title="Detection Verdict"
      tag={pipeline?.detection?.label}
      severity={pipeline?.detection?.severity}
      highlight
    >
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-slate-700/60 bg-slate-950/70 p-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-red-500/40 bg-red-500/10 text-red-300">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Severity</p>
              <p className="text-sm font-semibold text-slate-50">{pipeline?.detection?.severity?.toUpperCase() ?? "LOW"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={severityTone(pipeline?.detection?.severity)}>Severity: {pipeline?.detection?.severity}</Badge>
            <Badge variant="outline">Threat: {pipeline?.detection?.threat_type ?? "N/A"}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <EntityPivot type="ip" value={pipeline?.dashboard?.source_ip ?? "N/A"} />
          <EntityPivot type="user" value={pipeline?.dashboard?.affected_user ?? "N/A"} />
        </div>

        <div className="space-y-2 rounded-sm border border-slate-700/60 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-slate-400">
            <span>Confidence</span>
            <span className="font-mono">{confidence.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className={`h-full rounded-full ${confidence >= 85 ? "bg-red-500" : confidence >= 65 ? "bg-orange-400" : confidence >= 40 ? "bg-yellow-400" : "bg-emerald-400"}`}
            />
          </div>
          <p className="text-xs text-slate-400">Model confidence derived from ensemble threat scoring.</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Reasoning</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? (
              <span className="inline-flex items-center gap-1">Why this alert? <ChevronUp className="h-4 w-4" /></span>
            ) : (
              <span className="inline-flex items-center gap-1">Why this alert? <ChevronDown className="h-4 w-4" /></span>
            )}
          </Button>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.div
              key="detection-reasoning"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-3 rounded-sm border border-red-500/20 bg-red-500/5 p-3">
                <SectionList
                  title="Reasoning"
                  items={pipeline?.detection?.reasoning?.length ? pipeline?.detection?.reasoning : ["No reasoning provided"]}
                />
                <SectionList
                  title="Triggered Engines"
                  items={
                    pipeline?.detection?.triggered_engines?.length
                      ? pipeline?.detection?.triggered_engines
                      : ["No engines listed"]
                  }
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </CardBlock>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <ul className="list-inside list-disc space-y-1 text-slate-200">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
