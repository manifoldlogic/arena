/**
 * Max-calls budget per competitor, sourced from specs/competitors.json.
 *
 * Used by computeQAS to calculate efficiency bonuses.
 */
/**
 * Default max-calls budgets per competitor.
 * In production these would be fetched from the API or specs/competitors.json.
 * Hardcoded here to avoid Vite JSON import path issues.
 */
export const maxCallsMap: Record<string, number> = {
  explore: 80,
  maproom: 60,
  'maproom-skill': 50,
  'ast-grep': 20,
};
