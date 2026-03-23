import { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import hypothesesData from '../../../../specs/fault-line-candidates.json';

type Status = 'pending' | 'confirmed' | 'refuted';

interface Hypothesis {
  id: string;
  hypothesis: string;
  terrain: string;
  status: Status;
  candidate_queries: string[];
  target_divergence: number;
  rationale: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400',
  },
  refuted: {
    label: 'Refuted',
    className: 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400',
  },
};

const terrainLabels: Record<string, string> = {
  'point-lookup': 'Point-Lookup',
  'breadth-scan': 'Breadth-Scan',
  constrained: 'Constrained',
};

export function HypothesesPage() {
  const hypotheses = useMemo(
    () => hypothesesData.hypotheses as Hypothesis[],
    [],
  );

  const counts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, refuted: 0 };
    for (const h of hypotheses) c[h.status]++;
    return c;
  }, [hypotheses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fault-Line Hypotheses</h1>
        <p className="text-muted-foreground">
          Predicted divergence points between competitors across terrain types
        </p>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">
          {hypotheses.length} hypotheses
        </span>
        <span className="text-yellow-600 dark:text-yellow-400">
          {counts.pending} pending
        </span>
        <span className="text-green-600 dark:text-green-400">
          {counts.confirmed} confirmed
        </span>
        <span className="text-red-600 dark:text-red-400">
          {counts.refuted} refuted
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {hypotheses.map((h) => {
          const status = statusConfig[h.status];
          return (
            <Card key={h.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="shrink-0 font-mono text-xs">
                    {h.id}
                  </Badge>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
                <CardTitle className="text-base leading-snug">
                  {h.hypothesis}
                </CardTitle>
                <CardDescription>{h.rationale}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Terrain
                  </div>
                  <Badge variant="secondary">
                    {terrainLabels[h.terrain] ?? h.terrain}
                  </Badge>
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Candidate Queries
                  </div>
                  <ul className="space-y-1.5">
                    {h.candidate_queries.map((q, i) => (
                      <li
                        key={i}
                        className="rounded-md bg-muted/50 px-3 py-2 text-sm leading-snug"
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="border-t pt-4 text-sm text-muted-foreground">
                Target divergence: {(h.target_divergence * 100).toFixed(0)}%
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
