"use client";

import { motion } from "framer-motion";

type SeverityLevel = "low" | "medium" | "high" | "critical";

interface SeverityGaugeProps {
  severity: SeverityLevel;
  score?: number;
}

export default function SeverityGauge({ severity, score = 0 }: SeverityGaugeProps) {
  const severityMap: Record<SeverityLevel, { percentage: number; color: string; label: string }> = {
    low: { percentage: 25, color: "from-blue-500 to-blue-600", label: "LOW" },
    medium: { percentage: 50, color: "from-orange-500 to-orange-600", label: "MEDIUM" },
    high: { percentage: 75, color: "from-red-500 to-red-600", label: "HIGH" },
    critical: { percentage: 100, color: "from-red-500 to-red-600", label: "CRITICAL" },
  };

  const { percentage, color, label } = severityMap[severity];

  return (
    <motion.div
      className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-4 space-y-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Severity Gauge</h3>
        <span className={`rounded-sm px-2 py-1 text-xs font-bold ${
          severity === "critical"
            ? "bg-red-500/20 text-red-300"
            : severity === "high"
              ? "bg-red-500/20 text-red-300"
              : severity === "medium"
                ? "bg-orange-500/20 text-orange-300"
                : "bg-blue-500/20 text-blue-300"
        }`}>{label}</span>
      </div>

      {/* Horizontal Bar Gauge */}
      <div>
        <div className="mb-2 h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${color}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Risk Level</span>
          <span className="font-mono font-semibold">{percentage}%</span>
        </div>
      </div>

      {/* CVSS Score */}
      {score > 0 && (
        <div className="rounded-sm border border-slate-700/50 bg-slate-950/40 p-2">
          <p className="text-xs text-slate-400">CVSS Score</p>
          <p className="text-sm font-semibold text-sky-300">{score.toFixed(1)}</p>
        </div>
      )}

      {/* Status Indicator */}
      <div className="flex items-center gap-2 pt-2">
        <div className={`h-2 w-2 rounded-full ${
          severity === "critical"
            ? "bg-red-500 animate-pulse"
            : severity === "high"
              ? "bg-red-500 animate-pulse"
              : severity === "medium"
                ? "bg-orange-500"
                : "bg-blue-500"
        }`} />
        <span className="text-xs text-slate-400">
          {severity === "critical" ? "Immediate Action Required" : severity === "high" ? "High Priority" : "Monitor Closely"}
        </span>
      </div>
    </motion.div>
  );
}
