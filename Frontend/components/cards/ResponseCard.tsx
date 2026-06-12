"use client";

import { useState, useEffect, useCallback } from "react";
import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  Siren,
  Lock,
  RotateCcw,
  UserX,
  X,
  ClipboardList,
  Clock,
} from "lucide-react";
import EntityPivot from "@/components/shared/EntityPivot";
import {
  updateIncidentStatus,
  submitFeedback,
  getFeedbackHistory,
  type IncidentAction,
  type FeedbackLabel,
  type FeedbackReason,
  type AnalystFeedbackRecord,
  FEEDBACK_REASON_LABELS,
} from "@/lib/api";

type Props = {
  pipeline: EventPipeline | null;
  onAction?: (action: "Block IP" | "Reset Password" | "Disable User") => void;
  onFalsePositive?: () => void;
  onStatusUpdate?: () => void;
};

// Playbook steps that analysts can mark as done
const PLAYBOOK_STEPS = [
  { id: "block_ip",        icon: Lock,     label: "Block Source IP at Firewall",  action: "Block IP" as const },
  { id: "reset_password",  icon: RotateCcw, label: "Force Password Reset",        action: "Reset Password" as const },
  { id: "disable_user",    icon: UserX,    label: "Disable Affected User Account", action: "Disable User" as const },
] as const;

const LABEL_CONFIG: Record<FeedbackLabel, { color: string; icon: typeof ShieldCheck; label: string }> = {
  true_positive:  { color: "emerald", icon: ShieldCheck, label: "True Positive"  },
  false_positive: { color: "amber",   icon: ShieldX,     label: "False Positive" },
  false_negative: { color: "orange",  icon: AlertTriangle, label: "False Negative" },
  escalated:      { color: "sky",     icon: Siren,       label: "Escalated"      },
};

export default function ResponseCard({ pipeline, onAction, onFalsePositive, onStatusUpdate }: Props) {
  const recommendedActions = pipeline?.response?.recommended_actions?.length
    ? pipeline.response.recommended_actions
    : ["Review event manually for additional context."];
  const containmentSteps = pipeline?.response?.containment_steps?.length
    ? pipeline.response.containment_steps
    : ["Monitor host cautiously before taking action."];

  // Action states
  const [pendingAction, setPendingAction] = useState<IncidentAction | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "warning"; message: string } | null>(null);

  // Feedback modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLabel, setModalLabel] = useState<FeedbackLabel | null>(null);
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | "">("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Analyst feedback history
  const [feedbackHistory, setFeedbackHistory] = useState<AnalystFeedbackRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Current analyst label from history
  const [currentLabel, setCurrentLabel] = useState<FeedbackLabel | null>(null);

  // Suppression indicator
  const isDetectionSuppressed = pipeline?.detection?.suppressed === true ||
    (pipeline?.detection?.label as string) === "suppressed";

  const loadFeedbackHistory = useCallback(async () => {
    if (!pipeline?.event_id) return;
    setLoadingHistory(true);
    try {
      const history = await getFeedbackHistory(pipeline.event_id);
      setFeedbackHistory(history);
      if (history.length > 0) {
        setCurrentLabel(history[0].label as FeedbackLabel);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, [pipeline?.event_id]);

  useEffect(() => {
    loadFeedbackHistory();
  }, [loadFeedbackHistory]);

  const runPlaybookStep = async (stepId: string, action: "Block IP" | "Reset Password" | "Disable User") => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    setFeedback({ tone: "success", message: `✓ ${action} — step logged to playbook.` });
    onAction?.(action);
    setTimeout(() => setFeedback(null), 3000);
  };

  const runBackendAction = async (action: IncidentAction) => {
    if (!pipeline?.event_id || pendingAction) return;
    setPendingAction(action);
    setFeedback(null);
    try {
      const result = await updateIncidentStatus(pipeline.event_id, action);
      setFeedback({ tone: "success", message: result.message ?? `Action '${action}' completed.` });
      onStatusUpdate?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed. Please retry.";
      setFeedback({ tone: "error", message });
    } finally {
      setPendingAction(null);
    }
  };

  const openFeedbackModal = (label: FeedbackLabel) => {
    setModalLabel(label);
    setSelectedReason("");
    setAnalystNotes("");
    setModalOpen(true);
  };

  const submitAnalystFeedback = async () => {
    if (!pipeline?.event_id || !modalLabel || !selectedReason) return;
    setSubmitting(true);
    try {
      const result = await submitFeedback(pipeline.event_id, {
        label: modalLabel,
        reason: selectedReason,
        analyst_notes: analystNotes,
      });
      setCurrentLabel(modalLabel);
      setModalOpen(false);
      const suppNote = result.suppression_created
        ? " A suppression rule has been added — future matching events will be auto-suppressed."
        : "";
      setFeedback({
        tone: "success",
        message: `${result.message}${suppNote}`,
      });
      onStatusUpdate?.();
      if (modalLabel === "false_positive") onFalsePositive?.();
      await loadFeedbackHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit feedback.";
      setFeedback({ tone: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <CardBlock title="Response Playbook" tag="Layer 6" severity={pipeline?.dashboard?.severity}>
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-sky-500/40 text-sky-200">
              Priority {pipeline?.response?.priority ?? "P4"}
            </Badge>



            <EntityPivot type="ip" value={pipeline?.dashboard?.source_ip ?? "N/A"} />
            <EntityPivot type="user" value={pipeline?.dashboard?.affected_user ?? "N/A"} />
          </div>

          {/* Suppression Banner */}
          {isDetectionSuppressed && (
            <div className="flex items-start gap-2 rounded border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs text-purple-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
              <span>
                <strong>Auto-Suppressed.</strong> This event matches a known False Positive rule from your analyst
                feedback history and was automatically suppressed by Layer 2.
              </span>
            </div>
          )}

          {/* Analyst Notes from AI */}
          {pipeline?.response?.analyst_notes && (
            <div className="rounded border border-slate-700/50 bg-slate-950/60 px-3 py-2 text-xs leading-relaxed text-slate-300">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">Analyst Notes</p>
              {pipeline.response.analyst_notes}
            </div>
          )}

          {/* Playbook Checklist */}
          <div className="rounded border border-slate-700/60 bg-slate-950/60 p-3">
            <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-slate-400 flex items-center gap-1.5">
              <ClipboardList className="h-3 w-3" /> Recommended Actions
            </p>
            <ul className="space-y-1.5">
              {recommendedActions.map((item, index) => (
                <li key={`rec-${index}`} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-slate-700/60 bg-slate-950/60 p-3">
            <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-slate-400">Containment Steps</p>
            <ul className="space-y-1.5">
              {containmentSteps.map((item, index) => (
                <li key={`cont-${index}`} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>





          {/* Feedback message */}
          {feedback && (
            <div
              className={`rounded border px-3 py-2 text-xs leading-relaxed ${
                feedback.tone === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : feedback.tone === "warning"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Feedback History */}
          {feedbackHistory.length > 0 && (
            <div className="rounded border border-slate-700/40 bg-slate-950/40 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
                <Clock className="h-3 w-3" /> Classification History
              </p>
              <ul className="space-y-2">
                {feedbackHistory.slice(0, 3).map((record) => {
                  const cfg = LABEL_CONFIG[record.label as FeedbackLabel];
                  return (
                    <li key={record.feedback_id} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full bg-${cfg?.color ?? "slate"}-400`} />
                      <div className="min-w-0">
                        <span className={`font-medium text-${cfg?.color ?? "slate"}-300`}>
                          {cfg?.label ?? record.label}
                        </span>
                        {record.reason && (
                          <span className="ml-1 text-slate-500">— {record.reason.replace(/_/g, " ")}</span>
                        )}
                        {record.analyst_notes && (
                          <p className="mt-0.5 truncate text-slate-500 italic">&ldquo;{record.analyst_notes}&rdquo;</p>
                        )}
                        <p className="text-[10px] text-slate-600">
                          {new Date(record.created_at).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </CardBlock>

      {/* Feedback Modal */}
      {modalOpen && modalLabel && (
        <FeedbackModal
          label={modalLabel}
          selectedReason={selectedReason}
          analystNotes={analystNotes}
          submitting={submitting}
          onReasonChange={setSelectedReason}
          onNotesChange={setAnalystNotes}
          onSubmit={submitAnalystFeedback}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LabelBadge({ label }: { label: FeedbackLabel }) {
  const cfg = LABEL_CONFIG[label];
  const Icon = cfg.icon;
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    amber:   "border-amber-500/40 text-amber-300 bg-amber-500/10",
    orange:  "border-orange-500/40 text-orange-300 bg-orange-500/10",
    sky:     "border-sky-500/40 text-sky-300 bg-sky-500/10",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${colorMap[cfg.color] ?? ""}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

type ModalProps = {
  label: FeedbackLabel;
  selectedReason: FeedbackReason | "";
  analystNotes: string;
  submitting: boolean;
  onReasonChange: (r: FeedbackReason | "") => void;
  onNotesChange: (n: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function FeedbackModal({
  label, selectedReason, analystNotes, submitting,
  onReasonChange, onNotesChange, onSubmit, onClose,
}: ModalProps) {
  const cfg = LABEL_CONFIG[label];
  const Icon = cfg.icon;

  // Filter reasons based on label
  const availableReasons = Object.entries(FEEDBACK_REASON_LABELS).filter(([key]) => {
    if (label === "false_negative") return key === "missed_detection" || key === "custom";
    if (label === "true_positive" || label === "escalated") return key !== "missed_detection";
    return true; // false_positive: all reasons
  }) as [FeedbackReason, string][];

  const colorMap: Record<string, { border: string; bg: string; text: string; btn: string }> = {
    emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-700" },
    amber:   { border: "border-amber-500/30",   bg: "bg-amber-500/10",   text: "text-amber-300",   btn: "bg-amber-600 hover:bg-amber-700" },
    orange:  { border: "border-orange-500/30",  bg: "bg-orange-500/10",  text: "text-orange-300",  btn: "bg-orange-600 hover:bg-orange-700" },
    sky:     { border: "border-sky-500/30",     bg: "bg-sky-500/10",     text: "text-sky-300",     btn: "bg-sky-600 hover:bg-sky-700" },
  };
  const colors = colorMap[cfg.color] ?? colorMap.sky;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative mx-4 w-full max-w-md rounded-lg border bg-slate-900 shadow-2xl ${colors.border}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-5 py-4 ${colors.border}`}>
          <div className="flex items-center gap-2.5">
            <div className={`rounded-md p-1.5 ${colors.bg}`}>
              <Icon className={`h-4 w-4 ${colors.text}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Mark as {cfg.label}
              </p>
              <p className="text-xs text-slate-500">Analyst feedback — this improves future detections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Reason Select */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Reason <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => onReasonChange(e.target.value as FeedbackReason | "")}
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-slate-500 transition-colors"
            >
              <option value="" disabled>Select a reason…</option>
              {availableReasons.map(([key, label_]) => (
                <option key={key} value={key}>{label_}</option>
              ))}
            </select>
          </div>

          {/* Analyst Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Analyst Notes <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={analystNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add context, evidence, or further investigation notes…"
              className="w-full resize-none rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-slate-500 transition-colors"
            />
          </div>

          {/* FP suppression notice */}
          {label === "false_positive" && (
            <div className="flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Marking as <strong>False Positive</strong> will create a suppression rule. Future events 
                from the same source IP or with the same threat pattern will be auto-suppressed in the detection pipeline.
              </span>
            </div>
          )}

          {/* FN notice */}
          {label === "false_negative" && (
            <div className="flex items-start gap-2 rounded border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Marking as <strong>False Negative</strong> flags this as a missed real threat. 
                This will be escalated to investigating status and logged for model review.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 border-t px-5 py-4 ${colors.border}`}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !selectedReason}
            className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${colors.btn}`}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
            {submitting ? "Submitting…" : "Submit Classification"}
          </button>
        </div>
      </div>
    </div>
  );
}
