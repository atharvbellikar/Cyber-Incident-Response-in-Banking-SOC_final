"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import AlertSummaryPanel from "@/components/cards/AlertSummaryPanel";
import IncidentNavTabs from "@/components/shared/IncidentNavTabs";
import { getPipelineById, EventPipeline } from "@/lib/mockData";
import { usePipeline } from "@/hooks/usePipeline";

type IncidentStatus = "Open" | "Investigating" | "Closed";

interface IncidentContextValue {
	incidentId: string;
	pipeline: EventPipeline;
	status: IncidentStatus;
	onStatusChange: (status: IncidentStatus) => void;
	loadState: "loading" | "ok" | "notfound";
}

const IncidentContext = createContext<IncidentContextValue | null>(null);

/**
 * Shared incident data + status for every section (Overview/Analysis/Response/
 * Report/Pipeline). The layout performs a single fetch and exposes it here so
 * each section renders only its body and reads one source of truth.
 */
export function useIncident(): IncidentContextValue {
	const ctx = useContext(IncidentContext);
	if (!ctx) {
		throw new Error("useIncident must be used within the incident layout");
	}
	return ctx;
}

const itemVariants = {
	hidden: { opacity: 0, y: 10 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.3 },
	},
};

export default function IncidentLayout({ children }: { children: React.ReactNode }) {
	const params = useParams<{ id: string }>();
	const incidentId = params?.id ?? "unknown";
	const uploadedPipeline = usePipeline();
	const [apiPipeline, setApiPipeline] = useState<EventPipeline | null>(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [loadState, setLoadState] = useState<"loading" | "ok" | "notfound">("loading");
	const [status, setStatus] = useState<IncidentStatus>("Open");

	const pipeline = useMemo(
		() => apiPipeline || getPipelineById(incidentId, uploadedPipeline),
		[apiPipeline, incidentId, uploadedPipeline]
	);

	useEffect(() => {
		async function fetchIncident() {
			try {
				const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`);
				if (res.ok) {
					setApiPipeline(await res.json());
					setLoadState("ok");
				} else if (res.status === 404) {
					setLoadState("notfound");
				} else {
					setLoadState("ok");
				}
			} catch (err) {
				console.error("Error fetching incident details:", err);
				setLoadState("ok");
			}
		}
		fetchIncident();
	}, [incidentId, refreshTrigger]);

	useEffect(() => {
		if (pipeline) {
			const s = String(pipeline.final_report?.status ?? pipeline.status ?? "Open").toLowerCase();
			if (s === "closed") {
				setStatus("Closed");
			} else if (s === "investigating") {
				setStatus("Investigating");
			} else {
				setStatus("Open");
			}
		}
	}, [pipeline]);

	const handleStatusChange = async (newStatus: IncidentStatus) => {
		setStatus(newStatus);
		try {
			const actionMap: Record<IncidentStatus, string> = {
				Open: "open",
				Investigating: "Investigate",
				Closed: "close",
			};
			const response = await fetch(`/api/incidents/${incidentId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: actionMap[newStatus] }),
			});
			if (response.ok) {
				setRefreshTrigger((prev) => prev + 1);
			}
		} catch (err) {
			console.error("Error updating status:", err);
		}
	};

	const contextValue = useMemo<IncidentContextValue>(
		() => ({ incidentId, pipeline, status, onStatusChange: handleStatusChange, loadState }),
		// handleStatusChange is stable enough for our purposes; status/pipeline drive updates
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[incidentId, pipeline, status, loadState]
	);

	if (loadState === "loading") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-950 font-mono text-xs text-slate-500">
				Loading incident data…
			</div>
		);
	}

	// Genuinely missing incident → clear not-found state (not a fabricated/empty pipeline).
	if (loadState === "notfound" && !apiPipeline) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
				<p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400/80">SENTRA · 404</p>
				<h1 className="mt-2 text-xl font-bold text-slate-100">Incident not found</h1>
				<p className="mt-1 max-w-md text-sm text-slate-400">
					No incident exists with ID <span className="font-mono text-slate-300">{incidentId}</span>. It may have been
					cleared or never ingested.
				</p>
				<a href="/dashboard" className="mt-5 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400">
					Back to Dashboard
				</a>
			</div>
		);
	}

	return (
		<IncidentContext.Provider value={contextValue}>
			<motion.div
				className="min-h-screen bg-slate-950"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				{/* Sticky Header — rendered on every section */}
				<motion.div variants={itemVariants} className="sticky top-0 z-30">
					<AlertSummaryPanel pipeline={pipeline} status={status} onStatusChange={handleStatusChange} />
				</motion.div>

				{/* Navigation Tabs — single consistent section switcher on every section */}
				<motion.div variants={itemVariants}>
					<IncidentNavTabs incidentId={incidentId} />
				</motion.div>

				{children}
			</motion.div>
		</IncidentContext.Provider>
	);
}
