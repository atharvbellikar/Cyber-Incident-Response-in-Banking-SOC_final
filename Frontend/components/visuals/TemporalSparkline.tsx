import { useMemo } from "react";
import { EventPipeline } from "@/lib/mockData";

type Props = {
  pipeline: EventPipeline;
};

/** Deterministic seeded PRNG — produces same output for same seed string */
function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return function () {
    h ^= h << 13;
    h ^= h >> 7;
    h ^= h << 17;
    h = h >>> 0;
    return h / 4294967296;
  };
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
};

export default function TemporalSparkline({ pipeline }: Props) {
  const { bars, color, label, peak } = useMemo(() => {
    const severity  = String(pipeline?.dashboard?.severity ?? pipeline?.detection?.severity ?? "low").toLowerCase();
    const confidence = (pipeline?.detection?.confidence ?? 0);
    const cvss       = (pipeline?.cvss?.base_score ?? 0);
    const anomaly    = (pipeline?.anomaly_detection?.anomaly_score ?? 0);
    const linked     = Number(pipeline?.correlation_analysis?.linked_events ?? 1);
    const eventId    = pipeline?.event_id ?? "default";
    const threatType = pipeline?.detection?.threat_type ?? "";

    const rand = seededRandom(eventId + threatType);

    // Build a 16-bar sparkline with a realistic attack "surge" shape
    // Different threat types produce characteristically different shapes
    const isBrute   = threatType.toLowerCase().includes("brute") || threatType.toLowerCase().includes("auth");
    const isExfil   = threatType.toLowerCase().includes("exfil") || threatType.toLowerCase().includes("data");
    const isRansom  = threatType.toLowerCase().includes("ransom");
    const isC2      = threatType.toLowerCase().includes("c2") || threatType.toLowerCase().includes("beacon") || threatType.toLowerCase().includes("command");
    const isLateral = threatType.toLowerCase().includes("lateral");
    const isWeb     = threatType.toLowerCase().includes("web") || threatType.toLowerCase().includes("sql") || threatType.toLowerCase().includes("inject");

    const raw: number[] = [];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      let base = rand() * 20 + 8;

      if (isBrute) {
        // Rapid spike at the start then plateau
        base += (t < 0.3 ? t / 0.3 : 1.0) * anomaly * 60;
        base += rand() * 15;
      } else if (isExfil) {
        // Slow ramp-up then sustained high (data leaving)
        base += Math.pow(t, 0.5) * confidence * 55;
        base += rand() * 10;
      } else if (isRansom) {
        // Explosive vertical: everything high very quickly
        base += (t > 0.2 ? 1 : t / 0.2) * anomaly * 75 + rand() * 12;
      } else if (isC2) {
        // Regular heartbeat pattern (sinusoidal beaconing)
        base += Math.abs(Math.sin(t * Math.PI * 3.5 + rand())) * cvss * 7;
        base += confidence * 30;
      } else if (isLateral) {
        // Staircase pattern: each step is a new host
        base += Math.floor(t * 5) * 12 + rand() * 15;
      } else if (isWeb) {
        // Burst pattern with rapid probes
        base += Math.abs(Math.sin(t * Math.PI * 5 + rand() * 2)) * anomaly * 45 + rand() * 20;
      } else {
        // Generic: moderate rise
        base += t * confidence * 50 + rand() * 20;
      }

      // Add a "surge" spike proportional to linked events at the attack's peak
      const surgeMid = isRansom ? 0.25 : isBrute ? 0.15 : 0.6;
      const surge = Math.exp(-Math.pow((t - surgeMid) * 6, 2)) * linked * 1.8;
      raw.push(base + surge);
    }

    // Normalise to [8, 95] range
    const maxVal = Math.max(...raw, 1);
    const minVal = Math.min(...raw);
    const normalised = raw.map((v) => 8 + ((v - minVal) / (maxVal - minVal)) * 87);

    const peakIdx = normalised.indexOf(Math.max(...normalised));

    return {
      bars: normalised,
      color: SEVERITY_COLOR[severity] ?? "#22c55e",
      label: severity.toUpperCase(),
      peak: peakIdx,
    };
  }, [pipeline]);

  const gradientId = `spark-grad-${pipeline?.event_id ?? "x"}`.replace(/[^a-zA-Z0-9-]/g, "");

  return (
    <div className="rounded-sm border border-slate-700/50 bg-slate-950/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Temporal Activity Surge
        </p>
        <span
          className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
        >
          {label}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${bars.length * 10 - 2} 64`}
        preserveAspectRatio="none"
        className="w-full h-14"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <polyline
          points={bars.map((h, i) => `${i * 10},${64 - h * 0.64}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Bars */}
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 10}
            y={64 - h * 0.64}
            width={7}
            height={h * 0.64}
            rx={1}
            fill={i === peak ? color : `url(#${gradientId})`}
            opacity={i === peak ? 0.9 : 0.55}
          />
        ))}

        {/* Peak marker */}
        <circle
          cx={peak * 10 + 3.5}
          cy={64 - bars[peak] * 0.64 - 3}
          r={2.5}
          fill={color}
          opacity={0.95}
        />
      </svg>

      <div className="mt-1.5 flex justify-between text-[9px] text-slate-600 font-mono">
        <span>T-0</span>
        <span>Peak at T+{peak}</span>
        <span>T+{bars.length - 1}</span>
      </div>
    </div>
  );
}