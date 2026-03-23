import { Link } from 'react-router-dom';
import type { RoundGroup } from '@/lib/round-transforms';
import type { SortField, SortDir } from '@/hooks/useRoundFilters';
import { DivergenceBadge } from './DivergenceBadge';
import { getCompetitorColor } from '@/lib/competitor-colors';

interface RoundListTableProps {
  groups: RoundGroup[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}

function SortIndicator({ field, activeField, dir }: {
  field: SortField;
  activeField: SortField;
  dir: SortDir;
}) {
  if (field !== activeField) return <span className="text-slate-300 ml-1">↕</span>;
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function RoundListTable({ groups, sortField, sortDir, onSort }: RoundListTableProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No rounds match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th
              className="px-3 py-2 font-medium text-slate-600 cursor-pointer select-none"
              onClick={() => onSort('roundId')}
            >
              Round
              <SortIndicator field="roundId" activeField={sortField} dir={sortDir} />
            </th>
            <th
              className="px-3 py-2 font-medium text-slate-600 cursor-pointer select-none"
              onClick={() => onSort('codebase')}
            >
              Codebase
              <SortIndicator field="codebase" activeField={sortField} dir={sortDir} />
            </th>
            <th className="px-3 py-2 font-medium text-slate-600">Type</th>
            <th className="px-3 py-2 font-medium text-slate-600">Competitors</th>
            <th
              className="px-3 py-2 font-medium text-slate-600 cursor-pointer select-none"
              onClick={() => onSort('total')}
            >
              Best Score
              <SortIndicator field="total" activeField={sortField} dir={sortDir} />
            </th>
            <th
              className="px-3 py-2 font-medium text-slate-600 cursor-pointer select-none"
              onClick={() => onSort('winner')}
            >
              Winner
              <SortIndicator field="winner" activeField={sortField} dir={sortDir} />
            </th>
            <th className="px-3 py-2 font-medium text-slate-600">Divergence</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const winner = group.results.find((r) => r.round_winner)?.round_winner;
            const bestScore = Math.max(...group.results.map((r) => r.total ?? 0));
            const divergence = group.results.find((r) => r.divergence_signal)?.divergence_signal;

            return (
              <tr
                key={group.roundId}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-3 py-2">
                  <Link
                    to={`/rounds/${group.roundId}`}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {group.roundId}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-700">{group.codebase}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {group.roundType}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    {group.results.map((r) => (
                      <span
                        key={r.competitor}
                        className="inline-block rounded px-1.5 py-0.5 text-xs text-white font-medium"
                        style={{ backgroundColor: getCompetitorColor(r.competitor) }}
                      >
                        {r.competitor}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-slate-700">
                  {bestScore > 0 ? bestScore : '—'}
                </td>
                <td className="px-3 py-2">
                  {winner ? (
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-xs text-white font-medium"
                      style={{ backgroundColor: getCompetitorColor(winner) }}
                    >
                      {winner}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <DivergenceBadge signal={divergence} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
