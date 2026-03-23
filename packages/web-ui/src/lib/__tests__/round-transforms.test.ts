import { describe, it, expect } from 'vitest';
import type { RoundResult } from '@arena/schemas';
import {
  groupRoundsByRoundId,
  computeRadarData,
  computeH2HAverages,
  computeMargins,
  computeCategoryMatrix,
  computeBridgeDeltas,
} from '../round-transforms';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    schema_version: 1,
    round_id: 'r1',
    competitor: 'claude-code',
    round_type: 'regular',
    codebase: 'django',
    phase: 1,
    precision: 8,
    recall: 7,
    insight: 6,
    total: 21,
    calls: 5,
    time_s: 30,
    source: 'score',
    is_calibration: false,
    ...overrides,
  };
}

const claude = (roundId: string, total: number, extras: Partial<RoundResult> = {}) =>
  makeResult({
    round_id: roundId,
    competitor: 'claude-code',
    total,
    precision: Math.round(total / 3),
    recall: Math.round(total / 3),
    insight: total - 2 * Math.round(total / 3),
    ...extras,
  });

const codex = (roundId: string, total: number, extras: Partial<RoundResult> = {}) =>
  makeResult({
    round_id: roundId,
    competitor: 'codex-cli',
    total,
    precision: Math.round(total / 3),
    recall: Math.round(total / 3),
    insight: total - 2 * Math.round(total / 3),
    ...extras,
  });

// ---------------------------------------------------------------------------
// groupRoundsByRoundId
// ---------------------------------------------------------------------------

describe('groupRoundsByRoundId', () => {
  it('groups results sharing the same round_id', () => {
    const rounds = [
      claude('r1', 21),
      codex('r1', 18),
      claude('r2', 20),
      codex('r2', 22),
    ];
    const groups = groupRoundsByRoundId(rounds);
    expect(groups).toHaveLength(2);
    expect(groups[0].roundId).toBe('r1');
    expect(groups[0].results).toHaveLength(2);
    expect(groups[1].roundId).toBe('r2');
    expect(groups[1].results).toHaveLength(2);
  });

  it('deduplicates: prefers source="score" over source="agent"', () => {
    const agentEntry = makeResult({ source: 'agent', total: 0, precision: 0, recall: 0, insight: 0 });
    const scoreEntry = makeResult({ source: 'score', total: 21 });
    // agent first, then score — score should win
    const groups = groupRoundsByRoundId([agentEntry, scoreEntry]);
    expect(groups).toHaveLength(1);
    expect(groups[0].results).toHaveLength(1);
    expect(groups[0].results[0].source).toBe('score');
    expect(groups[0].results[0].total).toBe(21);
  });

  it('deduplicates: keeps score when agent comes after', () => {
    const scoreEntry = makeResult({ source: 'score', total: 21 });
    const agentEntry = makeResult({ source: 'agent', total: 0 });
    // score first, then agent — score should still win
    const groups = groupRoundsByRoundId([scoreEntry, agentEntry]);
    expect(groups[0].results[0].source).toBe('score');
  });

  it('deduplicates: same source keeps last', () => {
    const first = makeResult({ source: 'score', total: 18 });
    const second = makeResult({ source: 'score', total: 21 });
    const groups = groupRoundsByRoundId([first, second]);
    expect(groups[0].results[0].total).toBe(21);
  });

  it('returns empty array for empty input', () => {
    expect(groupRoundsByRoundId([])).toEqual([]);
  });

  it('preserves codebase and roundType from first entry', () => {
    const groups = groupRoundsByRoundId([
      makeResult({ codebase: 'fastapi', round_type: 'bridge' }),
    ]);
    expect(groups[0].codebase).toBe('fastapi');
    expect(groups[0].roundType).toBe('bridge');
  });
});

// ---------------------------------------------------------------------------
// computeRadarData
// ---------------------------------------------------------------------------

describe('computeRadarData', () => {
  it('produces one series per competitor with 3 axes', () => {
    const results = [claude('r1', 21), codex('r1', 18)];
    const radar = computeRadarData(results);
    expect(radar).toHaveLength(2);
    expect(radar[0].dataPoints).toHaveLength(3);
    expect(radar[0].dataPoints.map((d) => d.axis)).toEqual([
      'precision',
      'recall',
      'insight',
    ]);
  });

  it('averages scores across multiple rounds for the same competitor', () => {
    const results = [
      makeResult({ precision: 8, recall: 6, insight: 4 }),
      makeResult({ precision: 10, recall: 8, insight: 6 }),
    ];
    const radar = computeRadarData(results);
    expect(radar).toHaveLength(1);
    expect(radar[0].dataPoints[0].value).toBe(9); // avg precision
    expect(radar[0].dataPoints[1].value).toBe(7); // avg recall
    expect(radar[0].dataPoints[2].value).toBe(5); // avg insight
  });

  it('skips entries without scores', () => {
    const results = [
      makeResult({ precision: undefined, recall: undefined, insight: undefined, source: 'agent' }),
    ];
    const radar = computeRadarData(results);
    expect(radar).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(computeRadarData([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeH2HAverages
// ---------------------------------------------------------------------------

describe('computeH2HAverages', () => {
  it('computes averages for shared rounds only', () => {
    const rounds = [
      claude('r1', 21, { precision: 8, recall: 7, insight: 6 }),
      codex('r1', 18, { precision: 6, recall: 6, insight: 6 }),
      claude('r2', 24, { precision: 9, recall: 8, insight: 7 }),
      codex('r2', 15, { precision: 5, recall: 5, insight: 5 }),
      claude('r3', 20), // no codex in r3 — should be excluded
    ];
    const h2h = computeH2HAverages(rounds, 'claude-code', 'codex-cli');
    expect(h2h).not.toBeNull();
    expect(h2h!.roundCount).toBe(2);
    expect(h2h!.avgA.precision).toBe(8.5);
    expect(h2h!.avgA.recall).toBe(7.5);
    expect(h2h!.avgB.total).toBe(16.5);
  });

  it('returns null when no shared rounds exist', () => {
    const rounds = [
      claude('r1', 21),
      codex('r2', 18),
    ];
    expect(computeH2HAverages(rounds, 'claude-code', 'codex-cli')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(computeH2HAverages([], 'a', 'b')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeMargins
// ---------------------------------------------------------------------------

describe('computeMargins', () => {
  it('computes positive margin when A leads', () => {
    const rounds = [claude('r1', 21), codex('r1', 18)];
    const margins = computeMargins(rounds, 'claude-code', 'codex-cli');
    expect(margins).toHaveLength(1);
    expect(margins[0].margin).toBe(3);
    expect(margins[0].roundId).toBe('r1');
  });

  it('computes negative margin when B leads', () => {
    const rounds = [claude('r1', 15), codex('r1', 20)];
    const margins = computeMargins(rounds, 'claude-code', 'codex-cli');
    expect(margins[0].margin).toBe(-5);
  });

  it('computes zero margin for ties', () => {
    const rounds = [claude('r1', 20), codex('r1', 20)];
    const margins = computeMargins(rounds, 'claude-code', 'codex-cli');
    expect(margins[0].margin).toBe(0);
  });

  it('skips rounds where one competitor is missing', () => {
    const rounds = [claude('r1', 21), codex('r2', 18)];
    const margins = computeMargins(rounds, 'claude-code', 'codex-cli');
    expect(margins).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(computeMargins([], 'a', 'b')).toEqual([]);
  });

  it('includes codebase in each margin', () => {
    const rounds = [
      claude('r1', 21, { codebase: 'fastapi' }),
      codex('r1', 18, { codebase: 'fastapi' }),
    ];
    const margins = computeMargins(rounds, 'claude-code', 'codex-cli');
    expect(margins[0].codebase).toBe('fastapi');
  });
});

// ---------------------------------------------------------------------------
// computeCategoryMatrix
// ---------------------------------------------------------------------------

describe('computeCategoryMatrix', () => {
  it('produces per-category averages for shared rounds', () => {
    const rounds = [
      claude('r1', 21, { query_category: 'flow' }),
      codex('r1', 18, { query_category: 'flow' }),
      claude('r2', 24, { query_category: 'flow' }),
      codex('r2', 15, { query_category: 'flow' }),
      claude('r3', 20, { query_category: 'pattern' }),
      codex('r3', 22, { query_category: 'pattern' }),
    ];
    const matrix = computeCategoryMatrix(rounds, 'claude-code', 'codex-cli');
    expect(matrix).toHaveLength(2);

    const flow = matrix.find((m) => m.category === 'flow')!;
    expect(flow.avgA).toBe(22.5);
    expect(flow.avgB).toBe(16.5);
    expect(flow.advantage).toBe(6);
    expect(flow.roundCount).toBe(2);

    const pattern = matrix.find((m) => m.category === 'pattern')!;
    expect(pattern.advantage).toBe(-2);
  });

  it('skips rounds without query_category', () => {
    const rounds = [
      claude('r1', 21), // no query_category
      codex('r1', 18),
    ];
    const matrix = computeCategoryMatrix(rounds, 'claude-code', 'codex-cli');
    expect(matrix).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(computeCategoryMatrix([], 'a', 'b')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeBridgeDeltas
// ---------------------------------------------------------------------------

describe('computeBridgeDeltas', () => {
  it('computes deltas between series1 scores and baseline', () => {
    const rounds: RoundResult[] = [
      makeResult({
        round_type: 'bridge',
        series1_scores: { precision: 9, recall: 8, insight: 7 },
        series1_baseline: { precision: 7, recall: 6, insight: 5 },
      }),
    ];
    const deltas = computeBridgeDeltas(rounds);
    expect(deltas).toHaveLength(1);
    expect(deltas[0].deltas.precision).toBe(2);
    expect(deltas[0].deltas.recall).toBe(2);
    expect(deltas[0].deltas.insight).toBe(2);
  });

  it('handles negative deltas (regression)', () => {
    const rounds: RoundResult[] = [
      makeResult({
        round_type: 'bridge',
        series1_scores: { precision: 5, recall: 4, insight: 3 },
        series1_baseline: { precision: 7, recall: 6, insight: 5 },
      }),
    ];
    const deltas = computeBridgeDeltas(rounds);
    expect(deltas[0].deltas.precision).toBe(-2);
    expect(deltas[0].deltas.recall).toBe(-2);
    expect(deltas[0].deltas.insight).toBe(-2);
  });

  it('skips non-bridge rounds', () => {
    const rounds: RoundResult[] = [
      makeResult({
        round_type: 'regular',
        series1_scores: { precision: 9, recall: 8, insight: 7 },
        series1_baseline: { precision: 7, recall: 6, insight: 5 },
      }),
    ];
    expect(computeBridgeDeltas(rounds)).toHaveLength(0);
  });

  it('skips bridge rounds without baseline data', () => {
    const rounds: RoundResult[] = [
      makeResult({
        round_type: 'bridge',
        series1_scores: { precision: 9, recall: 8, insight: 7 },
        // no series1_baseline
      }),
    ];
    expect(computeBridgeDeltas(rounds)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(computeBridgeDeltas([])).toEqual([]);
  });

  it('includes competitor and codebase in output', () => {
    const rounds: RoundResult[] = [
      makeResult({
        round_type: 'bridge',
        competitor: 'codex-cli',
        codebase: 'fastapi',
        series1_scores: { precision: 9, recall: 8, insight: 7 },
        series1_baseline: { precision: 7, recall: 6, insight: 5 },
      }),
    ];
    const deltas = computeBridgeDeltas(rounds);
    expect(deltas[0].competitor).toBe('codex-cli');
    expect(deltas[0].codebase).toBe('fastapi');
  });
});
