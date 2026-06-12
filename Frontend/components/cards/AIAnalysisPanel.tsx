"use client";

import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, Target, Shield, ArrowRight } from "lucide-react";
import { EventPipeline } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import EntityPivot from "@/components/shared/EntityPivot";

interface AIAnalysisPanelProps {
  pipeline: EventPipeline;
  highlightQuery?: string;
  showExploreButton?: boolean;
}

export default function AIAnalysisPanel({ pipeline, highlightQuery, showExploreButton = true }: AIAnalysisPanelProps) {
  const ai = pipeline?.ai_analysis || {};
  const oneLiner = ai.one_liner || "AI is analyzing this incident.";
  const intent = ai.intent || "Unknown Intent";
  const narrative = ai.narrative || "No narrative available.";
  const attack_vector = ai.attack_vector || "Unknown vector.";
  const impact = ai.impact || { confidentiality: "Unknown", integrity: "Unknown", availability: "Unknown" };
  const eventId = pipeline?.event_id || "unknown";
  const shortNarrative = narrative.split(".").slice(0, 2).join(". ").trim();
  const nextSteps = Array.isArray(ai.next_steps) ? ai.next_steps : [];
  const actionBullets = nextSteps.length > 0
    ? nextSteps.slice(0, 3)
    : [
      "Investigate unusual authentication activity and endpoint behavior.",
      "Validate source identity and isolate suspicious hosts.",
      "Review logs for further lateral movement indicators.",
    ];

  // Highlight search query if provided
  const highlightText = (text: string): React.ReactNode[] => {
    if (!highlightQuery || !text) return [text];
    const parts = text.split(new RegExp(`(${highlightQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlightQuery.toLowerCase()
        ? <span key={i} className="bg-yellow-400/30 font-semibold text-yellow-100">{part}</span>
        : part
    );
  };

  // Highlight key threat keywords in narrative
  const keywordRegex = /\b(attacker|malicious|compromise|beaconing|lateral movement|credential|exfiltration|persistence|backdoor|exploit|ransomware|c2|command-and-control|web shell|brute force|credential abuse|spear-phishing)\b/i;
  const highlightedNarrative = narrative.split(/\b(attacker|malicious|compromise|beaconing|lateral movement|credential|exfiltration|persistence|backdoor|exploit|ransomware|C2|command-and-control|web shell|brute force|credential abuse|spear-phishing)\b/gi).map((part, idx) => {
    if (keywordRegex.test(part)) {
      return (
        <span key={idx} className="font-semibold text-amber-300">
          {part}
        </span>
      );
    }
    return part;
  });

  const impactTones: Record<string, string> = {
    CRITICAL: "border-red-900/50 bg-red-900/15 text-red-300",
    HIGH: "border-orange-900/50 bg-orange-900/15 text-orange-300",
    MEDIUM: "border-yellow-900/50 bg-yellow-900/15 text-yellow-300",
  };

  const getImpactTone = (level: string): string => {
    const upper = level?.toUpperCase() ?? "MEDIUM";
    if (upper.includes("CRITICAL")) return impactTones.CRITICAL;
    if (upper.includes("HIGH")) return impactTones.HIGH;
    return impactTones.MEDIUM;
  };

  const severityTone = (pipeline?.dashboard?.severity ?? "medium").toLowerCase();
  const accentClass = severityTone === "critical"
    ? "border-l-4 border-red-500"
    : severityTone === "high"
      ? "border-l-4 border-orange-500"
      : "border-l-4 border-blue-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={`rounded-sm border border-slate-700/50 bg-slate-900/90 p-6 ${accentClass}`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">AI Threat Analysis</h2>
          </div>
          <p className="text-lg font-semibold leading-relaxed text-sky-200">
            {highlightQuery ? highlightText(oneLiner) : oneLiner}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            This alert indicates a potential unauthorized access attempt based on abnormal login behavior.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <EntityPivot type="ip" value={pipeline?.dashboard?.source_ip ?? "N/A"} />
            <EntityPivot type="user" value={pipeline?.dashboard?.affected_user ?? "N/A"} />
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <Target className="h-4 w-4 text-amber-400" />
        <span className="text-xs uppercase tracking-wider text-slate-400">Intent</span>
        <span className="rounded-sm border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
          {intent}
        </span>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-sky-500" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Threat Narrative</h3>
        </div>
        <div className="rounded-sm border border-slate-700/50 bg-slate-950/50 p-5">
          <p className="text-base leading-relaxed text-slate-200">
            {highlightQuery ? highlightText(shortNarrative) : shortNarrative || highlightedNarrative}
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Why It Matters</h3>
        </div>
        <div className="rounded-sm border border-slate-700/50 bg-slate-950/50 p-5">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
            <li>{attack_vector.split(".")[0] ?? attack_vector}</li>
            {actionBullets.map((step, index) => (
              <li key={`analysis-step-${index}`}>{step}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Impact (CIA)</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Confidentiality", value: impact?.confidentiality, icon: "🔐" },
            { label: "Integrity", value: impact?.integrity, icon: "✓" },
            { label: "Availability", value: impact?.availability, icon: "⚡" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-sm border p-2 ${getImpactTone(item.value ?? "MEDIUM")}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{item.label}</p>
              <p className="mt-1 text-xs font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {showExploreButton && (
        <Link href={`/incident/${eventId}/analysis`} className="block">
          <Button
            variant="default"
            className="w-full gap-2"
          >
            Explore Full AI Analysis
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </motion.div>
  );
}
