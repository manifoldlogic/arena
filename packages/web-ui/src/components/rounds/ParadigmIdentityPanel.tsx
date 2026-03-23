import { useMemo } from 'react';
import { getCompetitorColor } from '@/lib/competitor-colors';
import { useCompetitionData } from '@/hooks/use-competition-data';
import { COMPETITOR_SPECS } from '@/data/competitor-specs';

const PARADIGM_LABELS: Record<string, string> = {
  'indexed-search': 'Indexed',
  'iterative-grep': 'Iterative',
};

interface ParadigmIdentityPanelProps {
  competitorA: string;
  competitorB: string;
}

function EfficiencySparkline({
  values,
  color,
  maxBudget,
}: {
  values: number[];
  color: string;
  maxBudget: number;
}) {
  if (values.length === 0) return null;

  const width = 120;
  const height = 32;
  const padY = 2;

  const max = Math.max(...values, maxBudget);
  const stepX = values.length > 1 ? width / (values.length - 1) : width / 2;

  const points = values.map((v, i) => {
    const x = values.length > 1 ? i * stepX : width / 2;
    const y = padY + ((max - v) / max) * (height - 2 * padY);
    return `${x},${y}`;
  });

  const budgetY = padY + ((max - maxBudget) / max) * (height - 2 * padY);

  return (
    <svg width={width} height={height} className="inline-block">
      {/* Budget ceiling line */}
      <line
        x1={0}
        y1={budgetY}
        x2={width}
        y2={budgetY}
        stroke="currentColor"
        strokeDasharray="3,3"
        className="text-muted-foreground/40"
        strokeWidth={1}
      />
      {/* Sparkline */}
      {values.length === 1 ? (
        <circle cx={width / 2} cy={parseFloat(points[0].split(',')[1])} r={2.5} fill={color} />
      ) : (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function ParadigmIdentityPanel({ competitorA, competitorB }: ParadigmIdentityPanelProps) {
  const { rounds } = useCompetitionData();
  const specs = COMPETITOR_SPECS;

  const specA = specs.find((s) => s.name === competitorA);
  const specB = specs.find((s) => s.name === competitorB);

  // Per-competitor round call counts for sparkline
  const callsA = useMemo(
    () =>
      rounds
        .filter((r) => r.competitor === competitorA)
        .sort((a, b) => a.round_id.localeCompare(b.round_id))
        .map((r) => r.calls),
    [rounds, competitorA],
  );

  const callsB = useMemo(
    () =>
      rounds
        .filter((r) => r.competitor === competitorB)
        .sort((a, b) => a.round_id.localeCompare(b.round_id))
        .map((r) => r.calls),
    [rounds, competitorB],
  );

  if (!specA && !specB) return null;

  const entries = [
    { name: competitorA, spec: specA, calls: callsA },
    { name: competitorB, spec: specB, calls: callsB },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {entries.map(({ name, spec, calls }) => {
        if (!spec) {
          return (
            <div
              key={name}
              className="rounded-lg border border-border p-4 text-sm text-muted-foreground"
            >
              No spec data for <span className="font-medium text-foreground">{name}</span>
            </div>
          );
        }

        const color = getCompetitorColor(name);
        const paradigmLabel = PARADIGM_LABELS[spec.paradigm] ?? spec.paradigm;

        return (
          <div
            key={name}
            className="rounded-lg border border-border p-4 space-y-3"
            style={{ borderLeftColor: color, borderLeftWidth: 4 }}
          >
            {/* Header: name + paradigm badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {paradigmLabel}
              </span>
            </div>

            {/* Tool inventory */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Tools
              </div>
              <div className="flex flex-wrap gap-1">
                {spec.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Performance budget */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Budget
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-mono text-foreground">{spec.performance_budget.max_calls}</span>{' '}
                calls /{' '}
                <span className="font-mono text-foreground">{spec.performance_budget.max_time_s}</span>s
              </div>
            </div>

            {/* Efficiency sparkline */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Calls per Round
              </div>
              <EfficiencySparkline
                values={calls}
                color={color}
                maxBudget={spec.performance_budget.max_calls}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
