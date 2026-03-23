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
        .style('stroke', 'hsl(var(--border))')
        .attr('stroke-width', 0.5);

      g.append('text')
        .attr('x', 4)
        .attr('y', -r)
        .attr('dy', '0.35em')
        .style('fill', 'hsl(var(--muted-foreground))')
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
        .style('stroke', 'hsl(var(--border))')
        .attr('stroke-width', 1);

      const labelOffset = 1.15;
      g.append('text')
        .attr('x', Math.cos(angle) * size * labelOffset)
        .attr('y', Math.sin(angle) * size * labelOffset)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .style('fill', 'hsl(var(--foreground))')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(axis.charAt(0).toUpperCase() + axis.slice(1));
    });

    // --- Data polygons with entry animation ---
    const lineGen = d3
      .lineRadial<{ axis: string; value: number }>()
      .angle((_, i) => angleSlice * i)
      .radius((d) => (d.value / maxValue) * size)
      .curve(d3.curveLinearClosed);

    // Generator for collapsed (center) state
    const lineGenZero = d3
      .lineRadial<{ axis: string; value: number }>()
      .angle((_, i) => angleSlice * i)
      .radius(0)
      .curve(d3.curveLinearClosed);

    series.forEach((s) => {
      const color = getCompetitorColor(s.competitor);
      const pathData = lineGen(s.dataPoints);
      const pathDataZero = lineGenZero(s.dataPoints);

      // Polygon fill — animate from center outward
      g.append('path')
        .attr('d', pathDataZero)
        .attr('fill', color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.8)
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr('d', pathData);

      // Data points — fade in after polygon expands
      s.dataPoints.forEach((dp, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = (dp.value / maxValue) * size;
        const dot = g.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 4)
          .attr('fill', color)
          .style('stroke', 'hsl(var(--background))')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0)
          .style('cursor', 'pointer');

        // Attach hover handlers immediately (work after animation completes)
        dot
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

        // Animate from center outward
        dot.transition()
          .duration(600)
          .ease(d3.easeCubicOut)
          .attr('cx', Math.cos(angle) * r)
          .attr('cy', Math.sin(angle) * r)
          .attr('opacity', 1);
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
        className="absolute hidden bg-popover text-popover-foreground text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap shadow-md"
      />
    </div>
  );
}
