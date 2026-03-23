/**
 * Analytics module — per-round detail, divergence signals, dimension totals,
 * bridge rounds, calibration, and closest-call analysis.
 */
import type { RoundResult } from "@arena/schemas";

/** Round-by-round detail row. */
export interface RoundDetail {
  round_id: string;
  competitor: string;
  precision: number;
  recall: number;
  insight: number;
  total: number;
  calls: number;
  time_s: number;
  divergence_signal?: string;
}

/** Divergence signal entry with computed spread. */
export interface DivergenceEntry {
  round_id: string;
  codebase: string;
  spread: number;
  signal: string;
}

/** Dimension totals per competitor. */
export interface DimensionTotals {
  competitor: string;
  precision: number;
  recall: number;
  insight: number;
}

/** Bridge round entry. */
export interface BridgeEntry {
  round_id: string;
  competitor: string;
  s2_precision: number;
  s2_recall: number;
  s2_insight: number;
  s2_total: number;
  s1_precision: number;
  s1_recall: number;
  s1_insight: number;
}

/** Calibration round entry. */
export interface CalibrationEntry {
  round_id: string;
  competitor: string;
  precision: number;
  recall: number;
  insight: number;
  total: number;
}

/** Closest call — round where winning margin <= threshold. */
export interface ClosestCall {
  round_id: string;
  codebase: string;
  competitors: string[];
  totals: number[];
  margin: number;
}

/** Get round-by-round detail sorted by round_id, competitor. */
export function getRoundDetails(
  scoredRounds: RoundResult[],
): RoundDetail[] {
  return scoredRounds
    .map((r) => ({
      round_id: r.round_id,
      competitor: r.competitor,
      precision: r.precision ?? 0,
      recall: r.recall ?? 0,
      insight: r.insight ?? 0,
      total: r.total ?? 0,
      calls: r.calls,
      time_s: r.time_s,
      divergence_signal: r.divergence_signal,
    }))
    .sort(
      (a, b) =>
        a.round_id.localeCompare(b.round_id) ||
        a.competitor.localeCompare(b.competitor),
    );
}

/**
 * Compute divergence signals with spread (max - min total per round).
 * Classified: gray (0-2), yellow (3-4), signal (5+).
 */
export function getDivergenceSignals(
  scoredRounds: RoundResult[],
): DivergenceEntry[] {
  const groups = new Map<string, RoundResult[]>();
  for (const r of scoredRounds) {
    const existing = groups.get(r.round_id);
    if (existing) existing.push(r);
    else groups.set(r.round_id, [r]);
  }

  const entries: DivergenceEntry[] = [];
  for (const [roundId, results] of groups) {
    const totals = results.map((r) => r.total ?? 0);
    const spread = Math.max(...totals) - Math.min(...totals);
    const signal =
      spread >= 5 ? "signal" : spread >= 3 ? "yellow" : "gray";
    entries.push({
      round_id: roundId,
      codebase: results[0].codebase,
      spread,
      signal,
    });
  }

  return entries.sort((a, b) => a.round_id.localeCompare(b.round_id));
}

/** Compute per-competitor dimension totals across scored rounds. */
export function getDimensionTotals(
  scoredRounds: RoundResult[],
): DimensionTotals[] {
  const map = new Map<
    string,
    { precision: number; recall: number; insight: number }
  >();

  for (const r of scoredRounds) {
    const existing = map.get(r.competitor);
    if (existing) {
      existing.precision += r.precision ?? 0;
      existing.recall += r.recall ?? 0;
      existing.insight += r.insight ?? 0;
    } else {
      map.set(r.competitor, {
        precision: r.precision ?? 0,
        recall: r.recall ?? 0,
        insight: r.insight ?? 0,
      });
    }
  }

  return Array.from(map.entries())
    .map(([competitor, dims]) => ({ competitor, ...dims }))
    .sort((a, b) => a.competitor.localeCompare(b.competitor));
}

/** Extract bridge round details. */
export function getBridgeRounds(
  scoredRounds: RoundResult[],
): BridgeEntry[] {
  return scoredRounds
    .filter((r) => r.round_type === "bridge")
    .map((r) => ({
      round_id: r.round_id,
      competitor: r.competitor,
      s2_precision: r.precision ?? 0,
      s2_recall: r.recall ?? 0,
      s2_insight: r.insight ?? 0,
      s2_total: r.total ?? 0,
      s1_precision: r.series1_scores?.precision ?? 0,
      s1_recall: r.series1_scores?.recall ?? 0,
      s1_insight: r.series1_scores?.insight ?? 0,
    }))
    .sort(
      (a, b) =>
        a.round_id.localeCompare(b.round_id) ||
        a.competitor.localeCompare(b.competitor),
    );
}

/** Extract calibration round details. */
export function getCalibrationRounds(
  calibrationRounds: RoundResult[],
): CalibrationEntry[] {
  return calibrationRounds
    .map((r) => ({
      round_id: r.round_id,
      competitor: r.competitor,
      precision: r.precision ?? 0,
      recall: r.recall ?? 0,
      insight: r.insight ?? 0,
      total: r.total ?? 0,
    }))
    .sort(
      (a, b) =>
        a.round_id.localeCompare(b.round_id) ||
        a.competitor.localeCompare(b.competitor),
    );
}

/**
 * Find closest calls — rounds where the winning margin <= maxMargin.
 * Margin = highest total - second highest total.
 */
export function getClosestCalls(
  scoredRounds: RoundResult[],
  maxMargin: number = 1,
): ClosestCall[] {
  const groups = new Map<string, RoundResult[]>();
  for (const r of scoredRounds) {
    const existing = groups.get(r.round_id);
    if (existing) existing.push(r);
    else groups.set(r.round_id, [r]);
  }

  const calls: ClosestCall[] = [];
  for (const [roundId, results] of groups) {
    if (results.length < 2) continue;

    const sorted = results
      .map((r) => ({ competitor: r.competitor, total: r.total ?? 0 }))
      .sort((a, b) => a.total - b.total);

    const highest = sorted[sorted.length - 1].total;
    const secondHighest = sorted[sorted.length - 2].total;
    const margin = highest - secondHighest;

    if (margin <= maxMargin) {
      calls.push({
        round_id: roundId,
        codebase: results[0].codebase,
        competitors: sorted.map((s) => s.competitor),
        totals: sorted.map((s) => s.total),
        margin,
      });
    }
  }

  return calls.sort((a, b) => a.round_id.localeCompare(b.round_id));
}
