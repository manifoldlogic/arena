/**
 * Competitor color palette with deterministic fallback for unknown competitors.
 */

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

/**
 * Returns a stable color for a competitor.
 * Known competitors get a curated color; unknown ones get a deterministic
 * fallback based on a simple string hash.
 */
export function getCompetitorColor(competitor: string): string {
  const known = PALETTE[competitor];
  if (known) return known;

  // Deterministic hash → fallback index
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
