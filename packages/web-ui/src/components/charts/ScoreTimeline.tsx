import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimelinePoint } from '@/lib/transforms';
import { resolveColorMap } from '@/lib/chartColors';
import { cn } from '@/lib/utils';

interface Props {
  data: TimelinePoint[];
  competitors: string[];
  colorMap?: Record<string, string>;
  className?: string;
}

export function ScoreTimeline({ data, competitors, colorMap, className }: Props) {
  const colors = useMemo(
    () => resolveColorMap(competitors, colorMap),
    [competitors, colorMap],
  );

  if (data.length === 0) {
    return (
      <div className={cn('flex h-64 items-center justify-center rounded-lg border border-border text-muted-foreground', className)}>
        No timeline data available.
      </div>
    );
  }

  return (
    <div className={cn('h-72', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="round_id"
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
            <Line
              key={c}
              type="monotone"
              dataKey={c}
              stroke={colors[c]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[c] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
