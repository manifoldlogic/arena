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
  'gemini-cli': '#10b981',     // emerald
  'aider': '#ef4444',          // red
  'cursor': '#8b5cf6',         // violet
  'copilot': '#3b82f6',        // blue
  'windsurf': '#06b6d4',       // cyan
};

/** Ordered fallback colors for competitors not in the palette. */
const FALLBACK_COLORS = [
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
  '#64748b', // slate
  '#84cc16', // lime
  '#e11d48', // rose
  '#0ea5e9', // sky
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
export const dimRecall    = () => hslToken('--dim-recall',    'hsl(142 76% 50%)');
export const dimInsight   = () => hslToken('--dim-insight',   'hsl(280 67% 60%)');

/** Signal colors for status indicators. */
export const signalOk    = () => hslToken('--signal-ok',    'hsl(142 76% 50%)');
export const signalWarn  = () => hslToken('--signal-warn',  'hsl(45 90% 60%)');
export const signalAlert = () => hslToken('--signal-alert', 'hsl(0 84% 60%)');
