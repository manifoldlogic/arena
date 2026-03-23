/**
 * FR-3: Observable Plot faceted view — per-competitor performance across (phase, codebase) series.
 */
import { useRef, useEffect } from 'react';
import * as Plot from '@observablehq/plot';
import type { RoundResult } from '@arena/schemas';

interface Props {
  rounds: RoundResult[];
}

export function CrossSeriesFacets({ rounds }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);

  useEffect(() => {
    if (!containerRef.current || scored.length === 0) return;

    // Build series data: one row per (competitor, series) with avg total and count
    const seriesMap = new Map<string, { totals: number[]; competitor: string; series: string }>();

    for (const r of scored) {
      const series = `P${r.phase} ${r.codebase}`;
      const key = `${r.competitor}|${series}`;
      const entry = seriesMap.get(key) ?? { totals: [], competitor: r.competitor, series };
      entry.totals.push(r.total!);
      seriesMap.set(key, entry);
    }

    interface SeriesDatum {
      competitor: string;
      series: string;
      avgTotal: number;
      count: number;
    }

    const data: SeriesDatum[] = [...seriesMap.values()].map((entry) => ({
      competitor: entry.competitor,
      series: entry.series,
      avgTotal: entry.totals.reduce((a, b) => a + b, 0) / entry.totals.length,
      count: entry.totals.length,
    }));

    const chart = Plot.plot({
      marginLeft: 100,
      marginBottom: 40,
      width: containerRef.current.clientWidth,
      height: 60 + data.length * 20,
      color: { legend: true },
      x: { label: 'Avg Total Score', domain: [0, 15] },
      y: { label: null },
      facet: { data, y: 'series', marginRight: 10 },
      marks: [
        Plot.barX(data, {
          x: 'avgTotal',
          y: 'competitor',
          fill: 'competitor',
          title: (d) => `${(d as SeriesDatum).competitor}: ${(d as SeriesDatum).avgTotal.toFixed(1)} (n=${(d as SeriesDatum).count})`,
        }),
        Plot.text(data, {
          x: 'avgTotal',
          y: 'competitor',
          text: (d) => `${(d as SeriesDatum).avgTotal.toFixed(1)} (n=${(d as SeriesDatum).count})`,
          dx: 4,
          textAnchor: 'start',
          fontSize: 10,
        }),
        Plot.ruleX([0]),
      ],
    });

    containerRef.current.replaceChildren(chart);

    return () => { chart.remove(); };
  }, [scored]);

  if (scored.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No cross-series data available.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Faceted bar chart comparing competitor performance across phase and codebase combinations"
      className="overflow-x-auto"
    />
  );
}
