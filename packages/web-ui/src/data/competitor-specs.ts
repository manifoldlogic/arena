/**
 * Static competitor spec data from specs/competitors.json.
 *
 * Kept as a typed module so the rest of the app gets full type safety
 * without needing to resolve JSON imports outside src/.
 */

export interface CompetitorSpec {
  name: string;
  paradigm: string;
  model: string;
  tools: string[];
  performance_budget: { max_calls: number; max_time_s: number };
}

export const COMPETITOR_SPECS: CompetitorSpec[] = [
  {
    name: 'maproom',
    paradigm: 'indexed-search',
    model: 'claude-haiku-4-5-20251001',
    tools: ['crewchief-maproom'],
    performance_budget: { max_calls: 100, max_time_s: 300 },
  },
  {
    name: 'explore',
    paradigm: 'iterative-grep',
    model: 'claude-haiku-4-5-20251001',
    tools: ['Grep', 'Glob', 'Read'],
    performance_budget: { max_calls: 150, max_time_s: 400 },
  },
];
