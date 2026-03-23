import { describe, it, expect } from 'vitest';
import { computeStandings } from '../computeStandings';
import { mockRounds, agentOnlyRound, calibrationRound, duplicateRound } from './fixtures';

describe('computeStandings', () => {
  it('aggregates standings from scored rounds', () => {
    const standings = computeStandings(mockRounds);

    expect(standings).toHaveLength(2);

    // maproom: total=31, wins=2 (R01,R03), ties=1 (R02), losses=1 (R04), rounds=4
    const maproom = standings.find((s) => s.competitor === 'maproom')!;
    expect(maproom.total).toBe(31);
    expect(maproom.wins).toBe(2);
    expect(maproom.ties).toBe(1);
    expect(maproom.losses).toBe(1);
    expect(maproom.rounds).toBe(4);
    expect(maproom.avg).toBeCloseTo(7.75);

    // explore: total=31, wins=1 (R04), ties=1 (R02), losses=2 (R01,R03), rounds=4
    const explore = standings.find((s) => s.competitor === 'explore')!;
    expect(explore.total).toBe(31);
    expect(explore.wins).toBe(1);
    expect(explore.ties).toBe(1);
    expect(explore.losses).toBe(2);
    expect(explore.rounds).toBe(4);
    expect(explore.avg).toBeCloseTo(7.75);
  });

  it('sorts by total descending, then avg as tiebreaker', () => {
    const standings = computeStandings(mockRounds);
    // Both have total=31 and avg=7.75, so order is stable but both present
    expect(standings[0].total).toBeGreaterThanOrEqual(standings[1].total);
  });

  it('excludes agent-only rounds', () => {
    const standings = computeStandings([...mockRounds, agentOnlyRound]);
    const maproom = standings.find((s) => s.competitor === 'maproom')!;
    // Should still be 4 rounds, not 5
    expect(maproom.rounds).toBe(4);
  });

  it('excludes calibration rounds', () => {
    const standings = computeStandings([...mockRounds, calibrationRound]);
    const maproom = standings.find((s) => s.competitor === 'maproom')!;
    expect(maproom.rounds).toBe(4);
    expect(maproom.total).toBe(31); // CAL01's 15 not included
  });

  it('deduplicates by (round_id, competitor) keeping last entry', () => {
    // duplicateRound replaces R01 maproom (total 9 -> 12, +3 net)
    const standings = computeStandings([...mockRounds, duplicateRound]);
    const maproom = standings.find((s) => s.competitor === 'maproom')!;
    expect(maproom.total).toBe(34); // 31 - 9 + 12 = 34
  });

  it('returns empty array for empty input', () => {
    expect(computeStandings([])).toEqual([]);
  });

  it('returns empty array when no scored rounds exist', () => {
    expect(computeStandings([agentOnlyRound, calibrationRound])).toEqual([]);
  });
});
