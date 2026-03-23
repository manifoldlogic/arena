import { describe, it, expect } from 'vitest';
import { computeScoreTimeline } from '../computeScoreTimeline';
import { mockRounds, agentOnlyRound, calibrationRound } from './fixtures';

describe('computeScoreTimeline', () => {
  it('computes cumulative scores over rounds', () => {
    const timeline = computeScoreTimeline(mockRounds);

    expect(timeline).toHaveLength(4); // R01-R04

    // R01: maproom=9, explore=7
    expect(timeline[0].round_id).toBe('R01');
    expect(timeline[0]['maproom']).toBe(9);
    expect(timeline[0]['explore']).toBe(7);

    // R02: maproom=9+7=16, explore=7+7=14
    expect(timeline[1].round_id).toBe('R02');
    expect(timeline[1]['maproom']).toBe(16);
    expect(timeline[1]['explore']).toBe(14);

    // R03: maproom=16+10=26, explore=14+8=22
    expect(timeline[2].round_id).toBe('R03');
    expect(timeline[2]['maproom']).toBe(26);
    expect(timeline[2]['explore']).toBe(22);

    // R04: maproom=26+5=31, explore=22+9=31
    expect(timeline[3].round_id).toBe('R04');
    expect(timeline[3]['maproom']).toBe(31);
    expect(timeline[3]['explore']).toBe(31);
  });

  it('sorts rounds by timestamp', () => {
    // Reverse the input order — timeline should still be R01-R04
    const reversed = [...mockRounds].reverse();
    const timeline = computeScoreTimeline(reversed);
    expect(timeline.map((t) => t.round_id)).toEqual(['R01', 'R02', 'R03', 'R04']);
  });

  it('carries forward cumulative score when competitor missing from a round', () => {
    // Only include maproom for R01, both for R02
    const partial = mockRounds.filter(
      (r) => !(r.round_id === 'R01' && r.competitor === 'explore'),
    );
    const timeline = computeScoreTimeline(partial);

    // R01: maproom=9, explore=0 (no data, starts at 0)
    expect(timeline[0]['maproom']).toBe(9);
    expect(timeline[0]['explore']).toBe(0);

    // R02: maproom=16, explore=0+7=7
    expect(timeline[1]['maproom']).toBe(16);
    expect(timeline[1]['explore']).toBe(7);
  });

  it('excludes agent-only and calibration rounds', () => {
    const timeline = computeScoreTimeline([
      ...mockRounds,
      agentOnlyRound,
      calibrationRound,
    ]);
    expect(timeline).toHaveLength(4);
  });

  it('returns empty array for empty input', () => {
    expect(computeScoreTimeline([])).toEqual([]);
  });
});
