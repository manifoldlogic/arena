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
      <p className="text-sm text-muted-foreground text-center py-8">
        No category data available for comparison.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-3 py-2 font-medium text-muted-foreground">Category</th>
            <th className="px-3 py-2 font-medium text-muted-foreground text-right">{competitorA}</th>
            <th className="px-3 py-2 font-medium text-muted-foreground text-right">{competitorB}</th>
            <th className="px-3 py-2 font-medium text-muted-foreground text-right">Advantage</th>
            <th className="px-3 py-2 font-medium text-muted-foreground text-right">Rounds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-b border-border">
              <td className="px-3 py-2 text-foreground font-medium">{row.category}</td>
              <td className="px-3 py-2 text-right font-mono text-foreground">
                {row.avgA.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-foreground">
                {row.avgB.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right">
                <span
                  className={cn(
                    'font-mono font-medium',
                    row.advantage > 0 && 'text-indigo-600',
                    row.advantage < 0 && 'text-amber-600',
                    row.advantage === 0 && 'text-muted-foreground',
                  )}
                >
                  {row.advantage > 0 ? '+' : ''}
                  {row.advantage.toFixed(1)}
                </span>
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">{row.roundCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
