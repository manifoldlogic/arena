import type { RoundResult } from '@arena/schemas';
import { getCompetitorColor } from '@/lib/competitor-colors';

interface ScoreComparisonBarProps {
  results: RoundResult[];
  maxValue?: number;
}

const DIMENSIONS = ['precision', 'recall', 'insight'] as const;

export function ScoreComparisonBar({ results, maxValue = 10 }: ScoreComparisonBarProps) {
  const scored = results.filter((r) => r.total != null);

  if (scored.length === 0) {
    return <p className="text-sm text-muted-foreground">No scored results available.</p>;
  }

  return (
    <div className="space-y-4">
      {DIMENSIONS.map((dim) => (
        <div key={dim}>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {dim}
          </div>
          <div className="space-y-1">
            {scored.map((r) => {
              const value = r[dim] ?? 0;
              const pct = Math.min((value / maxValue) * 100, 100);
              const color = getCompetitorColor(r.competitor);

              return (
                <div key={r.competitor} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 truncate">{r.competitor}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 relative">
                    <div
                      className="h-4 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs font-mono text-foreground w-6 text-right">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Total */}
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Total
        </div>
        <div className="space-y-1">
          {scored.map((r) => {
            const value = r.total ?? 0;
            const pct = Math.min((value / 30) * 100, 100);
            const color = getCompetitorColor(r.competitor);

            return (
              <div key={r.competitor} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 truncate">{r.competitor}</span>
                <div className="flex-1 bg-muted rounded-full h-4 relative">
                  <div
                    className="h-4 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-6 text-right">
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
