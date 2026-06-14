"use client";

import { EventPipeline } from "@/lib/mockData";
import { formatTimestamp } from "@/lib/format";

interface AIAnalysisPanelProps {
  pipeline: EventPipeline | null;
}

function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
  const display = value !== undefined && value !== null && String(value).trim() !== ""
    ? String(value)
    : "\u2014"; // em dash for missing
  return (
    <tr>
      <td className="py-1 pr-4 text-slate-500">{label}</td>
      <td className={`py-1 font-semibold ${display === "\u2014" ? "text-slate-600" : "text-slate-300"}`}>
        {display}
      </td>
    </tr>
  );
}

export default function AIAnalysisPanel({ pipeline }: AIAnalysisPanelProps) {
  const cis  = (pipeline?.cis  ?? {}) as Record<string, string>;
  const cvss = (pipeline?.cvss ?? {}) as Record<string, any>;
  const ai   = (pipeline?.ai_analysis ?? {}) as Record<string, any>;
  const raw  = (pipeline?.raw_event   ?? {}) as Record<string, any>;
  const ing  = (pipeline?.ingestion   ?? {}) as Record<string, any>;

  // Backend fills "unknown"/"anonymous" placeholders for fields it couldn't
  // resolve; treat those (and blanks) as missing so we show an em-dash instead.
  const clean = (v: any) =>
    v != null && !["", "unknown", "anonymous"].includes(String(v).trim().toLowerCase()) ? v : null;

  const eventId   = pipeline?.event_id ?? null;
  // Real backend time lives on ingestion.timestamp; raw_event.timestamp is null
  // for several log shapes. formatTimestamp renders an em-dash when null.
  const timestamp = ing.timestamp ?? raw.timestamp ?? null;
  const sourceIp  = clean(ing.source_ip) ?? clean(raw.source_ip) ?? clean(pipeline?.dashboard?.source_ip) ?? null;
  const user      = clean(pipeline?.dashboard?.affected_user) ?? clean(raw.affected_user) ?? clean(raw.user) ?? null;
  const host      = clean(raw.affected_host) ?? clean(raw.host) ?? null;

  return (
    <div className="rounded-none border border-slate-700 bg-slate-900 text-xs font-mono text-slate-200">
      {/* Header — identifies which incident this is */}
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
          SENTRA Advisor AI Agent
        </h2>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Targeted security orchestration output
        </p>
      </div>

      {/* Incident context strip */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-2">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Incident Context</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <span className="text-slate-500">Event ID</span>
          <span className="text-slate-300">{eventId ?? "—"}</span>
          <span className="text-slate-500">Timestamp</span>
          <span className="text-slate-300">{formatTimestamp(timestamp)}</span>
          <span className="text-slate-500">Source IP</span>
          <span className="text-slate-300">{sourceIp ?? "—"}</span>
          <span className="text-slate-500">Affected User</span>
          <span className="text-slate-300">{user ?? "—"}</span>
          <span className="text-slate-500">Host</span>
          <span className="text-slate-300">{host ?? "—"}</span>
        </div>
      </div>

      <div className="space-y-0 divide-y divide-slate-800">
        {/* CIS Recommendation */}
        <div className="px-4 py-3">
          <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2">
            1 · CIS-Based Remediation Recommendation
          </h3>
          <div className="bg-slate-950 p-3 border border-slate-800">
            <p className="font-semibold text-amber-400">
              {cis.benchmark_id
                ? `${cis.benchmark_id}${cis.title ? " — " + cis.title : ""}`
                : "—"}
            </p>
            <p className="mt-2 text-slate-300 leading-relaxed">
              {cis.remediation ?? "—"}
            </p>
          </div>
        </div>

        {/* CVSS Metrics */}
        <div className="px-4 py-3">
          <h3 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2">
            2 · CVSS Metrics Forwarded to Layer 5 (Scoring)
          </h3>
          <div className="bg-slate-950 p-3 border border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-1">Metric</th>
                  <th className="pb-1">Value from AI Agent</th>
                </tr>
              </thead>
              <tbody>
                <Field label="Attack Vector"        value={ai.attack_vector} />
                <Field label="Attack Complexity"     value={ai.attack_complexity} />
                <Field label="Privileges Required"   value={ai.privileges_required} />
                <Field label="User Interaction"      value={ai.user_interaction} />
                <Field label="Scope"                 value={ai.scope} />
                <Field label="Confidentiality Impact" value={ai.impact?.confidentiality} />
                <Field label="Integrity Impact"      value={ai.impact?.integrity} />
                <Field label="Availability Impact"   value={ai.impact?.availability} />
              </tbody>
            </table>

            {/* Resulting score from Layer 5 */}
            <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Layer 5 CVSS Base Score:</span>
              <span className="font-bold text-red-400 text-sm">
                {cvss.base_score !== undefined && cvss.base_score !== null
                  ? `${Number(cvss.base_score).toFixed(1)} (${cvss.severity ?? "unknown"})`
                  : "—"}
              </span>
            </div>
            {cvss.vector_string ? (
              <p className="mt-1 text-[10px] text-slate-600 font-mono break-all">
                {cvss.vector_string}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

