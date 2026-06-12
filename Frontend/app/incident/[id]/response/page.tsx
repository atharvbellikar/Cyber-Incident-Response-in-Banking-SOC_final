"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPipelineById } from "@/lib/mockData";
import { usePipeline } from "@/hooks/usePipeline";
import AlertSummaryPanel from "@/components/cards/AlertSummaryPanel";
import CardBlock from "@/components/cards/CardBlock";
import ResponseCard from "@/components/cards/ResponseCard";
import ThreatTopology from "@/components/visuals/ThreatTopology";

export default function ResponsePage() {
	const params = useParams<{ id: string }>();
	const incidentId = params?.id ?? "unknown";
	const uploadedPipeline = usePipeline();
	const pipeline = useMemo(() => getPipelineById(incidentId, uploadedPipeline), [incidentId, uploadedPipeline]);

	return (
		<div className="space-y-8">
			<AlertSummaryPanel pipeline={pipeline} status="Investigating" />
			<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
				<div className="space-y-6">
					<ResponseCard pipeline={pipeline} />
				</div>
				<div className="space-y-6">
					<CardBlock title="Key Indicators" tag="RESPONSE" severity={pipeline?.dashboard?.severity}>
						<ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-200">
							<li>Priority: {pipeline?.response?.priority ?? "P4"}</li>
							<li>Recommended actions: {pipeline?.response?.recommended_actions?.length ?? 0}</li>
							<li className="font-mono text-xs text-slate-500">Event ID: {pipeline?.event_id}</li>
						</ul>
					</CardBlock>
					<ThreatTopology pipeline={pipeline} />
					<CardBlock title="Navigation" tag="DEEP DIVE">
						<div className="grid gap-3">
							<Link href={`/incident/${incidentId}`}>
								<Button variant="secondary" className="w-full">Back to Incident</Button>
							</Link>
							<Link href={`/incident/${incidentId}/analysis`}>
								<Button variant="outline" className="w-full">Back to Analysis</Button>
							</Link>
						</div>
					</CardBlock>
				</div>
			</div>

			<details className="rounded-sm border border-slate-700/50 bg-slate-900/70 p-6">
				<summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-slate-400">View Technical Details</summary>
				<pre className="mt-4 max-h-[320px] overflow-auto rounded-sm border border-slate-700/50 bg-slate-950/70 p-4 font-mono text-xs leading-relaxed text-slate-500">
					{JSON.stringify({ response: pipeline?.response ?? {}, detection: pipeline?.detection ?? {} }, null, 2)}
				</pre>
			</details>
		</div>
	);
}

