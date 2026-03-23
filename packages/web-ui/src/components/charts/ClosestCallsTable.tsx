/**
 * FR-4: Closest calls dashboard — rounds with margin ≤ 1.
 */
import { useState } from 'react';
import type { ClosestCall } from '@/lib/analytics';

type SortKey = 'margin' | 'roundId' | 'codebase';

interface Props {
  data: ClosestCall[];
  totalRounds: number;
}

export function ClosestCallsTable({ data, totalRounds }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('margin');

  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'margin') return a.margin - b.margin;
    if (sortBy === 'roundId') return a.roundId.localeCompare(b.roundId);
    return a.codebase.localeCompare(b.codebase);
  });

  const pct = totalRounds > 0 ? ((data.length / totalRounds) * 100).toFixed(1) : '0';

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No closest calls found (no rounds with margin ≤ 1).
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Close calls: {data.length}</span>
        <span>% of rounds: {pct}%</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table" aria-label="Closest calls: rounds decided by 1 point or less">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 px-2 cursor-pointer hover:text-foreground" onClick={() => setSortBy('roundId')}>
                Round {sortBy === 'roundId' ? '↓' : ''}
              </th>
              <th className="py-2 px-2 cursor-pointer hover:text-foreground" onClick={() => setSortBy('codebase')}>
                Codebase {sortBy === 'codebase' ? '↓' : ''}
              </th>
              <th className="py-2 px-2">Category</th>
              <th className="py-2 px-2 cursor-pointer hover:text-foreground" onClick={() => setSortBy('margin')}>
                Margin {sortBy === 'margin' ? '↓' : ''}
              </th>
              <th className="py-2 px-2">Scores (P/R/I = T)</th>
              <th className="py-2 px-2">Swing Dims</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((call) => (
              <tr key={call.roundId} className="border-b border-border/50 hover:bg-muted/50">
                <td className="py-2 px-2 font-mono">{call.roundId}</td>
                <td className="py-2 px-2">{call.codebase}</td>
                <td className="py-2 px-2">{call.queryCategory ?? '—'}</td>
                <td className="py-2 px-2 font-mono">{call.margin}</td>
                <td className="py-2 px-2">
                  {call.competitors.map((c) => (
                    <div key={c.competitor}>
                      <span className="font-medium">{c.competitor}:</span>{' '}
                      <span className="font-mono">{c.precision}/{c.recall}/{c.insight} = {c.total}</span>
                    </div>
                  ))}
                </td>
                <td className="py-2 px-2">
                  {call.swingDimensions.length > 0
                    ? call.swingDimensions.map((d) => (
                        <span
                          key={d}
                          className="inline-block rounded bg-accent px-1.5 py-0.5 mr-1 text-accent-foreground"
                        >
                          {d}
                        </span>
                      ))
                    : <span className="text-muted-foreground">tie</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
