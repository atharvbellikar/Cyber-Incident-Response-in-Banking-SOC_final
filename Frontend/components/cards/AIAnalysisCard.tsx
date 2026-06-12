import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";

type Props = { pipeline: EventPipeline };

export default function AIAnalysisCard({ pipeline }: Props) {
  return (
    <CardBlock title="AI Analysis" tag="Layer 9">
      <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
        {JSON.stringify(pipeline?.ai_analysis ?? {}, null, 2)}
      </pre>
    </CardBlock>
  );
}
