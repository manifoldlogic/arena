import { useMemo } from 'react';
import { groupRoundsByRoundId } from '@/lib/round-transforms';
import type { RoundGroup } from '@/lib/round-transforms';
import { MOCK_ROUNDS } from '@/data/mock-rounds';

export interface UseRoundDetailResult {
  group: RoundGroup | null;
  loading: boolean;
}

/**
 * Finds a single round group by round_id from mock data.
 * When a real API exists, this will fetch from /api/rounds/:id.
 */
export function useRoundDetail(roundId: string | undefined): UseRoundDetailResult {
  const group = useMemo(() => {
    if (!roundId) return null;
    const groups = groupRoundsByRoundId(MOCK_ROUNDS);
    return groups.find((g) => g.roundId === roundId) ?? null;
  }, [roundId]);

  return { group, loading: false };
}
