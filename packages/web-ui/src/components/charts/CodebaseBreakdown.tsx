import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BreakdownEntry } from '@/lib/transforms';
import { resolveColorMap } from '@/lib/chartColors';
import { cn } from '@/lib/utils';

interface Props {
  data: BreakdownEntry[];
  competitors: string[];
  colorMap?: Record<string, string>;
  stacked?: boolean;
  className?: string;
}

/**
 * Reshape flat BreakdownEntry[] into grouped bar data:
 * [{ group: "django", maproom: 16, explore: 14 }, ...]
 */
function reshapeForChart(data: BreakdownEntry[]): Record<string, string | number>[] {
  const groups = new Map<string, Record<string, string | number>>();
  for (const entry of data) {
    const row = groups.get(entry.group) ?? { group: entry.group };
    row[entry.competitor] = entry.totalScore;
    groups.set(entry.group, row);
  }
  return [...groups.values()];
}

export function CodebaseBreakdown({ data, competitors, colorMap, stacked = false, className }: Props) {
  const colors = useMemo(
    () => resolveColorMap(competitors, colorMap),
    [competitors, colorMap],
  );

  const chartData = useMemo(() => reshapeForChart(data), [data]);

  if (data.length === 0) {
    return (
      <div className={cn('flex h-64 items-center justify-center rounded-lg border border-border text-muted-foreground', className)}>
        No breakdown data available.
      </div>
    );
  }

  return (
    <div className={cn('h-72', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="group"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--card-foreground))',
              borderRadius: 'var(--radius)',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {competitors.map((c) => (
            <Bar
              key={c}
              dataKey={c}
              fill={colors[c]}
              stackId={stacked ? 'stack' : undefined}
              radius={stacked ? undefined : [4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
