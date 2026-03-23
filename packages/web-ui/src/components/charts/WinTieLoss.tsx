import type { WinTieLossEntry } from '@/lib/transforms';
import { cn } from '@/lib/utils';

interface Props {
  data: WinTieLossEntry[];
  className?: string;
}

const WTL_COLORS = {
  wins: 'hsl(var(--signal-ok))',
  ties: 'hsl(var(--signal-warn))',
  losses: 'hsl(var(--signal-alert))',
};

function HorizontalBar({ entry }: { entry: WinTieLossEntry }) {
  const total = entry.wins + entry.ties + entry.losses;
  if (total === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-28 shrink-0 text-right">{entry.competitor}</span>
        <span className="text-xs text-muted-foreground">No rounds</span>
      </div>
    );
  }

  const wPct = (entry.wins / total) * 100;
  const tPct = (entry.ties / total) * 100;
  const lPct = (entry.losses / total) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium w-28 shrink-0 text-right">{entry.competitor}</span>
      <div className="flex h-7 flex-1 overflow-hidden rounded" title={`${entry.wins}W / ${entry.ties}T / ${entry.losses}L`}>
        {entry.wins > 0 && (
          <div
            className="flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${wPct}%`, backgroundColor: WTL_COLORS.wins }}
          >
            {entry.wins}W
          </div>
        )}
        {entry.ties > 0 && (
          <div
            className="flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${tPct}%`, backgroundColor: WTL_COLORS.ties }}
          >
            {entry.ties}T
          </div>
        )}
        {entry.losses > 0 && (
          <div
            className="flex items-center justify-center text-xs font-medium text-white"
            style={{ width: `${lPct}%`, backgroundColor: WTL_COLORS.losses }}
          >
            {entry.losses}L
          </div>
        )}
      </div>
    </div>
  );
}

export function WinTieLoss({ data, className }: Props) {
  if (data.length === 0) {
    return (
      <div className={cn('flex h-48 items-center justify-center rounded-lg border border-border text-muted-foreground', className)}>
        No win/tie/loss data available.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {data.map((entry) => (
        <HorizontalBar key={entry.competitor} entry={entry} />
      ))}
    </div>
  );
}
