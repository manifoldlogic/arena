import { useHeadToHead } from '@/hooks/useHeadToHead';
import { DimensionRadar } from '@/components/charts/DimensionRadar';
import { RoundMarginChart } from '@/components/rounds/RoundMarginChart';
import { CategoryMatrix } from '@/components/rounds/CategoryMatrix';
import { getCompetitorColor } from '@/lib/competitor-colors';

export function HeadToHeadPage() {
  const {
    competitorA,
    competitorB,
    setCompetitors,
    competitors,
    averages,
    margins,
    radarSeries,
    categoryMatrix,
  } = useHeadToHead();

  return (
    <div className="space-y-8">
      {/* Header + Competitor Selectors */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Head-to-Head Comparison</h1>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <select
            className="rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
            value={competitorA}
            onChange={(e) => setCompetitors(e.target.value, competitorB)}
          >
            {competitors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span className="text-slate-400 font-medium">vs</span>

          <select
            className="rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
            value={competitorB}
            onChange={(e) => setCompetitors(competitorA, e.target.value)}
          >
            {competitors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {competitorA === competitorB ? (
        <p className="text-sm text-amber-600">Select two different competitors to compare.</p>
      ) : !averages ? (
        <p className="text-sm text-slate-500">No shared rounds between these competitors.</p>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: competitorA, avg: averages.avgA, color: getCompetitorColor(competitorA) },
              { label: competitorB, avg: averages.avgB, color: getCompetitorColor(competitorB) },
            ].map(({ label, avg, color }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 p-4"
                style={{ borderLeftColor: color, borderLeftWidth: 4 }}
              >
                <div className="text-sm font-medium text-slate-600">{label}</div>
                <div className="text-3xl font-bold text-slate-900 mt-1">
                  {avg.total.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  P: {avg.precision.toFixed(1)} / R: {avg.recall.toFixed(1)} / I:{' '}
                  {avg.insight.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  across {averages.roundCount} rounds
                </div>
              </div>
            ))}
          </div>

          {/* Radar Overlay */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Averaged Dimension Radar
            </h2>
            <DimensionRadar series={radarSeries} />
          </section>

          {/* Margin Chart */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Per-Round Score Margins
            </h2>
            <RoundMarginChart margins={margins} />
          </section>

          {/* Category Matrix */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Category Performance
            </h2>
            <CategoryMatrix
              rows={categoryMatrix}
              competitorA={competitorA}
              competitorB={competitorB}
            />
          </section>
        </>
      )}
    </div>
  );
}
