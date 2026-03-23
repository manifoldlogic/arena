/**
 * Standings computation module — TypeScript implementation.
 *
 * Mirrors the Python generate_golden.py logic exactly so both languages
 * produce identical results from the same JSONL input.
 */

import type { RoundResult, CompetitorStanding } from './index.js';

/** Round-level divergence record. */
export interface Divergence {
  round_id: string;
  divergence_signal: string;
  spread: number;
}

/** Closest-call record for rounds with margin <= 1. */
export interface ClosestCall {
  round_id: string;
  margin: number;
  competitors: string[];
}

/** Per-competitor precision/recall/insight sums. */
export interface DimensionTotals {
  [competitor: string]: {
    precision: number;
    recall: number;
    insight: number;
  };
}

/** Full standings result matching the golden file structure. */
export interface StandingsResult {
  metadata: {
    fixture: string;
    total_raw_entries: number;
    total_after_dedup: number;
    total_scorable: number;
    generator: string;
  };
  overall: CompetitorStanding[];
  by_codebase: Record<string, CompetitorStanding[]>;
  by_category: Record<string, CompetitorStanding[]>;
  divergences: Divergence[];
  closest_calls: ClosestCall[];
  dimension_totals: DimensionTotals;
}

/**
 * Deduplicate entries: for same (round_id, competitor), keep source=score over agent.
 */
export function deduplicate(entries: RoundResult[]): RoundResult[] {
  const best = new Map<string, RoundResult>();
  for (const entry of entries) {
    const key = `${entry.round_id}::${entry.competitor}`;
    const existing = best.get(key);
    if (existing) {
      if (existing.source === 'agent' && entry.source === 'score') {
        best.set(key, entry);
      }
    } else {
      best.set(key, entry);
    }
  }
  return Array.from(best.values());
}

/**
 * Filter to non-calibration entries that have a total (source=score after dedup).
 */
export function scorableEntries(entries: RoundResult[]): RoundResult[] {
  return entries.filter(e => !e.is_calibration && e.total != null);
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function computeRoundOutcomes(roundEntries: RoundResult[]): Map<string, 'win' | 'tie' | 'loss'> {
  const outcomes = new Map<string, 'win' | 'tie' | 'loss'>();
  if (roundEntries.length === 0) return outcomes;

  const totals = new Map<string, number>();
  for (const e of roundEntries) {
    totals.set(e.competitor, e.total!);
  }

  const maxTotal = Math.max(...totals.values());
  const topCompetitors = [...totals.entries()].filter(([, t]) => t === maxTotal).map(([c]) => c);

  if (topCompetitors.length === 1) {
    for (const comp of totals.keys()) {
      outcomes.set(comp, comp === topCompetitors[0] ? 'win' : 'loss');
    }
  } else {
    for (const comp of totals.keys()) {
      outcomes.set(comp, topCompetitors.includes(comp) ? 'tie' : 'loss');
    }
  }
  return outcomes;
}

/**
 * Round a number to 2 decimal places, matching Python's round() behavior.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute CompetitorStanding[] from a list of entries.
 * Filters to scorable internally, groups by round, determines outcomes.
 */
export function computeStandings(entries: RoundResult[]): CompetitorStanding[] {
  const scorable = scorableEntries(entries);
  const byRound = groupBy(scorable, e => e.round_id);

  const stats = new Map<string, {
    total: number; wins: number; ties: number; losses: number;
    rounds: number; precision: number; recall: number; insight: number;
  }>();

  const getStat = (comp: string) => {
    let s = stats.get(comp);
    if (!s) {
      s = { total: 0, wins: 0, ties: 0, losses: 0, rounds: 0, precision: 0, recall: 0, insight: 0 };
      stats.set(comp, s);
    }
    return s;
  };

  for (const [, roundEntries] of byRound) {
    const outcomes = computeRoundOutcomes(roundEntries);
    for (const entry of roundEntries) {
      const s = getStat(entry.competitor);
      s.total += entry.total!;
      s.rounds += 1;
      s.precision += entry.precision ?? 0;
      s.recall += entry.recall ?? 0;
      s.insight += entry.insight ?? 0;
      const outcome = outcomes.get(entry.competitor) ?? 'loss';
      if (outcome === 'win') s.wins++;
      else if (outcome === 'tie') s.ties++;
      else s.losses++;
    }
  }

  const standings: CompetitorStanding[] = [];
  for (const [comp, s] of stats) {
    standings.push({
      competitor: comp,
      total: s.total,
      wins: s.wins,
      ties: s.ties,
      losses: s.losses,
      rounds: s.rounds,
      avg: s.rounds > 0 ? round2(s.total / s.rounds) : 0,
    });
  }

  standings.sort((a, b) => b.total - a.total || a.competitor.localeCompare(b.competitor));
  return standings;
}

/**
 * Compute divergences from entries with divergence_signal set.
 */
export function computeDivergences(entries: RoundResult[]): Divergence[] {
  const scorable = scorableEntries(entries);
  const byRound = groupBy(scorable, e => e.round_id);
  const divergences: Divergence[] = [];

  const sortedRoundIds = [...byRound.keys()].sort();
  for (const roundId of sortedRoundIds) {
    const roundEntries = byRound.get(roundId)!;
    const signals = roundEntries
      .map(e => e.divergence_signal)
      .filter((s): s is string => s != null);
    if (signals.length === 0) continue;

    const totals = roundEntries.map(e => e.total!);
    const spread = totals.length >= 2 ? Math.max(...totals) - Math.min(...totals) : 0;
    divergences.push({ round_id: roundId, divergence_signal: signals[0], spread });
  }

  return divergences;
}

/**
 * Find rounds where margin between winner and runner-up is <= 1.
 */
export function computeClosestCalls(entries: RoundResult[]): ClosestCall[] {
  const scorable = scorableEntries(entries);
  const byRound = groupBy(scorable, e => e.round_id);
  const closest: ClosestCall[] = [];

  const sortedRoundIds = [...byRound.keys()].sort();
  for (const roundId of sortedRoundIds) {
    const roundEntries = byRound.get(roundId)!;
    if (roundEntries.length < 2) continue;

    const totals = roundEntries.map(e => e.total!).sort((a, b) => b - a);
    const margin = totals[0] - totals[1];
    if (margin <= 1) {
      const competitors = roundEntries.map(e => e.competitor).sort();
      closest.push({ round_id: roundId, margin, competitors });
    }
  }

  return closest;
}

/**
 * Compute per-competitor dimension totals (precision, recall, insight).
 */
export function computeDimensionTotals(entries: RoundResult[]): DimensionTotals {
  const scorable = scorableEntries(entries);
  const dims: DimensionTotals = {};

  for (const e of scorable) {
    if (!dims[e.competitor]) {
      dims[e.competitor] = { precision: 0, recall: 0, insight: 0 };
    }
    dims[e.competitor].precision += e.precision ?? 0;
    dims[e.competitor].recall += e.recall ?? 0;
    dims[e.competitor].insight += e.insight ?? 0;
  }

  // Return sorted by competitor name
  const sorted: DimensionTotals = {};
  for (const comp of Object.keys(dims).sort()) {
    sorted[comp] = dims[comp];
  }
  return sorted;
}

/**
 * Compute full standings result from raw entries, matching golden file structure.
 */
export function computeAll(rawEntries: RoundResult[], fixtureName: string): StandingsResult {
  const entries = deduplicate(rawEntries);
  const scorable = scorableEntries(entries);

  // Overall
  const overall = computeStandings(entries);

  // By codebase
  const byCodebaseGroups = groupBy(scorable, e => e.codebase);
  const by_codebase: Record<string, CompetitorStanding[]> = {};
  for (const codebase of [...byCodebaseGroups.keys()].sort()) {
    by_codebase[codebase] = computeStandings(byCodebaseGroups.get(codebase)!);
  }

  // By category
  const byCatGroups = groupBy(scorable, e => e.query_category ?? 'unknown');
  const by_category: Record<string, CompetitorStanding[]> = {};
  for (const cat of [...byCatGroups.keys()].sort()) {
    by_category[cat] = computeStandings(byCatGroups.get(cat)!);
  }

  return {
    metadata: {
      fixture: fixtureName,
      total_raw_entries: rawEntries.length,
      total_after_dedup: entries.length,
      total_scorable: scorable.length,
      generator: 'generate_golden.py',
    },
    overall,
    by_codebase,
    by_category,
    divergences: computeDivergences(entries),
    closest_calls: computeClosestCalls(entries),
    dimension_totals: computeDimensionTotals(entries),
  };
}
