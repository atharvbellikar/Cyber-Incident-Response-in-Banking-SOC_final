import { EventPipeline, normalizePipeline } from "@/lib/mockData";

let cache: EventPipeline | null = null;

export function getPipeline(): EventPipeline | null {
  if (cache) return cache;

  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("pipeline");
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  cache = normalizePipeline(parsed);

  return cache;
}

export function setPipelineCache(pipeline: EventPipeline): void {
  cache = pipeline;

  if (typeof window !== "undefined") {
    localStorage.setItem("pipeline", JSON.stringify(pipeline));
  }
}

export async function fetchPipelineFromAPI(): Promise<EventPipeline> {
  const res = await fetch("/api/pipeline");
  const data = await res.json();

  return normalizePipeline(data);
}