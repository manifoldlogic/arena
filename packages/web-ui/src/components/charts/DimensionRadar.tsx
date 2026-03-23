/**
 * D3-powered radar chart for comparing competitor scores across
 * precision / recall / insight dimensions.
 */
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { RadarSeries } from '@/lib/round-transforms';
import { getCompetitorColor } from '@/lib/competitor-colors';

export interface DimensionRadarProps {
  series: RadarSeries[];
  /** Outer radius in pixels (default 150). */
  size?: number;
  /** Maximum score value for the axes (default 10). */
  maxValue?: number;
  /** Number of concentric grid rings (default 5). */
  levels?: number;
  className?: string;
}

export function DimensionRadar({
  series,
  size = 150,
  maxValue = 10,
  levels = 5,
  className,
}: DimensionRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const axes = ['precision', 'recall', 'insight'];
  const angleSlice = (2 * Math.PI) / axes.length;
  const margin = 40;
  const width = size * 2 + margin * 2;
  const height = size * 2 + margin * 2;
  const cx = width / 2;
  const cy = height / 2;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // --- Concentric grid rings ---
    for (let level = 1; level <= levels; level++) {
      const r = (size / levels) * level;
      g.append('circle')
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 0.5);

      g.append('text')
        .attr('x', 4)
        .attr('y', -r)
        .attr('dy', '0.35em')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .text(((maxValue / levels) * level).toFixed(0));
    }

    // --- Axis lines and labels ---
    axes.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1);

      const labelOffset = 1.15;
      g.append('text')
        .attr('x', Math.cos(angle) * size * labelOffset)
        .attr('y', Math.sin(angle) * size * labelOffset)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#475569')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(axis.charAt(0).toUpperCase() + axis.slice(1));
    });

    // --- Data polygons ---
    const lineGen = d3
      .lineRadial<{ axis: string; value: number }>()
      .angle((_, i) => angleSlice * i)
      .radius((d) => (d.value / maxValue) * size)
      .curve(d3.curveLinearClosed);

    series.forEach((s) => {
      const color = getCompetitorColor(s.competitor);

      // Polygon fill
      g.append('path')
        .datum(s.dataPoints)
        .attr('d', lineGen as never)
        .attr('fill', color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.8);

      // Data points
      s.dataPoints.forEach((dp, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = (dp.value / maxValue) * size;
        g.append('circle')
          .attr('cx', Math.cos(angle) * r)
          .attr('cy', Math.sin(angle) * r)
          .attr('r', 4)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer')
          .on('mouseenter', (event: MouseEvent) => {
            const tooltip = tooltipRef.current;
            if (!tooltip) return;
            tooltip.style.display = 'block';
            tooltip.style.left = `${event.offsetX + 10}px`;
            tooltip.style.top = `${event.offsetY - 10}px`;
            tooltip.textContent = `${s.competitor}: ${dp.axis} = ${dp.value.toFixed(1)}`;
          })
          .on('mouseleave', () => {
            const tooltip = tooltipRef.current;
            if (tooltip) tooltip.style.display = 'none';
          });
      });
    });
  }, [series, size, maxValue, levels, cx, cy, angleSlice]);

  if (series.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground text-center py-8">
          No radar data available.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label="Dimension radar chart"
      />
      <div
        ref={tooltipRef}
        className="absolute hidden bg-slate-900 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap"
      />
    </div>
  );
}
