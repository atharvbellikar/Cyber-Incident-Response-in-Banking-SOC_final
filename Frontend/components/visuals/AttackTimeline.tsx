"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Lock, ArrowRight, Database } from "lucide-react";
import { EventPipeline } from "@/lib/mockData";

interface TimelineEvent {
  time: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface AttackTimelineProps {
  events?: TimelineEvent[];
  pipeline?: EventPipeline;
}

// UTC-based formatting (deterministic across SSR/client → no hydration mismatch).
function formatTime(isoOrText: string | undefined, fallback: string): string {
  if (!isoOrText) return fallback;
  const date = new Date(isoOrText);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(11, 19);
}

function plusSeconds(iso: string | undefined, seconds: number, fallback: string): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  date.setSeconds(date.getSeconds() + seconds);
  return date.toISOString().slice(11, 19);
}

function normalizeSeverity(value: string | undefined): "low" | "medium" | "high" | "critical" {
  const normalized = value?.toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
}

function buildTimelineFromPipeline(pipeline?: EventPipeline): TimelineEvent[] {
  if (!pipeline) return [];

  // Real backend events carry the ISO time on ingestion.timestamp (raw_event.timestamp
  // is null for several log shapes); fall back to it so the timeline isn't blank.
  const baseTime =
    (typeof pipeline.ingestion?.timestamp === "string" ? pipeline.ingestion.timestamp : undefined) ??
    (typeof pipeline.raw_event?.timestamp === "string" ? pipeline.raw_event.timestamp : undefined);
  const detectionSeverity = normalizeSeverity(pipeline.detection?.severity || pipeline.dashboard?.severity);
  const anomalyScore = Number(pipeline.anomaly_detection?.anomaly_score ?? 0);
  const anomalySeverity: "medium" | "high" = anomalyScore >= 0.8 ? "high" : "medium";

  // Backend doesn't emit ingestion.source; it carries the log family instead.
  // Keep ingestion.source for legacy/mock data, then fall back to log_family.
  const ingestionSource = pipeline.ingestion?.source ?? pipeline.ingestion?.log_family ?? "Unknown Source";
  const rawEventName =
    pipeline.raw_event?.event_name ??
    pipeline.detection?.threat_type ??
    pipeline.dashboard?.alert_title ??
    "Security Event";
  const detectionLabel = pipeline.detection?.label ?? "Detection Triggered";
  const threatType = pipeline.detection?.threat_type ?? "Potential Threat";
  const reasoning = Array.isArray(pipeline.detection?.reasoning) ? pipeline.detection.reasoning : [];
  const aiSummary = pipeline.ai_analysis?.summary ?? pipeline.ai_analysis?.one_liner ?? "AI analysis generated incident context.";
  const firstAction = pipeline.response?.recommended_actions?.[0] ?? "Response playbook initiated";

  const events: TimelineEvent[] = [
    {
      time: formatTime(baseTime, "--:--:--"),
      title: "Ingestion",
      description: `${rawEventName} captured via ${ingestionSource}.`,
      severity: "low",
    },
    {
      time: plusSeconds(baseTime, 30, "--:--:--"),
      title: "Anomaly Detection",
      description: `Anomaly score ${anomalyScore.toFixed(2)} exceeded baseline thresholds.`,
      severity: anomalySeverity,
    },
    {
      time: plusSeconds(baseTime, 60, "--:--:--"),
      title: detectionLabel,
      description: `${threatType} identified by ${pipeline.detection?.triggered_engines?.[0] ?? "detection engine"}.`,
      severity: detectionSeverity,
    },
    {
      time: plusSeconds(baseTime, 90, "--:--:--"),
      title: "AI Analysis",
      description: reasoning[0] ?? aiSummary,
      severity: detectionSeverity,
    },
    {
      time: plusSeconds(baseTime, 120, "--:--:--"),
      title: "Response Planning",
      description: firstAction,
      severity: detectionSeverity === "critical" ? "high" : detectionSeverity,
    },
  ];

  return events;
}

const severityColors = {
  low: "bg-blue-500/20 border-blue-500/40 text-blue-300",
  medium: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",
  high: "bg-orange-500/20 border-orange-500/40 text-orange-300",
  critical: "bg-red-500/20 border-red-500/40 text-red-300",
};

const severityDots = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500 animate-pulse",
};

export default function AttackTimeline({ events, pipeline }: AttackTimelineProps) {
  const timeline = events ?? buildTimelineFromPipeline(pipeline);
  const iconMap = [Lock, AlertTriangle, ArrowRight, Database];

  return (
    <motion.div
      className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-5 space-y-4"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Attack Timeline</h3>

      <div className="space-y-4">
        {timeline.map((event, index) => {
          const Icon = iconMap[index % iconMap.length];

          return (
            <motion.div
              key={`${event.time}-${index}`}
              className="flex gap-4"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.08 }}
            >
              {/* Timeline Dot and Line */}
              <div className="flex flex-col items-center gap-0">
                <motion.div
                  className={`h-3 w-3 rounded-full ${severityDots[event.severity]}`}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                />
                {index < timeline.length - 1 && (
                  <div className="h-12 w-0.5 bg-gradient-to-b from-slate-600 to-slate-700/30" />
                )}
              </div>

              {/* Event Content */}
              <div className={`flex-1 rounded-sm border p-3 ${severityColors[event.severity]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <p className="text-sm font-semibold">{event.title}</p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{event.description}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-mono text-slate-400">{event.time}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
