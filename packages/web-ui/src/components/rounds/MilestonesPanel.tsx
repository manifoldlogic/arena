import { useMemo } from 'react';
import type { RoundResult } from '@arena/schemas';
import { computeMilestones } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface MilestonesPanelProps {
  results: RoundResult[];
}

export function MilestonesPanel({ results }: MilestonesPanelProps) {
  const milestones = useMemo(() => computeMilestones(results), [results]);

  const achieved = milestones.filter((m) => m.achieved).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Research Milestones</h4>
        <span className="text-xs text-muted-foreground">
          {achieved}/{milestones.length} achieved
        </span>
      </div>
      <ul className="space-y-2" role="list">
        {milestones.map((m) => (
          <li
            key={m.id}
            className={cn(
              'flex items-start gap-3 rounded border p-3 text-sm',
              m.achieved
                ? 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30'
                : 'border-border bg-card',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs',
                m.achieved
                  ? 'bg-green-600 text-white dark:bg-green-500'
                  : 'border border-muted-foreground/30 text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {m.achieved ? '\u2713' : ''}
            </span>
            <div className="min-w-0">
              <div
                className={cn(
                  'font-medium',
                  m.achieved ? 'text-green-900 dark:text-green-300' : 'text-foreground',
                )}
              >
                {m.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
              {m.achieved && m.achievedRound && (
                <div className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Achieved in {m.achievedRound}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
