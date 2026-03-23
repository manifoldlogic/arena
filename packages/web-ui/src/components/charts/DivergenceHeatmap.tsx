/**
 * FR-1: D3-powered divergence heatmap.
 *
 * Rows = rounds (chronological), Columns = competitors.
 * Cell color encodes divergence signal: gray / yellow / signal.
 */
import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { DivergenceMatrix, DivergenceCell } from '@/lib/analytics';

const SIGNAL_COLORS: Record<string, { light: string; dark: string }> = {
  gray: { light: 'hsl(210, 10%, 85%)', dark: 'hsl(217, 20%, 28%)' },
  yellow: { light: 'hsl(45, 90%, 65%)', dark: 'hsl(45, 70%, 40%)' },
  signal: { light: 'hsl(0, 75%, 60%)', dark: 'hsl(0, 60%, 45%)' },
};

interface Props {
  data: DivergenceMatrix;
}

export function DivergenceHeatmap({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    cell: DivergenceCell;
    x: number;
    y: number;
  } | null>(null);

  const margin = { top: 60, right: 20, bottom: 20, left: 120 };
  const cellW = 80;
  const cellH = 32;

  const width = margin.left + data.competitors.length * cellW + margin.right;
  const height = margin.top + data.rounds.length * cellH + margin.bottom;

  // Detect dark mode via CSS variable
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Column headers
    data.competitors.forEach((comp, ci) => {
      g.append('text')
        .attr('x', ci * cellW + cellW / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-foreground text-xs font-medium')
        .text(comp);
    });

    // Rows
    data.rounds.forEach((round, ri) => {
      // Row label
      g.append('text')
        .attr('x', -8)
        .attr('y', ri * cellH + cellH / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('class', 'fill-muted-foreground text-[10px]')
        .text(`${round.roundId} ${round.queryCategory ?? ''}`);

      // Cells
      data.competitors.forEach((comp, ci) => {
        const theme = isDark ? 'dark' : 'light';
        const color = SIGNAL_COLORS[round.signal][theme];

        g.append('rect')
          .attr('x', ci * cellW + 1)
          .attr('y', ri * cellH + 1)
          .attr('width', cellW - 2)
          .attr('height', cellH - 2)
          .attr('rx', 3)
          .attr('fill', color)
          .attr('class', 'cursor-pointer')
          .attr('tabindex', 0)
          .attr('role', 'gridcell')
          .attr('aria-label',
            `${comp}: ${round.scores[comp] ?? '—'}, spread ${round.spread}, ${round.signal}`)
          .on('mouseenter', (event) => {
            setTooltip({ cell: round, x: event.pageX, y: event.pageY });
          })
          .on('mouseleave', () => setTooltip(null))
          .on('focus', function () {
            const rect = (this as SVGRectElement).getBoundingClientRect();
            setTooltip({ cell: round, x: rect.x + rect.width / 2, y: rect.y });
          })
          .on('blur', () => setTooltip(null));

        // Score text inside cell
        g.append('text')
          .attr('x', ci * cellW + cellW / 2)
          .attr('y', ri * cellH + cellH / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('class', 'fill-foreground text-xs pointer-events-none')
          .text(round.scores[comp] ?? '—');
      });
    });
  }, [data, isDark, margin.left, margin.top, cellW, cellH]);

  if (data.rounds.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No divergence data available. Need scored rounds to display heatmap.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="grid"
        aria-label="Divergence heatmap: rows are rounds, columns are competitors, color encodes spread signal"
      />
      {tooltip && (
        <div
          className="absolute z-50 rounded-md border bg-card px-3 py-2 text-xs shadow-md pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="font-medium">{tooltip.cell.roundId}</div>
          {Object.entries(tooltip.cell.scores).map(([comp, score]) => (
            <div key={comp}>{comp}: {score}</div>
          ))}
          <div className="text-muted-foreground mt-1">
            Spread: {tooltip.cell.spread} ({tooltip.cell.signal})
          </div>
        </div>
      )}
    </div>
  );
}
