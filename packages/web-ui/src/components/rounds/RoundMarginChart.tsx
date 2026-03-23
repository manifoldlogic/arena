import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MarginDataPoint } from '@/lib/round-transforms';

interface RoundMarginChartProps {
  margins: MarginDataPoint[];
  className?: string;
}

export function RoundMarginChart({ margins, className }: RoundMarginChartProps) {
  if (margins.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        No shared rounds to compare.
      </p>
    );
  }

  const data = margins.map((m) => ({
    roundId: m.roundId,
    margin: m.margin,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="roundId"
            tick={{ fontSize: 11, fill: '#64748b' }}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{
              value: 'Score Margin',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#94a3b8' },
            }}
          />
          <Tooltip
            formatter={(value: number) => [
              `${value > 0 ? '+' : ''}${value}`,
              'Margin',
            ]}
            labelFormatter={(label: string) => `Round: ${label}`}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
          <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.margin >= 0 ? '#6366f1' : '#f59e0b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
        <span>
          <span className="inline-block w-3 h-3 rounded bg-indigo-500 mr-1 align-middle" />
          {margins[0]?.competitorA} leads
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded bg-amber-500 mr-1 align-middle" />
          {margins[0]?.competitorB} leads
        </span>
      </div>
    </div>
  );
}
