/**
 * FR-5: Recharts stacked area chart showing cumulative precision/recall/insight per competitor.
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CompetitorDimensions } from '@/lib/analytics';

const COLORS = {
  precision: 'hsl(221, 83%, 53%)',  // primary blue
  recall: 'hsl(142, 71%, 45%)',     // green
  insight: 'hsl(280, 67%, 55%)',    // purple
};

interface Props {
  data: CompetitorDimensions[];
}

export function DimensionStackedAreas({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No dimension data available.
      </div>
    );
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 2)}, 1fr)` }}>
      {data.map(({ competitor, snapshots }) => {
        const chartData = snapshots.map((s) => ({
          round: s.roundId,
          precision: s.precision,
          recall: s.recall,
          insight: s.insight,
          total: s.total,
        }));

        // Check invariant: p + r + i = total
        const hasDiscrepancy = snapshots.some(
          (s) => Math.abs(s.precision + s.recall + s.insight - s.total) > 0.01,
        );

        return (
          <div key={competitor} className="rounded-lg border bg-card p-4">
            <h4 className="text-sm font-medium mb-2">
              {competitor}
              {hasDiscrepancy && (
                <span className="ml-2 text-destructive text-xs" title="Dimension totals don't sum to total">
                  [sum mismatch]
                </span>
              )}
            </h4>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={chartData}
                aria-label={`Cumulative dimension scores for ${competitor}`}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="round"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.375rem',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="insight"
                  stackId="1"
                  stroke={COLORS.insight}
                  fill={COLORS.insight}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="recall"
                  stackId="1"
                  stroke={COLORS.recall}
                  fill={COLORS.recall}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="precision"
                  stackId="1"
                  stroke={COLORS.precision}
                  fill={COLORS.precision}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
