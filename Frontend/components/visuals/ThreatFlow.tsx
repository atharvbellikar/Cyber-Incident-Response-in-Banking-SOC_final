"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface ThreatFlowProps {
  sourceIp?: string;
  threatType?: string;
  affectedUser?: string;
  impact?: string;
}

export default function ThreatFlow({ 
  sourceIp = "185.14.22.91", 
  threatType = "Brute Force", 
  affectedUser = "alex.m", 
  impact = "Privilege Escalation" 
}: ThreatFlowProps) {
  const steps = [
    { label: "Source IP", value: sourceIp, color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    { label: "Attack Vector", value: threatType, color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
    { label: "Target User", value: affectedUser, color: "bg-red-500/20 text-red-300 border-red-500/40" },
    { label: "Impact", value: impact, color: "bg-red-600/20 text-red-200 border-red-600/40" },
  ];

  return (
    <motion.div
      className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Threat Flow</h3>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-2 flex-shrink-0"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 + index * 0.1 }}
          >
            <div className={`rounded-sm border p-2 min-w-max ${step.color}`}>
              <p className="text-xs font-semibold uppercase tracking-wider">{step.label}</p>
              <p className="font-mono text-xs mt-1 text-ellipsis overflow-hidden">{step.value}</p>
            </div>

            {index < steps.length - 1 && (
              <motion.div
                className="flex-shrink-0"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 rounded-sm border border-slate-700/50 bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-300">
        <p className="font-semibold text-slate-200 mb-1">Attack Chain</p>
        <p>External attacker ({sourceIp}) launched {threatType} attack against user {affectedUser}, resulting in {impact.toLowerCase()}.</p>
      </div>
    </motion.div>
  );
}
