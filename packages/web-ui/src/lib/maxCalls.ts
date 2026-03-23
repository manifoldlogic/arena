/**
 * Max-calls budget per competitor, sourced from specs/competitors.json.
 *
 * Used by computeQAS to calculate efficiency bonuses.
 */
import competitorsData from '../../../specs/competitors.json';

interface Competitor {
  name: string;
  performance_budget: { max_calls: number };
}

const competitors = competitorsData as { competitors: Competitor[] };

export const maxCallsMap: Record<string, number> = Object.fromEntries(
  competitors.competitors.map((c) => [c.name, c.performance_budget.max_calls]),
);
