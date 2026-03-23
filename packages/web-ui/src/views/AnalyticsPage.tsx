/**
 * Analytics page — composes all 6 analytical views with mock data.
 */
import { useMemo, useState } from 'react';
import { useCompetitionData } from '@/hooks/use-competition-data';
import {
  computeDivergenceMatrix,
  computeDiscriminationStatus,
  computeDriftTimeline,
  computeClosestCalls,
  computeDimensionTotals,
  computeCategoryPerformanceMatrix,
} from '@/lib/analytics';
import { DivergenceHeatmap } from '@/components/charts/DivergenceHeatmap';
import { DriftTimeline } from '@/components/charts/DriftTimeline';
import { ClosestCallsTable } from '@/components/charts/ClosestCallsTable';
import { DimensionStackedAreas } from '@/components/charts/DimensionStackedAreas';
import { CategoryHeatmap } from '@/components/charts/CategoryHeatmap';
import { CrossSeriesFacets } from '@/components/charts/CrossSeriesFacets';
import { DroughtIndicator } from '@/components/charts/DroughtIndicator';

export function AnalyticsPage() {
  const { rounds } = useCompetitionData();
  const [windowSize, setWindowSize] = useState(3);
  const competitors = useMemo(
    () => [...new Set(rounds.map((r) => r.competitor))].sort(),
    [rounds],
  );

  const divergence = useMemo(() => computeDivergenceMatrix(rounds), [rounds]);
  const discrimination = useMemo(() => computeDiscriminationStatus(rounds), [rounds]);
  const drift = useMemo(
    () =>
      competitors.length >= 2
        ? computeDriftTimeline(rounds, competitors[0], competitors[1], windowSize)
        : null,
    [rounds, competitors, windowSize],
  );
  const closestCalls = useMemo(() => computeClosestCalls(rounds), [rounds]);
  const dimensions = useMemo(() => computeDimensionTotals(rounds), [rounds]);
  const categoryMatrix = useMemo(() => computeCategoryPerformanceMatrix(rounds), [rounds]);

  // Count unique round IDs for closest-calls percentage
  const totalRounds = useMemo(
    () => new Set(rounds.filter((r) => r.source === 'score').map((r) => r.round_id)).size,
    [rounds],
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Advanced Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Strategic insights from {totalRounds} scored rounds across {competitors.length} competitors
        </p>
      </div>

      {/* FR-1: Divergence Heatmap */}
      <section>
        <h3 className="text-base font-medium mb-3">Divergence Heatmap</h3>
        <DroughtIndicator data={discrimination} />
        <div className="overflow-x-auto rounded-lg border bg-card p-4 mt-3">
          <DivergenceHeatmap data={divergence} />
        </div>
      </section>

      {/* FR-2: Drift Detection Timeline */}
      <section>
        <div className="flex items-center gap-4 mb-3">
          <h3 className="text-base font-medium">Drift Detection</h3>
          <select
            value={windowSize}
            onChange={(e) => setWindowSize(Number(e.target.value))}
            className="rounded border bg-card px-2 py-1 text-xs"
            aria-label="Rolling window size"
          >
            <option value={3}>Window: 3</option>
            <option value={5}>Window: 5</option>
            <option value={7}>Window: 7</option>
          </select>
        </div>
        {drift ? <DriftTimeline data={drift} /> : (
          <div className="text-sm text-muted-foreground">Need at least 2 competitors for drift analysis.</div>
        )}
      </section>

      {/* FR-3: Cross-Series Analysis */}
      <section>
        <h3 className="text-base font-medium mb-3">Cross-Series Analysis</h3>
        <div className="rounded-lg border bg-card p-4">
          <CrossSeriesFacets rounds={rounds} />
        </div>
      </section>

      {/* FR-4: Closest Calls */}
      <section>
        <h3 className="text-base font-medium mb-3">Closest Calls</h3>
        <div className="rounded-lg border bg-card p-4">
          <ClosestCallsTable data={closestCalls} totalRounds={totalRounds} />
        </div>
      </section>

      {/* FR-5: Dimension Stacked Areas */}
      <section>
        <h3 className="text-base font-medium mb-3">Dimension Evolution</h3>
        <DimensionStackedAreas data={dimensions} />
      </section>

      {/* FR-6: Category Performance Matrix */}
      <section>
        <h3 className="text-base font-medium mb-3">Category Performance Matrix</h3>
        <div className="rounded-lg border bg-card p-4 overflow-x-auto">
          <CategoryHeatmap data={categoryMatrix} />
        </div>
      </section>
    </div>
  );
}
