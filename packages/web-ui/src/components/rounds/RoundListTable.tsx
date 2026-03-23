import { Link } from 'react-router-dom';
import type { RoundGroup } from '@/lib/round-transforms';
import type { SortField, SortDir } from '@/hooks/useRoundFilters';
import { DivergenceBadge, DifficultyBadge } from './DivergenceBadge';
import { CompetitorChip } from '@/components/ui/CompetitorChip';

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
  if (field !== activeField) return <span className="text-muted-foreground/50 ml-1">↕</span>;
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function RoundListTable({ groups, sortField, sortDir, onSort }: RoundListTableProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No rounds match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th
              className="px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none"
              onClick={() => onSort('roundId')}
            >
              Round
              <SortIndicator field="roundId" activeField={sortField} dir={sortDir} />
            </th>
            <th
              className="px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none"
              onClick={() => onSort('codebase')}
            >
              Codebase
              <SortIndicator field="codebase" activeField={sortField} dir={sortDir} />
            </th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Competitors</th>
            <th
              className="px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none"
              onClick={() => onSort('total')}
            >
              Best Score
              <SortIndicator field="total" activeField={sortField} dir={sortDir} />
            </th>
            <th
              className="px-3 py-2 font-medium text-muted-foreground cursor-pointer select-none"
              onClick={() => onSort('winner')}
            >
              Winner
              <SortIndicator field="winner" activeField={sortField} dir={sortDir} />
            </th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Difficulty</th>
            <th className="px-3 py-2 font-medium text-muted-foreground">Divergence</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const winner = group.results.find((r) => r.round_winner)?.round_winner;
            const scores = group.results.map((r) => r.total ?? 0);
            const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
            const divergence = group.results.find((r) => r.divergence_signal)?.divergence_signal;
            const difficulty = group.results.find((r) => r.query_difficulty)?.query_difficulty;

            return (
              <tr
                key={group.roundId}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="px-3 py-2">
                  <Link
                    to={`/rounds/${group.roundId}`}
                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {group.roundId}
                  </Link>
                </td>
                <td className="px-3 py-2 text-foreground">{group.codebase}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {group.roundType}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    {group.results.map((r) => (
                      <CompetitorChip key={r.competitor} competitor={r.competitor} />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-foreground">
                  {bestScore > 0 ? bestScore : '—'}
                </td>
                <td className="px-3 py-2">
                  {winner ? (
                    <CompetitorChip competitor={winner} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {difficulty ? <DifficultyBadge difficulty={difficulty} /> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  <DivergenceBadge signal={divergence} difficulty={difficulty} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
