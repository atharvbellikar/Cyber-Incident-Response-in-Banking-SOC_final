"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import AlertSummaryPanel from "@/components/cards/AlertSummaryPanel";
import IncidentNavTabs from "@/components/shared/IncidentNavTabs";
import CardBlock from "@/components/cards/CardBlock";
import AttackTimeline from "@/components/visuals/AttackTimeline";
import ThreatFlow from "@/components/visuals/ThreatFlow";
import { getPipelineById } from "@/lib/mockData";
import { usePipeline } from "@/hooks/usePipeline";

const itemVariants = {
	hidden: { opacity: 0, y: 10 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3 },
	},
};

export default function PipelinePage() {
	const params = useParams<{ id: string }>();
	const incidentId = params?.id ?? "unknown";
	const uploadedPipeline = usePipeline();
	const pipeline = useMemo(() => getPipelineById(incidentId, uploadedPipeline), [incidentId, uploadedPipeline]);

	return (
		<motion.div
			className="min-h-screen bg-slate-950"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			{/* Sticky Header */}
			<motion.div variants={itemVariants} className="sticky top-0 z-30">
				<AlertSummaryPanel pipeline={pipeline} status="Open" onStatusChange={() => {}} onAction={() => {}} />
			</motion.div>

			{/* Navigation Tabs */}
			<motion.div variants={itemVariants}>
				<IncidentNavTabs incidentId={incidentId} />
			</motion.div>

			{/* Split Screen View */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3, delay: 0.1 }}
				className="grid grid-cols-1 gap-6 lg:grid-cols-2 px-6 py-6"
			>
				{/* LEFT: Raw JSON */}
				<motion.div variants={itemVariants} className="space-y-4">
					<h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 px-2">Raw Event Data</h2>
					<div className="rounded-sm border border-slate-700/50 bg-slate-950/70 p-5 flex flex-col">
						<div className="flex-1 overflow-auto max-h-[800px]">
							<pre className="font-mono text-[11px] leading-relaxed text-slate-400 break-words whitespace-pre-wrap">
								{JSON.stringify(pipeline?.raw_event ?? {}, null, 2)}
							</pre>
						</div>
						<div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
							<p>Event ID: {pipeline?.event_id}</p>
							<p>Ingestion Time: 2026-04-07T14:32:15Z</p>
						</div>
					</div>

					<motion.div variants={itemVariants}>
						<CardBlock title="Ingestion Metadata" tag="PIPELINE">
							<pre className="max-h-[300px] overflow-auto rounded-sm border border-slate-700/50 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-500">
								{JSON.stringify(pipeline?.ingestion ?? {}, null, 2)}
							</pre>
						</CardBlock>
					</motion.div>

					<motion.div variants={itemVariants}>
						<CardBlock title="Feature Engineering" tag="ML">
							<pre className="max-h-[300px] overflow-auto rounded-sm border border-slate-700/50 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-500">
								{JSON.stringify(pipeline?.feature_engineering ?? {}, null, 2)}
							</pre>
						</CardBlock>
					</motion.div>
				</motion.div>

				{/* RIGHT: Rendered Pipeline Visualization */}
				<motion.div variants={itemVariants} className="space-y-4">
					<h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 px-2">Pipeline Processing</h2>

					<motion.div variants={itemVariants}>
						<CardBlock title="Detection Engine" tag="ANOMALY" severity={pipeline?.dashboard?.severity}>
							<div className="space-y-3 text-sm leading-relaxed text-slate-200">
								<div>
									<p className="text-xs font-semibold text-slate-400 uppercase">Triggered Engines</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{pipeline?.detection?.triggered_engines?.map((engine, i) => (
											<span key={i} className="rounded-sm bg-sky-500/20 px-2 py-1 text-xs text-sky-300 border border-sky-500/40">
												{engine}
											</span>
										)) || <span className="text-slate-400">ML-Core, Threat-Intel</span>}
									</div>
								</div>
								<div className="pt-2 border-t border-slate-700/50">
									<p className="text-xs font-semibold text-slate-400 uppercase">Reasoning</p>
									<ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-slate-300">
										{pipeline?.detection?.reasoning?.map((reason, i) => (
											<li key={i}>{reason}</li>
										)) || <li>Multi-stage anomaly scoring exceeded threshold</li>}
									</ul>
								</div>
							</div>
						</CardBlock>
					</motion.div>

					<motion.div variants={itemVariants}>
						<ThreatFlow 
							sourceIp={pipeline?.dashboard?.source_ip}
							threatType={pipeline?.detection?.threat_type}
							affectedUser={pipeline?.dashboard?.affected_user}
							impact={pipeline?.ai_analysis?.impact?.confidentiality || "Data Exposure"}
						/>
					</motion.div>

					<motion.div variants={itemVariants}>
						<AttackTimeline pipeline={pipeline} />
					</motion.div>

					<motion.div variants={itemVariants}>
						<CardBlock title="AI Analysis" tag="INTELLIGENCE">
							<div className="space-y-3 text-sm leading-relaxed text-slate-200">
								<div>
									<p className="text-xs font-semibold text-slate-400 uppercase">Intent</p>
									<p className="mt-1">{pipeline?.ai_analysis?.intent || "Unauthorized Access Attempt"}</p>
								</div>
								<div className="pt-2 border-t border-slate-700/50">
									<p className="text-xs font-semibold text-slate-400 uppercase">Narrative</p>
									<p className="mt-1 text-xs">{pipeline?.ai_analysis?.narrative?.substring(0, 200) || "No narrative available"}...</p>
								</div>
								<div className="pt-2 border-t border-slate-700/50">
									<p className="text-xs font-semibold text-slate-400 uppercase">Attack Vector</p>
									<p className="mt-1 text-xs">{pipeline?.ai_analysis?.attack_vector || "N/A"}</p>
								</div>
							</div>
						</CardBlock>
					</motion.div>

					<motion.div variants={itemVariants}>
						<CardBlock title="Correlation Analysis" tag="THREAT INTEL">
							<pre className="max-h-[250px] overflow-auto rounded-sm border border-slate-700/50 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-500">
								{JSON.stringify(pipeline?.correlation_analysis ?? { status: "No correlations found" }, null, 2)}
							</pre>
						</CardBlock>
					</motion.div>
				</motion.div>
			</motion.div>

			{/* Full Width Section: Complete Pipeline */}
			<motion.div variants={itemVariants} className="px-6 pb-6">
				<details className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-5">
					<summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-slate-400">
						View Full EventPipeline Object
					</summary>
					<div className="mt-4 rounded-sm border border-slate-700/50 bg-slate-950/70 p-5">
						<pre className="max-h-[600px] overflow-auto font-mono text-xs leading-relaxed text-slate-400 break-words whitespace-pre-wrap">
							{JSON.stringify(pipeline ?? {}, null, 2)}
						</pre>
					</div>
				</details>
			</motion.div>
		</motion.div>
	);
}
