"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EventPipeline } from "@/lib/mockData";
import FeatureCard from "@/components/cards/FeatureCard";
import AnomalyCard from "@/components/cards/AnomalyCard";
import ThreatCard from "@/components/cards/ThreatCard";
import IOCCard from "@/components/cards/IOCCard";
import CorrelationCard from "@/components/cards/CorrelationCard";
import CISCard from "@/components/cards/CISCard";
import AIAnalysisCard from "@/components/cards/AIAnalysisCard";
import CVSSCard from "@/components/cards/CVSSCard";
import ReportCard from "@/components/cards/ReportCard";

type Props = { pipeline: EventPipeline };

const sections = [
  { key: "feature", title: "Feature Engineering", render: (pipeline: EventPipeline) => <FeatureCard pipeline={pipeline} /> },
  { key: "anomaly", title: "Anomaly Detection", render: (pipeline: EventPipeline) => <AnomalyCard pipeline={pipeline} /> },
  { key: "threat", title: "Threat Analysis", render: (pipeline: EventPipeline) => <ThreatCard pipeline={pipeline} /> },
  { key: "ioc", title: "IOC Enrichment", render: (pipeline: EventPipeline) => <IOCCard pipeline={pipeline} /> },
  { key: "correlation", title: "Correlation", render: (pipeline: EventPipeline) => <CorrelationCard pipeline={pipeline} /> },
  { key: "cis", title: "CIS", render: (pipeline: EventPipeline) => <CISCard pipeline={pipeline} /> },
  { key: "ai", title: "AI Analysis", render: (pipeline: EventPipeline) => <AIAnalysisCard pipeline={pipeline} /> },
  { key: "cvss", title: "CVSS", render: (pipeline: EventPipeline) => <CVSSCard pipeline={pipeline} /> },
  { key: "report", title: "Final Report", render: (pipeline: EventPipeline) => <ReportCard pipeline={pipeline} /> },
] as const;

export default function IncidentDetailsAccordion({ pipeline }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Accordion Details</p>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Secondary layers, collapsed by default</h2>
        </div>
        <p className="text-xs text-slate-400">Expand only when needed</p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const isOpen = openKey === section.key;

          return (
            <div key={section.key} className="rounded-2xl border border-slate-700/80 bg-slate-900/55 shadow-[0_0_26px_rgba(15,23,42,0.35)]">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : section.key)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition hover:bg-slate-950/40"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Details</p>
                  <h3 className="text-base font-semibold text-slate-100">{section.title}</h3>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${isOpen ? "border-sky-400/50 bg-sky-500/10 text-sky-100" : "border-slate-600 bg-slate-950 text-slate-300"}`}>
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isOpen ? "Collapse" : "Expand"}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key={section.key}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="overflow-hidden px-5 pb-5"
                  >
                    {section.render(pipeline)}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}