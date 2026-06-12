// ─────────────────────────────────────────────────────────────────────────────
// Incident Action Types (legacy: used by the 'action' endpoint for contain/escalate)
// ─────────────────────────────────────────────────────────────────────────────
export type IncidentAction = "true_positive" | "false_positive" | "escalate" | "contain";

export type IncidentActionResponse = {
  incidentId: string;
  action: IncidentAction;
  status: "accepted" | "failed";
  message: string;
  updatedAt: string;
};

export async function updateIncidentStatus(id: string, action: IncidentAction): Promise<IncidentActionResponse> {
  const response = await fetch(`/api/incidents/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  const data = (await response.json()) as IncidentActionResponse | { message?: string };

  if (!response.ok) {
    throw new Error(data?.message ?? "Unable to update incident status.");
  }

  return data as IncidentActionResponse;
}


// ─────────────────────────────────────────────────────────────────────────────
// Analyst Feedback Types (FP/FN/TP/Escalated with reason + notes)
// ─────────────────────────────────────────────────────────────────────────────
export type FeedbackLabel = "true_positive" | "false_positive" | "false_negative" | "escalated";

export type FeedbackReason =
  | "known_good_ip"
  | "authorized_scan"
  | "test_activity"
  | "maintenance_window"
  | "expected_behavior"
  | "missed_detection"
  | "custom";

export const FEEDBACK_REASON_LABELS: Record<FeedbackReason, string> = {
  known_good_ip:       "Known Good IP / Whitelisted Source",
  authorized_scan:     "Authorized Security Scan",
  test_activity:       "Test / Lab Activity",
  maintenance_window:  "Scheduled Maintenance Window",
  expected_behavior:   "Expected User / System Behavior",
  missed_detection:    "Missed Real Threat (False Negative)",
  custom:              "Other (see notes)",
};

export type FeedbackPayload = {
  label: FeedbackLabel;
  reason: FeedbackReason | string;
  analyst_notes: string;
};

export type FeedbackResponse = {
  status: string;
  incidentId: string;
  label: FeedbackLabel;
  reason: string;
  suppression_created: boolean;
  message: string;
};

export async function submitFeedback(id: string, payload: FeedbackPayload): Promise<FeedbackResponse> {
  const response = await fetch(`/api/incidents/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json() as FeedbackResponse | { message?: string };

  if (!response.ok) {
    throw new Error((data as { message?: string })?.message ?? "Failed to submit feedback.");
  }

  return data as FeedbackResponse;
}

export type AnalystFeedbackRecord = {
  feedback_id: number;
  event_id: string;
  label: FeedbackLabel;
  reason: string;
  analyst_notes: string;
  source_ip: string | null;
  threat_type: string | null;
  affected_user: string | null;
  created_at: string;
};

export async function getFeedbackHistory(id: string): Promise<AnalystFeedbackRecord[]> {
  const response = await fetch(`/api/incidents/${id}/feedback`, { cache: "no-store" });
  if (!response.ok) return [];
  return response.json() as Promise<AnalystFeedbackRecord[]>;
}
