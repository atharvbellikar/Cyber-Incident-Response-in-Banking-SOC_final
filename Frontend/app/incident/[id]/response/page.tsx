"use client";

import CardBlock from "@/components/cards/CardBlock";
import ResponseCard from "@/components/cards/ResponseCard";
import ThreatTopology from "@/components/visuals/ThreatTopology";
import { useIncident } from "../layout";

export default function ResponsePage() {
	const { pipeline } = useIncident();

	return (
		<div className="space-y-8 px-6 py-6">
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

