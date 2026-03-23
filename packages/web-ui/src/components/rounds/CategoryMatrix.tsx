import type { CategoryMatrixRow } from '@/lib/round-transforms';
import { cn } from '@/lib/utils';

interface CategoryMatrixProps {
  rows: CategoryMatrixRow[];
  competitorA: string;
  competitorB: string;
}

export function CategoryMatrix({ rows, competitorA, competitorB }: CategoryMatrixProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No category data available for comparison.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="px-3 py-2 font-medium text-slate-600">Category</th>
            <th className="px-3 py-2 font-medium text-slate-600 text-right">{competitorA}</th>
            <th className="px-3 py-2 font-medium text-slate-600 text-right">{competitorB}</th>
            <th className="px-3 py-2 font-medium text-slate-600 text-right">Advantage</th>
            <th className="px-3 py-2 font-medium text-slate-600 text-right">Rounds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-700 font-medium">{row.category}</td>
              <td className="px-3 py-2 text-right font-mono text-slate-700">
                {row.avgA.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-slate-700">
                {row.avgB.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right">
                <span
                  className={cn(
                    'font-mono font-medium',
                    row.advantage > 0 && 'text-indigo-600',
                    row.advantage < 0 && 'text-amber-600',
                    row.advantage === 0 && 'text-slate-400',
                  )}
                >
                  {row.advantage > 0 ? '+' : ''}
                  {row.advantage.toFixed(1)}
                </span>
              </td>
              <td className="px-3 py-2 text-right text-slate-500">{row.roundCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
