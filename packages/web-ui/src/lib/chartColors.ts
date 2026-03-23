/**
 * Chart color utilities.
 *
 * Reads --chart-1 through --chart-5 CSS variables and builds
 * explicit domain/range arrays for consistent competitor coloring
 * across all chart types.
 */

const CHART_VAR_COUNT = 5;

/** Read HSL chart colors from CSS variables, returning hsl() strings. */
export function getChartColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  const colors: string[] = [];
  for (let i = 1; i <= CHART_VAR_COUNT; i++) {
    const hsl = style.getPropertyValue(`--chart-${i}`).trim();
    colors.push(hsl ? `hsl(${hsl})` : `hsl(0 0% ${50 + i * 10}%)`);
  }
  return colors;
}

/** Build a color map: competitor name -> hsl color string. */
export function buildColorMap(competitors: string[]): Record<string, string> {
  const colors = getChartColors();
  const map: Record<string, string> = {};
  for (let i = 0; i < competitors.length; i++) {
    map[competitors[i]] = colors[i % colors.length];
  }
  return map;
}

/**
 * Static fallback colors for non-browser environments (SSR, tests).
 * These match the light-theme --chart-1 through --chart-5.
 */
export const FALLBACK_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(24 95% 53%)',
  'hsl(142 71% 45%)',
  'hsl(271 76% 53%)',
  'hsl(349 89% 60%)',
];
