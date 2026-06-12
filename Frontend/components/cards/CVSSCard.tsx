import { EventPipeline } from "@/lib/mockData";
import CardBlock from "@/components/cards/CardBlock";
import { Badge } from "@/components/ui/badge";
import { severityTone } from "@/lib/utils";

type Props = { pipeline: EventPipeline };

export default function CVSSCard({ pipeline }: Props) {
  return (
    <CardBlock title="CVSS Scoring" tag="Layer 10" severity={pipeline?.cvss?.severity}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Base Score: {(pipeline?.cvss?.base_score ?? 0).toFixed(1)}</Badge>
          <Badge className={severityTone(pipeline?.cvss?.severity)}>{pipeline?.cvss?.severity ?? "low"}</Badge>
        </div>
        <p className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-200 break-all font-mono text-xs leading-relaxed">
          {pipeline?.cvss?.vector_string ?? "No vector string available"}
        </p>
      </div>
    </CardBlock>
  );
}
