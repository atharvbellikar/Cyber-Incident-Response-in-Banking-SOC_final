"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, Layers3, ShieldAlert, Sparkles, TimerReset } from "lucide-react";
import { EventPipeline } from "@/lib/mockData";

type Props = { pipeline: EventPipeline };

const stages = [
  { key: "ingestion", label: "Ingestion", icon: Activity, tone: "emerald" },
  { key: "feature", label: "Feature", icon: Layers3, tone: "sky" },
  { key: "anomaly", label: "Anomaly", icon: Sparkles, tone: "yellow" },
  { key: "detection", label: "Detection", icon: ShieldAlert, tone: "red" },
  { key: "response", label: "Response", icon: TimerReset, tone: "cyan" },
] as const;

export default function AttackTimeline({ pipeline }: Props) {
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-6 shadow-[0_0_32px_rgba(15,23,42,0.5)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Attack Timeline</p>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Progression of the incident</h2>
        </div>
        <p className="text-xs text-slate-400">Vertical flow with connectors</p>
      </div>

      <div className="relative pl-3">
        <div className="absolute bottom-6 left-[19px] top-6 w-px bg-gradient-to-b from-sky-500/0 via-slate-600 to-sky-500/0" />
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isDetection = stage.key === "detection";
            const toneClass =
              stage.tone === "emerald"
                ? "text-emerald-300"
                : stage.tone === "sky"
                  ? "text-sky-300"
                  : stage.tone === "yellow"
                    ? "text-yellow-300"
                    : stage.tone === "red"
                      ? "text-red-300"
                      : "text-cyan-300";

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="relative flex items-start gap-4"
              >
                <div
                  className={`relative z-10 mt-1 flex h-10 w-10 items-center justify-center rounded-full border shadow-lg ${
                    isDetection
                      ? "border-red-400/50 bg-red-500/15 text-red-200 shadow-red-500/20"
                      : `border-slate-600 bg-slate-950/80 ${toneClass}`
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div
                  className={`flex-1 rounded-2xl border p-4 transition-all ${
                    isDetection
                      ? "border-red-500/40 bg-red-500/10 shadow-[0_0_24px_rgba(239,68,68,0.15)]"
                      : "border-slate-700/80 bg-slate-950/75 hover:border-slate-500"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Stage {index + 1}</p>
                      <h3 className={`text-base font-semibold ${isDetection ? "text-red-100" : "text-slate-100"}`}>
                        {stage.label}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${isDetection ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-slate-600 bg-slate-900 text-slate-300"}`}>
                      {isDetection ? "Highlighted" : "Processing"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {stage.key === "ingestion" && `Captured event at ${pipeline?.raw_event?.timestamp ?? "N/A"}`}
                    {stage.key === "feature" && "Feature extraction and normalization"}
                    {stage.key === "anomaly" && "Model deviation and behavioral scoring"}
                    {stage.key === "detection" && `Confidence ${((pipeline?.detection?.confidence ?? 0) * 100).toFixed(0)}% with ${pipeline?.detection?.severity ?? "low"} severity`}
                    {stage.key === "response" && `Priority ${pipeline?.response?.priority ?? "P4"} response planning`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}