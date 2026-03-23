import { useMemo } from 'react';
import { groupRoundsByRoundId } from '@/lib/round-transforms';
import { useRoundFilters } from '@/hooks/useRoundFilters';
import { RoundListTable } from '@/components/rounds/RoundListTable';
import { RoundFilters } from '@/components/rounds/RoundFilters';
import { MOCK_ROUNDS } from '@/data/mock-rounds';

export function RoundsPage() {
  const allGroups = useMemo(() => groupRoundsByRoundId(MOCK_ROUNDS), []);
  const filtersState = useRoundFilters();
  const filteredGroups = useMemo(
    () => filtersState.applyFilters(allGroups),
    [allGroups, filtersState],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Round Analysis</h1>
        <p className="mt-1 text-sm text-slate-500">
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
