"use client";

import { motion } from "framer-motion";

interface FrequencyMetric {
  label: string;
  value: number;
  max: number;
  color: string;
  icon?: string;
}

interface EventFrequencyBarsProps {
  metrics?: FrequencyMetric[];
}

const defaultMetrics: FrequencyMetric[] = [
  { label: "Login Attempts", value: 45, max: 100, color: "bg-blue-500", icon: "🔐" },
  { label: "Failed Auth", value: 38, max: 100, color: "bg-orange-500", icon: "❌" },
  { label: "Anomalies", value: 72, max: 100, color: "bg-red-500", icon: "⚠️" },
];

export default function EventFrequencyBars({ metrics = defaultMetrics }: EventFrequencyBarsProps) {
  return (
    <motion.div
      className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-4 space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Event Frequency</h3>

      <div className="space-y-3">
        {metrics.map((metric, index) => {
          const percentage = (metric.value / metric.max) * 100;

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 + index * 0.08 }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-300">
                  {metric.icon && <span className="mr-1">{metric.icon}</span>}
                  {metric.label}
                </span>
                <span className="font-mono text-xs text-slate-400">{metric.value}</span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
                <motion.div
                  className={`h-full ${metric.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 + index * 0.08 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-700/50">
        <p className="text-xs text-slate-400">Last 24 hours</p>
      </div>
    </motion.div>
  );
}
