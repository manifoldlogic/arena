import { describe, it, expect } from 'vitest';
import { computeWinTieLoss } from '../computeWinTieLoss';
import type { CompetitorStanding } from '@arena/schemas';

const standings: CompetitorStanding[] = [
  { competitor: 'maproom', total: 31, wins: 2, ties: 1, losses: 1, rounds: 4, avg: 7.75 },
  { competitor: 'explore', total: 31, wins: 1, ties: 1, losses: 2, rounds: 4, avg: 7.75 },
];

describe('computeWinTieLoss', () => {
  it('extracts W-T-L entries from standings', () => {
    const wtl = computeWinTieLoss(standings);

    expect(wtl).toHaveLength(2);

    expect(wtl[0]).toEqual({
      competitor: 'maproom',
      wins: 2,
      ties: 1,
      losses: 1,
      total: 4,
    });

    expect(wtl[1]).toEqual({
      competitor: 'explore',
      wins: 1,
      ties: 1,
      losses: 2,
      total: 4,
    });
  });

  it('returns empty array for empty standings', () => {
    expect(computeWinTieLoss([])).toEqual([]);
  });

  it('preserves order from input standings', () => {
    const reversed = [...standings].reverse();
    const wtl = computeWinTieLoss(reversed);
    expect(wtl[0].competitor).toBe('explore');
    expect(wtl[1].competitor).toBe('maproom');
  });
});
