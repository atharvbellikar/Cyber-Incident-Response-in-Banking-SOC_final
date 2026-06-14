import { EventPipeline, normalizePipeline } from "@/lib/mockData";

let cache: EventPipeline | null = null;

export function getPipeline(): EventPipeline | null {
  if (cache) return cache;

  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("pipeline");
  if (!raw) return null;

  try {
    cache = normalizePipeline(JSON.parse(raw));
  } catch {
    return null;
  }

  return cache;
}