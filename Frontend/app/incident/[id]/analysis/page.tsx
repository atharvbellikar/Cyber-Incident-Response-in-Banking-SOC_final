"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPipelineById, EventPipeline } from "@/lib/mockData";
import { usePipeline } from "@/hooks/usePipeline";
import AlertSummaryPanel from "@/components/cards/AlertSummaryPanel";
import CardBlock from "@/components/cards/CardBlock";
import AIAnalysisPanel from "@/components/cards/AIAnalysisPanel";
import ThreatTopology from "@/components/visuals/ThreatTopology";

export default function AnalysisPage() {
	const params = useParams<{ id: string }>();
	const incidentId = params?.id ?? "unknown";
	const uploadedPipeline = usePipeline();
	const [apiPipeline, setApiPipeline] = useState<EventPipeline | null>(null);
	const [loading, setLoading] = useState(true);

	// Fetch the real incident from the API (same pattern as incident detail page)
	useEffect(() => {
		async function fetchIncident() {
			try {
				const res = await fetch(`/api/incidents/${incidentId}`);
				if (res.ok) {
					const data = await res.json();
					setApiPipeline(data);
				}
			} catch (err) {
				console.error("Error fetching incident for analysis page:", err);
			} finally {
				setLoading(false);
			}
		}
		fetchIncident();
	}, [incidentId]);

	// API result takes priority; fall back to uploaded pipeline then mock data
	const pipeline = useMemo(
		() => apiPipeline || getPipelineById(incidentId, uploadedPipeline),
		[apiPipeline, incidentId, uploadedPipeline]
	);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-24 font-mono text-xs text-slate-500">
				Loading incident data…
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<AlertSummaryPanel pipeline={pipeline} status="Investigating" />
			<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
				<div className="space-y-6">
					<AIAnalysisPanel pipeline={pipeline} />
				</div>
				<div className="space-y-6">
					<CardBlock title="Key Indicators" tag="ANALYSIS" severity={pipeline?.dashboard?.severity}>
						<ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-200">
							<li>Intent: {pipeline?.ai_analysis?.intent ?? "N/A"}</li>
							<li>Threat Type: {pipeline?.detection?.threat_type ?? "N/A"}</li>
							<li>Source IP: {pipeline?.dashboard?.source_ip ?? "N/A"}</li>
							<li>Affected User: {pipeline?.dashboard?.affected_user ?? "N/A"}</li>
							<li className="font-mono text-xs text-slate-500">Event ID: {pipeline?.event_id}</li>
						</ul>
					</CardBlock>
					<ThreatTopology pipeline={pipeline} />
					<CardBlock title="Navigation" tag="DEEP DIVE">
						<div className="grid gap-3">
							<Link href={`/incident/${incidentId}`}>
								<Button variant="secondary" className="w-full">Back to Incident</Button>
							</Link>
							<Link href={`/incident/${incidentId}/report`}>
								<Button variant="outline" className="w-full">View Report</Button>
							</Link>
						</div>
					</CardBlock>
				</div>
			</div>

			<details className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-6">
				<summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-slate-400">View Raw AI Analysis Payload</summary>
				<pre className="mt-4 max-h-[320px] overflow-auto rounded-sm border border-slate-700/50 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-500">
					{JSON.stringify(pipeline?.ai_analysis ?? {}, null, 2)}
				</pre>
			</details>
		</div>
	);
}

