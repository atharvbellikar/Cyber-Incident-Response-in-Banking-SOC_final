"use client";

import { useEffect, useState } from "react";

type EventItem = {
  summary?: string;
  detection?: {
    threat_type?: string;
    severity?: string;
  };
  cis?: {
    title?: string;
  };
  ai_analysis?: {
    intent?: string;
    summary?: string;
    narrative?: string;
  };
};

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/frontend_output.json");
        const data = await res.json();

        console.log("DATA:", data);

        if (Array.isArray(data)) {
          setEvents(data as EventItem[]);
        } else if (data.events && Array.isArray(data.events)) {
          setEvents(data.events as EventItem[]);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Error loading JSON:", err);
      }
    }

    loadData();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>SOC Dashboard</h1>

      {events.length === 0 && <p>No data found</p>}

      {events.map((event, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <h3>{event.summary || "No Summary"}</h3>

          <p><b>Threat:</b> {event.detection?.threat_type || "N/A"}</p>
          <p><b>Severity:</b> {event.detection?.severity || "N/A"}</p>
          <p><b>CIS:</b> {event.cis?.title || "N/A"}</p>

          <p><b>Intent:</b> {event.ai_analysis?.intent || "N/A"}</p>
          <p><b>AI Summary:</b> {event.ai_analysis?.summary || "N/A"}</p>
          <p><b>Narrative:</b> {event.ai_analysis?.narrative || "N/A"}</p>
        </div>
      ))}
    </div>
  );
}