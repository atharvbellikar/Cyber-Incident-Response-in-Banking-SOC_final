import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function severityTone(severity: string | undefined) {
  const value = severity?.toLowerCase();
  if (value === "critical") return "bg-red-600/20 text-red-300 border-red-500/40";
  if (value === "high") return "bg-orange-500/20 text-orange-300 border-orange-400/40";
  if (value === "medium") return "bg-yellow-500/20 text-yellow-200 border-yellow-400/40";
  return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
}

export function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}