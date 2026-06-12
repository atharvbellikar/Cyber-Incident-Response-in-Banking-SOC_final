import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";

type Props = { pipeline: EventPipeline };

export default function IngestionCard({ pipeline }: Props) {
  return <JsonCard title="Ingestion" data={pipeline?.ingestion} />;
}

function JsonCard({ title, data }: { title: string; data: unknown }) {
  return (
    <CardBlock title={title} tag="Layer 1">
      <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    </CardBlock>
  );
}