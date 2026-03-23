/**
 * FR-6: Category performance matrix — D3 heatmap of competitor × category averages.
 */
import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { CategoryPerformanceMatrix, CategoryCell } from '@/lib/analytics';

interface Props {
  data: CategoryPerformanceMatrix;
}

export function CategoryHeatmap({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    cell: CategoryCell;
    x: number;
    y: number;
  } | null>(null);

  const margin = { top: 80, right: 60, bottom: 20, left: 80 };
  const cellW = 70;
  const cellH = 40;

  const width = margin.left + data.categories.length * cellW + margin.right;
  const height = margin.top + data.competitors.length * cellH + margin.bottom;

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  }, []);

  const colorScale = useMemo(() => {
    const allAvgs = data.cells.map((c) => c.avgTotal);
    const domain = allAvgs.length > 0 ? [Math.min(...allAvgs), Math.max(...allAvgs)] : [0, 15];
    const interpolator = isDark ? d3.interpolateYlGnBu : d3.interpolateBlues;
    return d3.scaleSequential(interpolator).domain(domain);
  }, [data.cells, isDark]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Column headers (categories)
    data.categories.forEach((cat, ci) => {
      g.append('text')
        .attr('x', ci * cellW + cellW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-35, ${ci * cellW + cellW / 2}, -8)`)
        .attr('class', 'fill-muted-foreground text-[10px]')
        .text(cat);
    });

    // Row headers (competitors)
    data.competitors.forEach((comp, ri) => {
      g.append('text')
        .attr('x', -8)
        .attr('y', ri * cellH + cellH / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('class', 'fill-foreground text-xs font-medium')
        .text(comp);
    });

    // Cell lookup
    const cellMap = new Map<string, CategoryCell>();
    for (const c of data.cells) {
      cellMap.set(`${c.competitor}|${c.category}`, c);
    }

    // Draw cells
    data.competitors.forEach((comp, ri) => {
      data.categories.forEach((cat, ci) => {
        const cell = cellMap.get(`${comp}|${cat}`);

        g.append('rect')
          .attr('x', ci * cellW + 1)
          .attr('y', ri * cellH + 1)
          .attr('width', cellW - 2)
          .attr('height', cellH - 2)
          .attr('rx', 3)
          .attr('fill', cell ? colorScale(cell.avgTotal) : 'hsl(var(--muted))')
          .attr('tabindex', 0)
          .attr('role', 'gridcell')
          .attr('aria-label', cell
            ? `${comp} ${cat}: avg ${cell.avgTotal.toFixed(1)}, n=${cell.count}`
            : `${comp} ${cat}: no data`)
          .on('mouseenter', (event) => {
            if (cell) setTooltip({ cell, x: event.pageX, y: event.pageY });
          })
          .on('mouseleave', () => setTooltip(null))
          .on('focus', function () {
            if (cell) {
              const rect = (this as SVGRectElement).getBoundingClientRect();
              setTooltip({ cell, x: rect.x + rect.width / 2, y: rect.y });
            }
          })
          .on('blur', () => setTooltip(null));

        // Cell text
        if (cell) {
          g.append('text')
            .attr('x', ci * cellW + cellW / 2)
            .attr('y', ri * cellH + cellH / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('class', 'text-xs pointer-events-none')
            .attr('fill', cell.avgTotal > 8 ? 'white' : 'hsl(var(--foreground))')
            .text(cell.avgTotal.toFixed(1));

          // Low sample indicator
          if (cell.count === 1) {
            g.append('text')
              .attr('x', ci * cellW + cellW - 6)
              .attr('y', ri * cellH + 12)
              .attr('text-anchor', 'end')
              .attr('class', 'text-[8px] pointer-events-none')
              .attr('fill', 'hsl(var(--muted-foreground))')
              .text('n=1');
          }
        } else {
          g.append('text')
            .attr('x', ci * cellW + cellW / 2)
            .attr('y', ri * cellH + cellH / 2 + 4)
            .attr('text-anchor', 'middle')
            .attr('class', 'fill-muted-foreground text-[10px] pointer-events-none')
            .text('—');
        }
      });
    });

    // Row averages column
    const avgColX = data.categories.length * cellW + 8;
    g.append('text')
      .attr('x', avgColX + cellW / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-muted-foreground text-[10px] font-medium')
      .text('Avg');

    data.competitors.forEach((comp, ri) => {
      const avg = data.competitorAverages[comp];
      if (avg != null) {
        g.append('text')
          .attr('x', avgColX + cellW / 2)
          .attr('y', ri * cellH + cellH / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('class', 'fill-foreground text-xs font-medium')
          .text(avg.toFixed(1));
      }
    });

    // Column averages row
    const avgRowY = data.competitors.length * cellH + 8;
    g.append('text')
      .attr('x', -8)
      .attr('y', avgRowY + 4)
      .attr('text-anchor', 'end')
      .attr('class', 'fill-muted-foreground text-[10px] font-medium')
      .text('Avg');

    data.categories.forEach((cat, ci) => {
      const avg = data.categoryAverages[cat];
      if (avg != null) {
        g.append('text')
          .attr('x', ci * cellW + cellW / 2)
          .attr('y', avgRowY + 4)
          .attr('text-anchor', 'middle')
          .attr('class', 'fill-muted-foreground text-xs')
          .text(avg.toFixed(1));
      }
    });
  }, [data, isDark, colorScale, margin.left, margin.top, cellW, cellH]);

  if (data.cells.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No category performance data available.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height + 30}
        role="grid"
        aria-label="Category performance matrix: rows are competitors, columns are query categories, color intensity encodes average score"
      />
      {tooltip && (
        <div
          className="absolute z-50 rounded-md border bg-card px-3 py-2 text-xs shadow-md pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}
        >
          <div className="font-medium">{tooltip.cell.competitor} — {tooltip.cell.category}</div>
          <div>Avg: {tooltip.cell.avgTotal.toFixed(2)}</div>
          <div>Rounds: {tooltip.cell.count}</div>
          <div>Min: {tooltip.cell.minTotal} / Max: {tooltip.cell.maxTotal}</div>
        </div>
      )}
    </div>
  );
}
