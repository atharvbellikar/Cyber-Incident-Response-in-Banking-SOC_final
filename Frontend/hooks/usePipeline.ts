"use client";

import { useEffect, useState } from "react";
import { getPipeline } from "@/lib/dataAdapter";
import { EventPipeline } from "@/lib/mockData";

export function usePipeline(): EventPipeline | null {
  const [pipeline, setPipeline] = useState<EventPipeline | null>(null);

  useEffect(() => {
    const data = getPipeline();
    const timer = window.setTimeout(() => {
      setPipeline(data);
    }, 0);

    // future websocket hook
    // socket.on("pipeline_update", (payload) => {
    //   setPipeline(normalizePipeline(payload));
    // });

    return () => window.clearTimeout(timer);
  }, []);

  return pipeline;
}