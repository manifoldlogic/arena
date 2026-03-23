/**
 * FR-2: Drift detection timeline — rolling average delta between two competitors.
 */
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Line,
  Area,
} from 'recharts';
import type { DriftTimeline as DriftTimelineData } from '@/lib/analytics';
import { getCompetitorColor } from '@/lib/competitor-colors';

interface Props {
  data: DriftTimelineData;
}

export function DriftTimeline({ data }: Props) {
  if (data.points.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Insufficient data for drift detection (need at least 5 shared rounds).
      </div>
    );
  }

  const colorA = getCompetitorColor(data.competitorA);
  const colorB = getCompetitorColor(data.competitorB);

  const chartData = data.points.map((p) => ({
    round: p.roundId,
    delta: Number(p.delta.toFixed(2)),
    rawDelta: p.rawDelta,
    isAnomaly: p.isAnomaly,
    // Separate field for anomaly scatter points
    anomalyDelta: p.isAnomaly ? Number(p.delta.toFixed(2)) : null,
    // Split delta for positive/negative area fills
    deltaPositive: p.delta >= 0 ? Number(p.delta.toFixed(2)) : 0,
    deltaNegative: p.delta < 0 ? Number(p.delta.toFixed(2)) : 0,
  }));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-2">
        Rolling average (window={data.windowSize}) of {data.competitorA} − {data.competitorB} score delta
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={chartData}
          aria-label={`Drift timeline: ${data.competitorA} vs ${data.competitorB}`}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="round" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
          <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.375rem',
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              if (name === 'anomalyDelta') return [value, 'Anomaly'];
              return [value, name === 'delta' ? 'Rolling Avg' : 'Raw Delta'];
            }}
          />
          <Area
            type="monotone"
            dataKey="deltaPositive"
            stroke="none"
            fill={colorA}
            fillOpacity={0.05}
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
          />
          <Area
            type="monotone"
            dataKey="deltaNegative"
            stroke="none"
            fill={colorB}
            fillOpacity={0.05}
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
          />
          <ReferenceLine
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            label={{ value: 'Equal', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Line
            type="monotone"
            dataKey="delta"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="rawDelta"
            stroke="hsl(var(--primary))"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            opacity={0.4}
          />
          <Scatter
            dataKey="anomalyDelta"
            fill="hsl(var(--destructive))"
            shape="diamond"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
