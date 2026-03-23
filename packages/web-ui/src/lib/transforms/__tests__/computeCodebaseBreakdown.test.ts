import { describe, it, expect } from 'vitest';
import { computeCodebaseBreakdown } from '../computeCodebaseBreakdown';
import { mockRounds, agentOnlyRound, calibrationRound } from './fixtures';

describe('computeCodebaseBreakdown', () => {
  it('groups scores by codebase and competitor', () => {
    const breakdown = computeCodebaseBreakdown(mockRounds, 'codebase');

    // 2 codebases x 2 competitors = 4 entries
    expect(breakdown).toHaveLength(4);

    // django:maproom = R01(9) + R02(7) = 16
    const djangoMaproom = breakdown.find(
      (e) => e.group === 'django' && e.competitor === 'maproom',
    )!;
    expect(djangoMaproom.totalScore).toBe(16);
    expect(djangoMaproom.precision).toBe(5); // 3+2
    expect(djangoMaproom.recall).toBe(6);    // 4+2
    expect(djangoMaproom.insight).toBe(5);   // 2+3

    // fastapi:explore = R03(8) + R04(9) = 17
    const fastapiExplore = breakdown.find(
      (e) => e.group === 'fastapi' && e.competitor === 'explore',
    )!;
    expect(fastapiExplore.totalScore).toBe(17);
  });

  it('groups by query_category when specified', () => {
    const breakdown = computeCodebaseBreakdown(mockRounds, 'query_category');

    // Categories: flow, pattern, boundary — flow has 2 rounds per competitor
    const flowMaproom = breakdown.find(
      (e) => e.group === 'flow' && e.competitor === 'maproom',
    )!;
    expect(flowMaproom.totalScore).toBe(14); // R01(9) + R04(5)

    const patternExplore = breakdown.find(
      (e) => e.group === 'pattern' && e.competitor === 'explore',
    )!;
    expect(patternExplore.totalScore).toBe(7); // R02(7)
  });

  it('excludes agent-only and calibration rounds', () => {
    const breakdown = computeCodebaseBreakdown(
      [...mockRounds, agentOnlyRound, calibrationRound],
      'codebase',
    );
    const djangoMaproom = breakdown.find(
      (e) => e.group === 'django' && e.competitor === 'maproom',
    )!;
    expect(djangoMaproom.totalScore).toBe(16); // unchanged
  });

  it('returns sorted by group then competitor', () => {
    const breakdown = computeCodebaseBreakdown(mockRounds, 'codebase');
    const keys = breakdown.map((e) => `${e.group}:${e.competitor}`);
    expect(keys).toEqual([
      'django:explore',
      'django:maproom',
      'fastapi:explore',
      'fastapi:maproom',
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(computeCodebaseBreakdown([], 'codebase')).toEqual([]);
  });
});
