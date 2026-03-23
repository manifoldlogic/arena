import type { RoundResult } from '@arena/schemas';
import { getCompetitorColor } from '@/lib/competitor-colors';

interface EfficiencyPanelProps {
  results: RoundResult[];
}

export function EfficiencyPanel({ results }: EfficiencyPanelProps) {
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">No efficiency data available.</p>;
  }

  const maxCalls = Math.max(...results.map((r) => r.calls));
  const maxTime = Math.max(...results.map((r) => r.time_s));

  return (
    <div className="space-y-4">
      {/* Tool calls */}
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Tool Calls
        </div>
        <div className="space-y-1">
          {results.map((r) => {
            const pct = maxCalls > 0 ? (r.calls / maxCalls) * 100 : 0;
            const color = getCompetitorColor(r.competitor);

            return (
              <div key={r.competitor} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 truncate">{r.competitor}</span>
                <div className="flex-1 bg-muted rounded-full h-4">
                  <div
                    className="h-4 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-8 text-right">
                  {r.calls}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wall time */}
      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Wall Time (s)
        </div>
        <div className="space-y-1">
          {results.map((r) => {
            const pct = maxTime > 0 ? (r.time_s / maxTime) * 100 : 0;
            const color = getCompetitorColor(r.competitor);

            return (
              <div key={r.competitor} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 truncate">{r.competitor}</span>
                <div className="flex-1 bg-muted rounded-full h-4">
                  <div
                    className="h-4 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-8 text-right">
                  {r.time_s}s
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
