import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function asList(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export function severityTone(severity: string) {
  const s = String(severity).toLowerCase();
  if (s === "critical") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (s === "high") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (s === "medium") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-sky-500/10 text-sky-400 border-sky-500/20";
}
