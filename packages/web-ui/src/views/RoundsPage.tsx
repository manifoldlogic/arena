import { useMemo } from 'react';
import { groupRoundsByRoundId } from '@/lib/round-transforms';
import { useRoundFilters } from '@/hooks/useRoundFilters';
import { RoundListTable } from '@/components/rounds/RoundListTable';
import { RoundFilters } from '@/components/rounds/RoundFilters';
import { useCompetitionData } from '@/hooks/use-competition-data';

export function RoundsPage() {
  const { rounds } = useCompetitionData();
  const allGroups = useMemo(() => groupRoundsByRoundId(rounds), [rounds]);
  const filtersState = useRoundFilters();
  const filteredGroups = useMemo(
    () => filtersState.applyFilters(allGroups),
    [allGroups, filtersState],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Round Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filteredGroups.length} of {allGroups.length} rounds
        </p>
      </div>

      <RoundFilters filtersState={filtersState} groups={allGroups} />
      <RoundListTable
        groups={filteredGroups}
        sortField={filtersState.sortField}
        sortDir={filtersState.sortDir}
        onSort={filtersState.setSort}
      />
    </div>
  );
}
