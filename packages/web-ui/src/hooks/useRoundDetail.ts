import { useMemo } from 'react';
import { groupRoundsByRoundId } from '@/lib/round-transforms';
import type { RoundGroup } from '@/lib/round-transforms';
import { useCompetitionData } from '@/hooks/use-competition-data';

export interface UseRoundDetailResult {
  group: RoundGroup | null;
  loading: boolean;
}

/**
 * Finds a single round group by round_id from live competition data.
 */
export function useRoundDetail(roundId: string | undefined): UseRoundDetailResult {
  const { rounds, loading } = useCompetitionData();
  const group = useMemo(() => {
    if (!roundId || rounds.length === 0) return null;
    const groups = groupRoundsByRoundId(rounds);
    return groups.find((g) => g.roundId === roundId) ?? null;
  }, [roundId, rounds]);

  return { group, loading };
}
