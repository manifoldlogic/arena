import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { WinTieLossEntry } from '@/lib/transforms';
import { cn } from '@/lib/utils';

interface Props {
  data: WinTieLossEntry[];
  className?: string;
}

const WTL_COLORS = {
  wins: 'hsl(var(--signal-ok))',
  ties: 'hsl(var(--signal-warn))',
  losses: 'hsl(var(--signal-alert))',
};

const WTL_LABELS: Record<string, string> = {
  wins: 'Wins',
  ties: 'Ties',
  losses: 'Losses',
};

function DonutForCompetitor({ entry }: { entry: WinTieLossEntry }) {
  const slices = [
    { name: 'wins', value: entry.wins },
    { name: 'ties', value: entry.ties },
    { name: 'losses', value: entry.losses },
  ].filter((s) => s.value > 0);

  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium">{entry.competitor}</span>
        <span className="text-xs text-muted-foreground">No rounds</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-medium">{entry.competitor}</span>
      <div className="h-36 w-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={55}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((s) => (
                <Cell
                  key={s.name}
                  fill={WTL_COLORS[s.name as keyof typeof WTL_COLORS]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, WTL_LABELS[name] ?? name]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--card-foreground))',
                borderRadius: 'var(--radius)',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{entry.wins}W</span>
        <span>{entry.ties}T</span>
        <span>{entry.losses}L</span>
      </div>
    </div>
  );
}

export function WinTieLoss({ data, className }: Props) {
  if (data.length === 0) {
    return (
      <div className={cn('flex h-48 items-center justify-center rounded-lg border border-border text-muted-foreground', className)}>
        No win/tie/loss data available.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap justify-center gap-8', className)}>
      {data.map((entry) => (
        <DonutForCompetitor key={entry.competitor} entry={entry} />
      ))}
    </div>
  );
}
