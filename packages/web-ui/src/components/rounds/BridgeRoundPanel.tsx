import type { RoundResult } from '@arena/schemas';
import { computeBridgeDeltas } from '@/lib/round-transforms';
import { cn } from '@/lib/utils';

interface BridgeRoundPanelProps {
  results: RoundResult[];
}

const DIMENSIONS = ['precision', 'recall', 'insight'] as const;

export function BridgeRoundPanel({ results }: BridgeRoundPanelProps) {
  const deltas = computeBridgeDeltas(results);

  if (deltas.length === 0) {
    return <p className="text-sm text-muted-foreground">No bridge data available for this round.</p>;
  }

  return (
    <div className="space-y-4">
      {deltas.map((d) => (
        <div key={`${d.roundId}-${d.competitor}`} className="rounded border border-border p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {d.competitor} — {d.codebase}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {DIMENSIONS.map((dim) => {
              const delta = d.deltas[dim];
              const isPositive = delta > 0;
              const isZero = delta === 0;

              return (
                <div key={dim} className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {dim}
                  </div>
                  <div
                    className={cn(
                      'text-lg font-mono font-bold mt-0.5',
                      isZero && 'text-muted-foreground',
                      isPositive && 'text-emerald-600',
                      !isPositive && !isZero && 'text-red-600',
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {delta.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
