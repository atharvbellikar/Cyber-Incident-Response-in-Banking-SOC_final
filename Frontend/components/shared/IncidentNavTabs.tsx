"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IncidentNavTabsProps {
  incidentId: string;
}

const tabs = [
  { label: "Overview", path: "" },
  { label: "Analysis", path: "/analysis" },
  { label: "Response", path: "/response" },
  { label: "Report", path: "/report" },
  { label: "Pipeline", path: "/pipeline" },
];

export default function IncidentNavTabs({ incidentId }: IncidentNavTabsProps) {
  const pathname = usePathname();

  return (
    <motion.div
      className="border-b border-slate-700/50 bg-slate-900/40 px-6 py-0"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <nav className="flex gap-1">
        {tabs.map((tab) => {
          const href = `/incident/${incidentId}${tab.path}`;
          const isActive = pathname === href;

          return (
            <Link key={tab.path} href={href}>
              <motion.button
                className={cn(
                  "relative px-4 py-3 text-sm font-semibold uppercase tracking-widest transition",
                  isActive
                    ? "text-slate-100"
                    : "text-slate-400 hover:text-slate-300"
                )}
                whileHover={{ color: "#e2e8f0" }}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-sky-600"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            </Link>
          );
        })}
      </nav>
    </motion.div>
  );
}
