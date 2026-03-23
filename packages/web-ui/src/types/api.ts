import type { RoundResult, CompetitorStanding, CompetitionStatus } from '@arena/schemas';

export interface CompetitionData {
  rounds: RoundResult[];
  standings: CompetitorStanding[];
  competition: CompetitionStatus | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
