/**
 * Divergence drought indicator banner.
 *
 * Displays a contextual message above the DivergenceHeatmap indicating
 * whether recent queries are separating competitor strategies.
 */
import type { DiscriminationResult } from '@/lib/analytics';

const CONFIG: Record<
  DiscriminationResult['status'],
  { message: string; className: string }
> = {
  drought: {
    message: 'Current queries are not separating these strategies',
    className: 'border-muted bg-muted/50 text-muted-foreground',
  },
  emerging: {
    message: 'Discrimination improving',
    className: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  signal_found: {
    message: 'Strong divergence detected',
    className: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400',
  },
};

interface Props {
  data: DiscriminationResult;
}

export function DroughtIndicator({ data }: Props) {
  const { message, className } = CONFIG[data.status];

  return (
    <div
      className={`rounded-md border px-4 py-2 text-sm font-medium ${className}`}
      role="status"
      aria-live="polite"
    >
      {message}
      {data.status === 'drought' && data.streak > 0 && (
        <span className="ml-2 font-normal opacity-75">
          ({data.streak} round{data.streak !== 1 ? 's' : ''} without signal)
        </span>
      )}
      {data.status === 'signal_found' && data.lastSignalRound && (
        <span className="ml-2 font-normal opacity-75">
          (latest: {data.lastSignalRound})
        </span>
      )}
    </div>
  );
}
