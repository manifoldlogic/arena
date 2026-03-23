import { useState, useMemo } from 'react';
import type { CompetitorStanding } from '@arena/schemas';
import type { StreakInfo } from '@/lib/transforms';
import { cn } from '@/lib/utils';

type SortKey = keyof Omit<CompetitorStanding, 'competitor'> | 'competitor' | 'qas';
type SortDir = 'asc' | 'desc';

interface Props {
  standings: CompetitorStanding[];
  streaks?: StreakInfo[];
  className?: string;
}

export function StandingsTable({ standings, streaks, className }: Props) {
  const streakMap = useMemo(() => {
    if (!streaks) return null;
    const map = new Map<string, StreakInfo>();
    for (const s of streaks) map.set(s.competitor, s);
    return map;
  }, [streaks]);
  const hasQAS = standings.some((s) => s.qas != null);
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...standings];
    copy.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [standings, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'competitor' ? 'asc' : 'desc');
    }
  }

  const columns: { key: SortKey; label: string; align?: 'left' | 'right' }[] = [
    { key: 'competitor', label: 'Competitor', align: 'left' },
    { key: 'total', label: 'Total' },
    ...(hasQAS ? [{ key: 'qas' as SortKey, label: 'QAS' }] : []),
    { key: 'avg', label: 'Avg' },
    { key: 'wins', label: 'W' },
    { key: 'ties', label: 'T' },
    { key: 'losses', label: 'L' },
    { key: 'rounds', label: 'Rounds' },
  ];

  if (standings.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border p-8 text-center text-muted-foreground', className)}>
        No standings data available.
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-8">#</th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors',
                  col.align === 'left' ? 'text-left' : 'text-right',
                )}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                )}
              </th>
            ))}
            {streakMap && (
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                Streak
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={s.competitor}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{s.competitor}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold">{s.total}</td>
              {hasQAS && (
                <td className="px-3 py-2 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {s.qas?.toFixed(2) ?? '—'}
                </td>
              )}
              <td className="px-3 py-2 text-right font-mono">{s.avg.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono">{s.wins}</td>
              <td className="px-3 py-2 text-right font-mono">{s.ties}</td>
              <td className="px-3 py-2 text-right font-mono">{s.losses}</td>
              <td className="px-3 py-2 text-right font-mono">{s.rounds}</td>
              {streakMap && (
                <td className="px-3 py-2 text-center">
                  <StreakBadge streak={streakMap.get(s.competitor)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STREAK_STYLES = {
  win: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  loss: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  tie: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
} as const;

const STREAK_PREFIX = { win: 'W', loss: 'L', tie: 'T' } as const;

function StreakBadge({ streak }: { streak?: StreakInfo }) {
  if (!streak || streak.currentStreak === 0) return null;
  const label = `${STREAK_PREFIX[streak.streakType]}${streak.currentStreak}`;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        STREAK_STYLES[streak.streakType],
      )}
    >
      {label}
    </span>
  );
}
