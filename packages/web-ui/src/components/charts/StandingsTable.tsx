import { useState, useMemo } from 'react';
import type { CompetitorStanding } from '@arena/schemas';
import { cn } from '@/lib/utils';

type SortKey = keyof Omit<CompetitorStanding, 'competitor'> | 'competitor';
type SortDir = 'asc' | 'desc';

interface Props {
  standings: CompetitorStanding[];
  className?: string;
}

export function StandingsTable({ standings, className }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...standings];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
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
              <td className="px-3 py-2 text-right font-mono">{s.avg.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono">{s.wins}</td>
              <td className="px-3 py-2 text-right font-mono">{s.ties}</td>
              <td className="px-3 py-2 text-right font-mono">{s.losses}</td>
              <td className="px-3 py-2 text-right font-mono">{s.rounds}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
