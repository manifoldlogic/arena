import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CompetitorStanding } from '@arena/schemas';
import type { StreakInfo } from '@/lib/transforms';
import { cn } from '@/lib/utils';

type SortKey = keyof Omit<CompetitorStanding, 'competitor'> | 'competitor' | 'qas';
type SortDir = 'asc' | 'desc';

interface Props {
  standings: CompetitorStanding[];
  streaks?: StreakInfo[];
  totalRounds?: number;
  className?: string;
}

/** Compute rank map (1-indexed) from sorted standings by avg desc */
function buildRankMap(standings: CompetitorStanding[]): Map<string, number> {
  const sorted = [...standings].sort((a, b) => b.avg - a.avg || b.total - a.total);
  const map = new Map<string, number>();
  sorted.forEach((s, i) => map.set(s.competitor, i + 1));
  return map;
}

export function StandingsTable({ standings, streaks, totalRounds, className }: Props) {
  const streakMap = useMemo(() => {
    if (!streaks) return null;
    const map = new Map<string, StreakInfo>();
    for (const s of streaks) map.set(s.competitor, s);
    return map;
  }, [streaks]);
  const hasQAS = standings.some((s) => s.qas != null);
  const [sortKey, setSortKey] = useState<SortKey>('avg');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Track rank changes across data updates
  const prevRankMap = useRef<Map<string, number>>(new Map());
  const currentRankMap = useMemo(() => buildRankMap(standings), [standings]);
  const rankDelta = useMemo(() => {
    const delta = new Map<string, number>();
    if (prevRankMap.current.size > 0) {
      for (const [competitor, currentRank] of currentRankMap) {
        const prevRank = prevRankMap.current.get(competitor);
        if (prevRank != null && prevRank !== currentRank) {
          // Positive = moved up (lower rank number), negative = moved down
          delta.set(competitor, prevRank - currentRank);
        }
      }
    }
    return delta;
  }, [currentRankMap]);

  // Update prev rank map after render
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    prevRankMap.current = currentRankMap;
    setDataVersion((v) => v + 1);
  }, [currentRankMap]);

  const sorted = useMemo(() => {
    const copy = [...standings];
    copy.sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? 0;
      let bVal: string | number = b[sortKey] ?? 0;
      // QAS sorts by per-round average, not total
      if (sortKey === 'qas') {
        aVal = a.qas != null && a.rounds > 0 ? a.qas / a.rounds : 0;
        bVal = b.qas != null && b.rounds > 0 ? b.qas / b.rounds : 0;
      }
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

  const columns: { key: SortKey; label: string; align?: 'left' | 'right'; primary?: boolean; muted?: boolean }[] = [
    { key: 'competitor', label: 'Competitor', align: 'left' },
    { key: 'avg', label: 'Avg', primary: true },
    ...(hasQAS ? [{ key: 'qas' as SortKey, label: 'QAS' }] : []),
    { key: 'total', label: 'Total', muted: true },
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
          {sorted.map((s, i) => {
            const delta = rankDelta.get(s.competitor);
            return (
              <motion.tr
                key={s.competitor}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                initial={false}
                animate={{
                  backgroundColor: [
                    'hsl(var(--accent) / 0.35)',
                    'hsl(var(--accent) / 0)',
                  ],
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              >
                <td className="px-3 py-2 text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {i + 1}
                    {delta != null && <RankChangeBadge delta={delta} />}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{s.competitor}</td>
                <td className="px-3 py-2 text-right font-mono text-base font-bold">{s.avg.toFixed(2)}</td>
                {hasQAS && (
                  <td className="px-3 py-2 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {s.qas != null && s.rounds > 0 ? (s.qas / s.rounds).toFixed(2) : '—'}
                  </td>
                )}
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.total}</td>
                <td className="px-3 py-2 text-right font-mono">{s.wins}</td>
                <td className="px-3 py-2 text-right font-mono">{s.ties}</td>
                <td className="px-3 py-2 text-right font-mono">{s.losses}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {totalRounds ? `${s.rounds}/${totalRounds}` : s.rounds}
                </td>
                {streakMap && (
                  <td className="px-3 py-2 text-center">
                    <StreakBadge streak={streakMap.get(s.competitor)} />
                  </td>
                )}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankChangeBadge({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'inline-flex items-center rounded px-1 text-[10px] font-bold leading-tight',
        up
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400',
      )}
    >
      {up ? `\u25B2${delta}` : `\u25BC${Math.abs(delta)}`}
    </motion.span>
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
