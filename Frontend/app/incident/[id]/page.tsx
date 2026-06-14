"use client";

import { motion } from "framer-motion";
import SummaryCard from "@/components/cards/SummaryCard";
import IngestionCard from "@/components/cards/IngestionCard";

import CVSSCard from "@/components/cards/CVSSCard";
import CardBlock from "@/components/cards/CardBlock";
import SeverityGauge from "@/components/visuals/SeverityGauge";

import ThreatFlow from "@/components/visuals/ThreatFlow";
import { useIncident } from "./layout";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 10 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3 },
	},
};

export default function IncidentPage() {
	const { pipeline } = useIncident();

	// ai_analysis.impact holds CIA *levels* ("high"/"low"), which read as nonsense in
	// the attack-chain sentence (e.g. "resulting in low."). Build a real phrase from
	// which dimensions are high-impact.
	const impactDesc = (() => {
		const imp = pipeline?.ai_analysis?.impact as Record<string, unknown> | undefined;
		if (imp) {
			const high = ["confidentiality", "integrity", "availability"].filter(
				(k) => String(imp[k] ?? "").toLowerCase() === "high",
			);
			if (high.length === 3) return "confidentiality, integrity & availability loss";
			if (high.length > 0) return high.join(" & ") + " loss";
		}
		return "potential data exposure";
	})();

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			{/* Main Content: 12-Column Grid */}
			<motion.div
				variants={containerVariants}
				initial="hidden"
				animate="visible"
				className="mx-auto grid max-w-[1600px] grid-cols-12 gap-6 px-6 py-4"
			>
				{/* LEFT PANEL (3 cols) - Ingestion & Logs */}
				<div className="col-span-12 lg:col-span-3 space-y-4">
					<motion.div variants={itemVariants}>
						<IngestionCard pipeline={pipeline} />
					</motion.div>

					<motion.div variants={itemVariants}>
						<CardBlock title="Raw Event Logs" tag="JSON" className="h-fit">
							<pre className="max-h-[400px] overflow-auto rounded-sm border border-slate-700/50 bg-slate-950/70 p-4 font-mono text-[10px] leading-relaxed text-slate-500">
								{JSON.stringify(pipeline?.raw_event ?? {}, null, 2)}
							</pre>
						</CardBlock>
					</motion.div>
				</div>

				{/* CENTER PANEL (6 cols) - Detection, Timeline, Analysis */}
				<div className="col-span-12 lg:col-span-6 space-y-4">
					<motion.div variants={itemVariants}>
						<CardBlock title="Detection" tag="THREAT DETECTION" severity={pipeline?.dashboard?.severity}>
							<div className="space-y-3 text-sm leading-relaxed text-slate-200">
								<p className="font-mono text-xs text-slate-400">Engine: {pipeline?.detection?.triggered_engines?.[0] || "ML-Core"}</p>
								<p>Threat: {pipeline?.detection?.threat_type || "Unknown"}</p>
								<p>Confidence: {Math.round((pipeline?.detection?.confidence ?? 0) * 100)}%</p>
								<p className="text-xs leading-relaxed text-slate-300 mt-2">{pipeline?.detection?.reasoning?.[0] || "No additional reasoning available"}</p>
							</div>
						</CardBlock>
					</motion.div>

					<motion.div variants={itemVariants}>
						<ThreatFlow 
							sourceIp={pipeline?.dashboard?.source_ip}
							threatType={pipeline?.detection?.threat_type}
							affectedUser={pipeline?.dashboard?.affected_user}
							impact={impactDesc}
						/>
					</motion.div>

				</div>

				{/* RIGHT PANEL (3 cols) - Severity, Response, Report */}
				<div className="col-span-12 lg:col-span-3 space-y-4">
					<motion.div variants={itemVariants}>
						<SeverityGauge 
							severity={(pipeline?.dashboard?.severity as "low" | "medium" | "high" | "critical") || "low"}
							score={pipeline?.cvss?.base_score}
						/>
					</motion.div>

					<motion.div variants={itemVariants}>
						<CardBlock title="Report Summary" tag="FINAL REPORT" severity={pipeline?.dashboard?.severity}>
							<div className="space-y-2 text-sm text-slate-200">
								<p>Owner: {pipeline?.final_report?.owner ?? "Unassigned"}</p>
								<p>Status: {pipeline?.final_report?.status ?? "Open"}</p>
								<p className="text-xs leading-relaxed text-slate-400">
									{pipeline?.ai_analysis?.summary ?? "Summary unavailable."}
								</p>
							</div>
						</CardBlock>
					</motion.div>

					<motion.div variants={itemVariants}>
						<CVSSCard pipeline={pipeline} />
					</motion.div>
				</div>
			</motion.div>

			{/* Bottom Collapsible Section */}
			<motion.div variants={itemVariants} className="mx-auto max-w-[1600px] px-6 pb-6">
				<details className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-5">
					<summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-slate-400">View Additional Details</summary>
					<div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
						<SummaryCard pipeline={pipeline} />
						<CardBlock title="CIS Compliance" tag="SECURITY">
							<pre className="max-h-[300px] overflow-auto rounded-sm border border-slate-700/50 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-500">
								{JSON.stringify(pipeline?.cis ?? {}, null, 2)}
							</pre>
						</CardBlock>
					</div>
				</details>
			</motion.div>
		</motion.div>
	);
}

