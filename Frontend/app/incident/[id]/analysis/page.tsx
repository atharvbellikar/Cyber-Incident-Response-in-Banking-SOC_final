"use client";

import CardBlock from "@/components/cards/CardBlock";
import AIAnalysisPanel from "@/components/cards/AIAnalysisPanel";
import ThreatTopology from "@/components/visuals/ThreatTopology";
import { useIncident } from "../layout";

export default function AnalysisPage() {
	const { pipeline } = useIncident();

	return (
		<div className="space-y-8 px-6 py-6">
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

