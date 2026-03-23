/**
 * Single authority for all competition color concerns.
 *
 * Named competitor palette + theme-aware semantic tokens read from CSS variables.
 */
import { cssVar } from './cssVar';

// ---------------------------------------------------------------------------
// Named competitor palette (hardcoded — independent of theme)
// ---------------------------------------------------------------------------

const PALETTE: Record<string, string> = {
  'claude-code': '#6366f1',    // indigo
  'codex-cli': '#f59e0b',      // amber
  'cursor': '#8b5cf6',         // violet
  'copilot': '#3b82f6',        // blue
  'windsurf': '#06b6d4',       // cyan
  'maproom': '#0072B2',        // Wong blue
  'explore': '#E69F00',        // Wong orange
  'maproom-skill': '#CC79A7',  // Wong reddish purple
  'ast-grep': '#56B4E9',       // Wong sky blue
};

/** Ordered fallback colors for competitors not in the palette. */
const FALLBACK_COLORS = [
  '#D55E00', // Wong vermillion
  '#009E73', // Wong bluish green
  '#F0E442', // Wong yellow
  '#CC79A7', // Wong reddish purple
  '#56B4E9', // Wong sky blue
  '#E69F00', // Wong orange
  '#0072B2', // Wong blue
  '#64748b', // slate (neutral fallback)
];

// ---------------------------------------------------------------------------
// Per-competitor color (stable, hashed fallback)
// ---------------------------------------------------------------------------

/**
 * Returns a stable color for a competitor.
 * Known competitors get a curated color; unknown ones get a deterministic
 * fallback based on a simple string hash.
 */
export function getCompetitorColor(competitor: string): string {
  const known = PALETTE[competitor];
  if (known) return known;

  let hash = 0;
  for (let i = 0; i < competitor.length; i++) {
    hash = ((hash << 5) - hash + competitor.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

/** Returns all known competitor names with their colors. */
export function getKnownCompetitorColors(): Record<string, string> {
  return { ...PALETTE };
}

// ---------------------------------------------------------------------------
// Color maps (used by chart components)
// ---------------------------------------------------------------------------

/** Build a color map: competitor name → color string using the named palette. */
export function buildColorMap(competitors: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of competitors) {
    map[c] = getCompetitorColor(c);
  }
  return map;
}

/** Resolve colorMap prop: use provided map, or build one from the palette. */
export function resolveColorMap(
  competitors: string[],
  colorMap?: Record<string, string>,
): Record<string, string> {
  if (colorMap) return colorMap;
  return buildColorMap(competitors);
}

// ---------------------------------------------------------------------------
// Semantic CSS token readers (theme-aware)
// ---------------------------------------------------------------------------

function hslToken(name: string, fallback: string): string {
  const v = cssVar(name);
  return v ? `hsl(${v})` : fallback;
}

/** Positional competitor colors (A vs B in head-to-head views). */
export const competitorA = () => hslToken('--competitor-a', 'hsl(217 91% 65%)');
export const competitorB = () => hslToken('--competitor-b', 'hsl(24 100% 65%)');

/** Dimension colors for radar / breakdown charts. */
export const dimPrecision = () => hslToken('--dim-precision', 'hsl(217 91% 65%)');
export const dimRecall    = () => hslToken('--dim-recall',    'hsl(164 100% 31%)');
export const dimInsight   = () => hslToken('--dim-insight',   'hsl(280 67% 60%)');

/** Signal colors for status indicators. */
export const signalOk    = () => hslToken('--signal-ok',    'hsl(202 100% 35%)');
export const signalWarn  = () => hslToken('--signal-warn',  'hsl(41 100% 45%)');
export const signalAlert = () => hslToken('--signal-alert', 'hsl(26 100% 42%)');
