import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";

type Props = { pipeline: EventPipeline };

export default function AnomalyCard({ pipeline }: Props) {
  return (
    <CardBlock title="Anomaly Detection" tag="Layer 3">
      <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
        {JSON.stringify(pipeline?.anomaly_detection ?? {}, null, 2)}
      </pre>
    </CardBlock>
  );
}
