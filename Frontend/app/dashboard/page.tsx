"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventPipeline, getAllMockPipelines, readSimulatedEvents, clearSimulatedEvents } from "@/lib/mockData";
import { severityTone } from "@/lib/utils";
import { usePipeline } from "@/hooks/usePipeline";
import { 
  AlertOctagon, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Server, 
  Activity, 
  ExternalLink, 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Trash2,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Database
} from "lucide-react";
import TemporalSparkline from "@/components/visuals/TemporalSparkline";
import SeverityGauge from "@/components/visuals/SeverityGauge";
import EventFrequencyBars from "@/components/visuals/EventFrequencyBars";
import BorderGlow from "@/components/visuals/BorderGlow";

type JsonEvent = Record<string, any>;

function normalizeSeverity(value: string | undefined | null): string {
  const normalized = String(value ?? "low").toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "low";
}

function formatIncidentTime(value: string | undefined | null): string {
  if (!value) return "Recent";

  const isoTime = String(value).match(/T(\d{2}:\d{2}:\d{2})/);
  if (isoTime) return isoTime[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";

  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function normalizeEventToPipeline(event: JsonEvent, index: number): EventPipeline {
  const severity = normalizeSeverity(event?.detection?.severity || event?.dashboard?.severity);
  const eventId = event?.event_id || event?.incident_id || `evt-json-${index + 1}`;

  const alertTitle =
    event?.dashboard?.alert_title ||
    event?.summary ||
    event?.ai_analysis?.intent ||
    event?.detection?.threat_type?.replaceAll("_", " ") ||
    "Unknown Alert";

  const affectedUser =
    event?.dashboard?.affected_user ||
    event?.raw_event?.affected_user ||
    event?.raw_event?.user ||
    "anonymous";

  const sourceIp =
    event?.dashboard?.source_ip ||
    event?.raw_event?.source_ip ||
    event?.raw_event?.src_ip ||
    "N/A";

  const aiSummary =
    event?.ai_analysis?.one_liner ||
    event?.ai_analysis?.summary ||
    event?.ai_analysis?.narrative ||
    event?.detection?.reasoning?.[0] ||
    event?.summary ||
    "Investigation context available in incident workspace.";

  const status = String(event?.final_report?.status ?? event?.status ?? "open").toLowerCase();

  return {
    ...(event as EventPipeline),
    event_id: eventId,
    dashboard: {
      ...(event?.dashboard ?? {}),
      alert_title: alertTitle,
      severity,
      affected_user: affectedUser,
      source_ip: sourceIp,
    },
    ai_analysis: {
      ...(event?.ai_analysis ?? {}),
      one_liner: event?.ai_analysis?.one_liner ?? aiSummary,
      summary: event?.ai_analysis?.summary ?? aiSummary,
    },
    final_report: {
      ...(event?.final_report ?? {}),
      status,
    },
  };
}

export default function DashboardPage() {
  const uploadedPipeline = usePipeline();
  const [jsonPipelines, setJsonPipelines] = useState<EventPipeline[]>([]);
  const [simPipelines, setSimPipelines] = useState<EventPipeline[]>([]);
  const [jsonLoaded, setJsonLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedIncidents, setExpandedIncidents] = useState<Record<string, boolean>>({});

  // Load simulated events from localStorage on mount — newest first
  const loadSims = () => {
    const sims = readSimulatedEvents();
    sims.sort((a, b) => {
      const ta = (a as any)?.raw_event?.timestamp ?? "";
      const tb = (b as any)?.raw_event?.timestamp ?? "";
      return tb.localeCompare(ta);
    });
    setSimPipelines(sims);
  };

  useEffect(() => {
    loadSims();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadFrontendOutput() {
      try {
        const res = await fetch("/api/incidents", { cache: "no-store" });

        if (!res.ok) {
          throw new Error(`Failed to fetch incidents list: ${res.status}`);
        }

        const data = await res.json();

        if (!isMounted) return;

        const rawEvents = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];

        const normalized = rawEvents.map((event: JsonEvent, index: number) =>
          normalizeEventToPipeline(event, index)
        );

        setJsonPipelines(normalized);
      } catch (error) {
        console.error("Error loading incidents:", error);
        if (isMounted) {
          setJsonPipelines([]);
        }
      } finally {
        if (isMounted) {
          setJsonLoaded(true);
        }
      }
    }

    loadFrontendOutput();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClearHistory = async () => {
    try {
      await fetch("/api/incidents", { method: "DELETE" });
    } catch (err) {
      console.error("Error clearing database:", err);
    }
    clearSimulatedEvents();
    setSimPipelines([]);
    setJsonPipelines([]);
  };

  const toggleExpand = (id: string) => {
    setExpandedIncidents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const incidents = useMemo(() => {
    const mock = getAllMockPipelines();
    // Priority: simulated events > JSON file events > mock data
    const base = simPipelines.length > 0
      ? simPipelines
      : jsonPipelines.length > 0
        ? jsonPipelines
        : mock;

    let list = base;

    if (uploadedPipeline) {
      list = [uploadedPipeline, ...base.filter((item) => item.event_id !== uploadedPipeline.event_id)];
    }

    return list;
  }, [uploadedPipeline, jsonPipelines, simPipelines]);

  // Apply search query and filters
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // 1. Search Query (matches title, IP, user, host, or threat type)
      const q = searchQuery.toLowerCase();
      const title = (incident.dashboard?.alert_title ?? "").toLowerCase();
      const ip = (incident.dashboard?.source_ip ?? incident.raw_event?.source_ip ?? "").toLowerCase();
      const user = (incident.dashboard?.affected_user ?? incident.raw_event?.affected_user ?? "").toLowerCase();
      const host = (incident.raw_event?.affected_host ?? incident.raw_event?.host ?? "").toLowerCase();
      const threatType = (incident.detection?.threat_type ?? "").toLowerCase();

      const matchesSearch = searchQuery === "" || 
        title.includes(q) || 
        ip.includes(q) || 
        user.includes(q) || 
        host.includes(q) || 
        threatType.includes(q);

      // 2. Severity Filter
      const severity = String(incident.dashboard?.severity ?? "low").toLowerCase();
      const matchesSeverity = severityFilter === "all" || severity === severityFilter;

      // 3. Status Filter
      const status = String(incident.final_report?.status ?? "open").toLowerCase();
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "open" && status !== "closed") || 
        (statusFilter === "closed" && status === "closed");

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, searchQuery, severityFilter, statusFilter]);

  const summary = useMemo(() => {
    const totalIncidents = incidents.length;
    const criticalAlerts = incidents.filter(
      (item) => String(item.dashboard?.severity ?? "low").toLowerCase() === "critical"
    ).length;
    const highAlerts = incidents.filter(
      (item) => String(item.dashboard?.severity ?? "low").toLowerCase() === "high"
    ).length;
    const activeInvestigations = incidents.filter((item) => {
      const status = String(item.final_report?.status ?? "open").toLowerCase();
      return status !== "closed";
    }).length;

    // Collect aggregate IP information
    const uniqueIps = new Set(
      incidents.map((item) => item.dashboard?.source_ip ?? item.raw_event?.source_ip).filter(Boolean)
    );

    return { totalIncidents, criticalAlerts, highAlerts, activeInvestigations, uniqueIpsCount: uniqueIps.size };
  }, [incidents]);

  // Generate metrics for sidebar chart based on log type frequency
  const frequencyMetrics = useMemo(() => {
    const counts = { auth: 0, network: 0, web: 0, endpoint: 0 };
    incidents.forEach((item) => {
      const type = String(item.raw_event?.log_type ?? item.ingestion?.log_family ?? "network").toLowerCase();
      if (type.includes("auth") || type.includes("login")) counts.auth++;
      else if (type.includes("web") || type.includes("http")) counts.web++;
      else if (type.includes("endpoint") || type.includes("process") || type.includes("file")) counts.endpoint++;
      else counts.network++;
    });

    const max = Math.max(counts.auth, counts.network, counts.web, counts.endpoint, 1);

    return [
      { label: "Authentication Logs", value: counts.auth, max, color: "bg-blue-500", icon: "🔐" },
      { label: "Network Telemetry", value: counts.network, max, color: "bg-cyan-500", icon: "🌐" },
      { label: "Web Server Requests", value: counts.web, max, color: "bg-purple-500", icon: "🌐" },
      { label: "Endpoint Process Traces", value: counts.endpoint, max, color: "bg-orange-500", icon: "🖥️" },
    ];
  }, [incidents]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top Title Bar */}
      <BorderGlow borderRadius={12} className="w-full" backgroundColor="rgba(15, 23, 42, 0.4)">
        <section className="rounded-xl border border-slate-800/80 bg-transparent backdrop-blur-md p-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-sky-500/0 via-sky-500/30 to-sky-500/0" />
        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">SENTRA Cyber Operations</h1>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-slate-100 tracking-tight">Active Incident Command Center</h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Real-time multi-layered bank security analytics ingestion, ML-based detection fusion, MITRE mapping, and automated response orchestration.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {simPipelines.length > 0 && (
              <Button
                id="btn-clear-history"
                onClick={handleClearHistory}
                variant="outline"
                className="border-red-900/60 bg-red-950/10 text-red-400 hover:bg-red-900/20 text-xs font-semibold px-3 py-1.5"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear History
              </Button>
            )}
            <Link href="/upload">
              <Button id="btn-upload-lab" className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] text-xs font-bold px-4 py-2">
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Simulation Lab
              </Button>
            </Link>
          </div>
        </div>
        </section>
      </BorderGlow>

      {/* Metrics Row */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          label="Total Incidents Ingested" 
          value={summary.totalIncidents} 
          sub="Accumulated history" 
          icon={<Database className="h-4 w-4 text-slate-400" />} 
          tone="slate" 
        />
        <MetricCard 
          label="Critical Threats Active" 
          value={summary.criticalAlerts} 
          sub="Severe compromise triggers" 
          icon={<AlertOctagon className="h-4 w-4 text-red-400" />} 
          tone="critical" 
        />
        <MetricCard 
          label="Active Security Vectors" 
          value={summary.uniqueIpsCount} 
          sub="Unique offender IPs flagged" 
          icon={<Globe className="h-4 w-4 text-orange-400" />} 
          tone="orange" 
        />
        <MetricCard 
          label="Pending Investigations" 
          value={summary.activeInvestigations} 
          sub="Awaiting analyst resolution" 
          icon={<Activity className="h-4 w-4 text-cyan-400" />} 
          tone="active" 
        />
      </section>

      {/* Primary Workspace Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Hand: Incident Queue & Filters */}
        <section className="lg:col-span-2 space-y-4">
          <BorderGlow borderRadius={12} className="w-full" backgroundColor="rgba(15, 23, 42, 0.3)">
            <div className="rounded-xl border border-slate-800 bg-transparent p-4 space-y-4 shadow-lg">
            
            {/* Search and Filters Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              
              {/* Search */}
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by IP, host, threat, user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Tag Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {/* Severity selectors */}
                <div className="flex rounded-lg border border-slate-800 bg-slate-950/50 p-0.5">
                  {["all", "critical", "high", "medium", "low"].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        severityFilter === sev
                          ? "bg-slate-800 text-slate-100"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                {/* Status selectors */}
                <div className="flex rounded-lg border border-slate-800 bg-slate-950/50 p-0.5">
                  {["all", "open", "closed"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        statusFilter === st
                          ? "bg-slate-800 text-slate-100"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-3">
              <div>
                Showing <span className="text-slate-300 font-semibold">{filteredIncidents.length}</span> of <span className="text-slate-400">{incidents.length}</span> incidents
              </div>
              <div>
                {jsonLoaded ? (
                  <span className="text-emerald-500/80 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Pipeline sync online
                  </span>
                ) : (
                  <span className="text-slate-500">Connecting...</span>
                )}
              </div>
            </div>

          </div>
          </BorderGlow>

          {/* Incident Cards Queue */}
          <div className="space-y-4">
            {filteredIncidents.length === 0 ? (
              <BorderGlow borderRadius={12} className="w-full" backgroundColor="rgba(2, 6, 23, 0.4)">
                <div className="rounded-xl border border-dashed border-slate-800 bg-transparent p-12 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-slate-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-300">All Clear in Banking Operations</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  No active incidents match the current filters. Run simulated cyber attack campaigns inside the Simulation Lab to feed new telemetry streams.
                </p>
                </div>
              </BorderGlow>
            ) : (
              <AnimatePresence>
                {filteredIncidents.map((incident, idx) => {
                  const id = incident.event_id;
                  const isExpanded = !!expandedIncidents[id];
                  const severity = String(incident.dashboard?.severity ?? incident.detection?.severity ?? "low").toLowerCase();
                  const cvssScore = Number(incident.cvss?.base_score ?? incident.dashboard?.cvss_score ?? 0);
                  const isCritical = severity === "critical";

                  return (
                    <BorderGlow 
                      key={id} 
                      borderRadius={12} 
                      animated={isCritical} 
                      glowIntensity={isCritical ? 1.5 : 0.6} 
                      glowColor={isCritical ? "0 80 60" : "200 90 60"}
                      backgroundColor={isExpanded ? "rgba(15, 23, 42, 0.9)" : isCritical ? "rgba(69, 10, 10, 0.15)" : "rgba(15, 23, 42, 0.5)"}
                      className="w-full"
                    >
                      <motion.div
                        layoutId={`card-layout-${id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`rounded-xl border p-5 shadow-xl transition-all duration-300 bg-transparent ${
                        isExpanded
                          ? "border-slate-600 shadow-2xl"
                          : isCritical
                            ? "border-red-900/60 hover:border-red-700/80 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
                            : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Collapsed view header */}
                      <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => toggleExpand(id)}>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${severityTone(severity)} border`}>
                              {severity}
                            </span>
                            <span className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 text-sky-400 border border-slate-700">
                              {incident.response?.priority || "P3"}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">{id}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3" />
                              {formatIncidentTime(incident.raw_event?.timestamp)}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-100 tracking-tight leading-snug">
                            {incident.dashboard?.alert_title || "Security Incident Trigger"}
                          </h3>

                          {/* Quick details subline */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                              User: <span className="text-slate-200">{incident.dashboard?.affected_user || "anonymous"}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Server className="h-3.5 w-3.5 text-slate-500" />
                              Asset: <span className="text-slate-200">{incident.raw_event?.affected_host || incident.raw_event?.host || "workstation"}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 text-slate-500" />
                              IP: <span className="text-slate-200 font-mono">{incident.dashboard?.source_ip || "N/A"}</span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed font-medium line-clamp-1">
                            {incident.ai_analysis?.one_liner || incident.ai_analysis?.summary}
                          </p>
                        </div>

                        {/* Right end score and expander */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">CVSS v3.1</span>
                            <p className={`text-xl font-extrabold leading-none ${
                              cvssScore >= 9.0 ? "text-red-500" : cvssScore >= 7.0 ? "text-orange-500" : cvssScore >= 4.0 ? "text-yellow-500" : "text-sky-400"
                            }`}>
                              {cvssScore.toFixed(1)}
                            </p>
                          </div>
                          <button className="rounded-md border border-slate-700 bg-slate-800/40 p-1 text-slate-400 hover:text-slate-200">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Sci-Fi pipeline dot indicators for collapsed state */}
                      {!isExpanded && (
                        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mr-1">SOC Pipeline Layers:</span>
                            <PipelineDot label="L1 Ingestion" status={incident.ingestion ? "done" : "idle"} color="#06b6d4" />
                            <PipelineDot label="L2 Anomaly" status={incident.anomaly_detection ? "done" : "idle"} color="#8b5cf6" />
                            <PipelineDot label="L3 CIS" status={incident.cis ? "done" : "idle"} color="#f59e0b" />
                            <PipelineDot label="L4 AI" status={incident.ai_analysis ? "done" : "idle"} color="#ec4899" />
                            <PipelineDot label="L5 CVSS" status={incident.cvss ? "done" : "idle"} color="#14b8a6" />
                            <PipelineDot label="L6 Response" status={incident.response ? "done" : "idle"} color="#22c55e" />
                          </div>
                          
                          <Link href={`/incident/${id}`}>
                            <span className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-0.5">
                              Workspace <ExternalLink className="h-3 w-3" />
                            </span>
                          </Link>
                        </div>
                      )}

                      {/* Expanded View detailing all SOC layer features */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            className="overflow-hidden mt-4 pt-4 border-t border-slate-800 space-y-5"
                          >
                            {/* Columns Layout */}
                            <div className="grid gap-5 md:grid-cols-3">
                              
                              {/* Layer 1 & 2: Telemetry Ingestion, Feature Engineering & Anomaly */}
                              <div className="rounded-lg border border-slate-800/60 bg-slate-950/50 p-4 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                  <Terminal className="h-3.5 w-3.5" /> Telemetry & Anomalies
                                </h4>

                                <div className="space-y-3.5 text-xs">
                                  {/* Ingestion Info */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Log Source Ingestor</span>
                                    <p className="text-slate-300 font-semibold">{incident.ingestion?.source || "Standard Collector"}</p>
                                    {incident.ingestion?.integrity_hash && (
                                      <p className="font-mono text-[9px] text-slate-500 mt-0.5">Hash: {incident.ingestion.integrity_hash}</p>
                                    )}
                                  </div>

                                  {/* Feature engineering metrics */}
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Engineered Features (L1)</span>
                                    
                                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                                      <div className="bg-slate-900 p-1.5 rounded">
                                        <span className="text-slate-500 block">Off-Hours Run</span>
                                        <span className={incident.feature_engineering?.temporal_features?.is_off_hours ? "text-orange-400 font-bold" : "text-slate-400"}>
                                          {incident.feature_engineering?.temporal_features?.is_off_hours ? "Yes" : "No"}
                                        </span>
                                      </div>
                                      <div className="bg-slate-900 p-1.5 rounded">
                                        <span className="text-slate-500 block">Deviation score</span>
                                        <span className="text-slate-300 font-bold">
                                          {(incident.feature_engineering?.behavioral_features?.deviation_score || 0.85).toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="bg-slate-900 p-1.5 rounded col-span-2">
                                        <span className="text-slate-500 block">Traffic Direction</span>
                                        <span className="text-slate-300 font-bold uppercase">
                                          {incident.feature_engineering?.network_traffic_features?.traffic_direction || "North-South"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Anomaly model details */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Anomaly Model (L2)</span>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-slate-300">{incident.anomaly_detection?.model || "AutoEncoder-ML"}</span>
                                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20 py-0 text-[9px]">
                                        Score: {(incident.anomaly_detection?.anomaly_score || 0.92).toFixed(2)}
                                      </Badge>
                                    </div>
                                    {incident.anomaly_detection?.baseline_deviation && (
                                      <p className="text-[10px] text-red-400/80 mt-1">
                                        ⚠️ Baseline Deviation: {incident.anomaly_detection.baseline_deviation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Layer 3 & 4: CIS Benchmarks & AI Attack Modeling */}
                              <div className="rounded-lg border border-slate-800/60 bg-slate-950/50 p-4 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                  <Brain className="h-3.5 w-3.5" /> Threats & Alignment
                                </h4>

                                <div className="space-y-3.5 text-xs">
                                  {/* MITRE Mapping */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">MITRE TTP Objectives (L2)</span>
                                    <div className="flex flex-wrap gap-1">
                                      {(incident.threat_analysis?.mitre_tactics || ["Execution"]).map((t: string) => (
                                        <span key={t} className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 border border-slate-800">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* CIS Compliance */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">CIS Security Framework (L3)</span>
                                    <div className="flex gap-2 items-center">
                                      <div className="h-6 w-6 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-[10px]">
                                        CIS
                                      </div>
                                      <div>
                                        <p className="text-slate-300 font-semibold">{incident.cis?.title || "Account Management & Control"}</p>
                                        <p className="text-[10px] text-slate-500">Benchmark ID: {incident.cis?.benchmark_id || incident.cis?.controls_impacted?.[0] || "CIS-5"}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* AI Threat Classification */}
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">AI Intent Matrix (L4)</span>
                                    <p className="text-slate-300 font-semibold">{incident.ai_analysis?.intent || "Malicious Intrusion Attempt"}</p>
                                    <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] text-center font-mono uppercase">
                                      <div className="bg-slate-900 p-1 rounded">
                                        <span className="text-slate-500 block">Conf.</span>
                                        <span className="text-red-400 font-bold">{incident.ai_analysis?.impact?.confidentiality?.split(" ")[0] || "HIGH"}</span>
                                      </div>
                                      <div className="bg-slate-900 p-1 rounded">
                                        <span className="text-slate-500 block">Integ.</span>
                                        <span className="text-red-400 font-bold">{incident.ai_analysis?.impact?.integrity?.split(" ")[0] || "HIGH"}</span>
                                      </div>
                                      <div className="bg-slate-900 p-1 rounded">
                                        <span className="text-slate-500 block">Avail.</span>
                                        <span className="text-yellow-400 font-bold">{incident.ai_analysis?.impact?.availability?.split(" ")[0] || "MED"}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Layer 5 & 6: CVSS Vector, Response playbooks, and Action button */}
                              <div className="rounded-lg border border-slate-800/60 bg-slate-950/50 p-4 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                  <ShieldCheck className="h-3.5 w-3.5" /> CVSS & Response Playbook
                                </h4>

                                <div className="space-y-3.5 text-xs">
                                  {/* CVSS score and vector */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">CVSS Base Vector</span>
                                    <p className="font-mono text-[9px] text-slate-300 mt-1 bg-slate-900 p-1.5 rounded select-all">
                                      {incident.cvss?.vector_string || "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"}
                                    </p>
                                  </div>

                                  {/* Immediate Containment Actions */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Recommended Containment (L6)</span>
                                    <ul className="space-y-1 text-slate-300">
                                      {(incident.response?.containment_steps || incident.ai_analysis?.next_steps?.slice(0, 2) || ["Network isolate asset immediately"]).map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-red-400 mt-0.5">•</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Action items */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Next Playbook Actions</span>
                                    <ul className="space-y-1 text-slate-400">
                                      {(incident.response?.recommended_actions || ["Notify corporate security operations", "Rotate user credentials"]).slice(0, 2).map((act, idx) => (
                                        <li key={idx} className="flex items-start gap-1 text-[11px]">
                                          <span className="text-sky-400">•</span>
                                          <span className="line-clamp-1">{act}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>

                            </div>

                            {/* Full AI Narrative Paragraph */}
                            <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-4 space-y-1.5">
                              <span className="text-[10px] text-sky-400 uppercase font-extrabold tracking-widest flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 fill-current" /> AI Security Narrative & Incident Reconstruction
                              </span>
                              <p className="text-xs text-slate-300 leading-relaxed text-justify font-medium">
                                {incident.ai_analysis?.narrative || incident.summary}
                              </p>
                            </div>

                            {/* Sparkline and Link button */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                              <div className="w-full sm:flex-1">
                                <TemporalSparkline pipeline={incident} />
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                                <Link href={`/incident/${id}`} className="w-full sm:w-auto">
                                  <Button id={`btn-workspace-${id}`} className="w-full sm:w-auto bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 font-bold px-4 py-2.5 text-xs">
                                    Open Incident Workspace
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  </BorderGlow>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Right Hand Side: Threat Intelligence & Telemetry Summary */}
        <section className="space-y-6">
          
          {/* Severity distribution summary */}
          <BorderGlow borderRadius={12} className="w-full" backgroundColor="rgba(15, 23, 42, 0.4)">
            <div className="rounded-xl border border-slate-800 bg-transparent p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Activity className="h-4 w-4 text-cyan-400" /> Active Threat Risk Meter
            </h3>
            
            <div className="space-y-3 pt-1">
              <SeverityRow label="Critical Risks" count={summary.criticalAlerts} total={summary.totalIncidents} color="bg-red-600" />
              <SeverityRow label="High Risks" count={summary.highAlerts} total={summary.totalIncidents} color="bg-orange-500" />
              <SeverityRow label="Medium Risks" count={summary.totalIncidents - summary.criticalAlerts - summary.highAlerts} total={summary.totalIncidents} color="bg-yellow-500" />
            </div>

            <div className="mt-2 text-center text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 font-mono">
              RISK STATE: {summary.criticalAlerts > 0 ? "🟥 EXTREME ACTIONS REQUIRED" : "🟨 COMPROMISES PENDING REVIEW"}
            </div>
            </div>
          </BorderGlow>

          {/* Event Log Frequency Bar Chart */}
          <BorderGlow borderRadius={12} className="w-full">
            <div className="shadow-xl">
              <EventFrequencyBars metrics={frequencyMetrics} />
            </div>
          </BorderGlow>

        </section>

      </div>
    </motion.div>
  );
}

/* Metric count card component */
function MetricCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  tone: "slate" | "critical" | "orange" | "active";
}) {
  const toneMap = {
    slate: "border-slate-800/80 bg-slate-900/40 text-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]",
    critical: "border-red-950/60 bg-red-950/10 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.05)]",
    orange: "border-orange-950/60 bg-orange-950/10 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.05)]",
    active: "border-cyan-950/60 bg-cyan-950/10 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.05)]",
  };

  return (
    <BorderGlow borderRadius={12} glowColor={tone === "critical" ? "0 80 60" : tone === "orange" ? "30 90 60" : "200 90 60"} className="w-full h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-5 flex items-start justify-between gap-3 ${toneMap[tone]}`}
    >
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
        <p className="mt-2 text-3xl font-black leading-none font-mono tracking-tight">{value}</p>
        <p className="mt-1 text-[10px] text-slate-500 font-medium">{sub}</p>
      </div>
      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2 shrink-0">
        {icon}
      </div>
      </motion.div>
    </BorderGlow>
  );
}

/* Severity gauge progress row */
function SeverityRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center justify-between text-slate-300 font-semibold">
        <span>{label}</span>
        <span className="font-mono text-slate-400">{count} ({Math.round(pct)}%)</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* Little inline dot that shows status of pipeline stages */
function PipelineDot({ label, status, color }: { label: string; status: "idle" | "done"; color: string }) {
  return (
    <div 
      className="group relative h-2.5 w-2.5 rounded-full border border-slate-950 flex items-center justify-center shrink-0 cursor-help"
      style={{ 
        backgroundColor: status === "done" ? color : "#1e293b",
        boxShadow: status === "done" ? `0 0 6px ${color}` : "none"
      }}
    >
      {/* Tooltip on hover */}
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 text-slate-200 text-[8px] uppercase tracking-wider font-bold rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-200 z-55 pointer-events-none">
        {label}: {status.toUpperCase()}
      </span>
    </div>
  );
}
