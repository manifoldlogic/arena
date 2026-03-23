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
    performance_budget: { max_calls: 80, max_time_s: 600 },
  },
  {
    name: 'maproom-skill',
    paradigm: 'skill-based',
    model: 'claude-opus-4-20250514',
    tools: ['Bash', 'Grep', 'Glob', 'Read'],
    performance_budget: { max_calls: 50, max_time_s: 180 },
  },
  {
    name: 'ast-grep',
    paradigm: 'structural-ast',
    model: 'claude-haiku-4-5-20251001',
    tools: ['Bash', 'Grep', 'Glob', 'Read'],
    performance_budget: { max_calls: 20, max_time_s: 120 },
  },
];
