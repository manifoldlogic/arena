import { useRef, useEffect, useMemo } from 'react';
import * as Plot from '@observablehq/plot';
import type { ScatterPoint } from '@/lib/transforms';
import { resolveColorMap } from '@/lib/chartColors';
import { cn } from '@/lib/utils';

interface Props {
  data: ScatterPoint[];
  competitors: string[];
  colorMap?: Record<string, string>;
  className?: string;
}

export function EfficiencyScatter({ data, competitors, colorMap, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = useMemo(
    () => resolveColorMap(competitors, colorMap),
    [competitors, colorMap],
  );

  const domain = useMemo(() => [...competitors], [competitors]);
  const range = useMemo(() => domain.map((c) => colors[c]), [domain, colors]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const plot = Plot.plot({
      width: containerRef.current.clientWidth,
      height: 280,
      style: {
        background: 'transparent',
        color: 'hsl(var(--foreground))',
        fontSize: '12px',
      },
      x: {
        label: 'Tool Calls',
        grid: true,
      },
      y: {
        label: 'Time (s)',
        grid: true,
      },
      color: {
        domain,
        range,
        legend: true,
      },
      marks: [
        Plot.dot(data, {
          x: 'calls',
          y: 'time_s',
          fill: 'competitor',
          r: 5,
          tip: true,
          title: (d: ScatterPoint) =>
            `${d.competitor}\n${d.round_id}\nCalls: ${d.calls}\nTime: ${d.time_s}s\nScore: ${d.total}`,
        }),
        Plot.linearRegressionY(data, {
          x: 'calls',
          y: 'time_s',
          stroke: 'competitor',
          strokeWidth: 1.5,
          strokeOpacity: 0.5,
        }),
      ],
    });

    containerRef.current.replaceChildren(plot);
    // Add cursor:pointer to all interactive dot elements
    plot.querySelectorAll('circle').forEach((el: SVGCircleElement) => {
      el.style.cursor = 'pointer';
    });
    return () => plot.remove();
  }, [data, domain, range]);

  if (data.length === 0) {
    return (
      <div className={cn('flex h-64 items-center justify-center rounded-lg border border-border text-muted-foreground', className)}>
        No efficiency data available.
      </div>
    );
  }

  return <div ref={containerRef} className={cn('w-full', className)} />;
}
