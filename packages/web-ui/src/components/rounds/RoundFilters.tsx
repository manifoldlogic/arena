import type { RoundFiltersState } from '@/hooks/useRoundFilters';
import type { RoundGroup } from '@/lib/round-transforms';

interface RoundFiltersProps {
  filtersState: RoundFiltersState;
  groups: RoundGroup[];
}

export function RoundFilters({ filtersState, groups }: RoundFiltersProps) {
  const { filters, setFilter, clearFilters } = filtersState;

  // Derive unique options from data
  const codebases = [...new Set(groups.map((g) => g.codebase))].sort();
  const roundTypes = [...new Set(groups.map((g) => g.roundType))].sort();
  const categories = [
    ...new Set(
      groups.flatMap((g) =>
        g.results.map((r) => r.query_category).filter(Boolean),
      ),
    ),
  ].sort();
  const winners = [
    ...new Set(
      groups.flatMap((g) =>
        g.results.map((r) => r.round_winner).filter((w): w is string => w != null),
      ),
    ),
  ].sort();

  const hasActiveFilters = Object.values(filters).some((v) => v != null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="rounded border border-input px-2 py-1.5 text-sm bg-background"
        value={filters.codebase ?? ''}
        onChange={(e) => setFilter('codebase', e.target.value || null)}
      >
        <option value="">All codebases</option>
        {codebases.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="rounded border border-input px-2 py-1.5 text-sm bg-background"
        value={filters.roundType ?? ''}
        onChange={(e) =>
          setFilter('roundType', (e.target.value || null) as typeof filters.roundType)
        }
      >
        <option value="">All types</option>
        {roundTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        className="rounded border border-input px-2 py-1.5 text-sm bg-background"
        value={filters.category ?? ''}
        onChange={(e) =>
          setFilter('category', (e.target.value || null) as typeof filters.category)
        }
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="rounded border border-input px-2 py-1.5 text-sm bg-background"
        value={filters.winner ?? ''}
        onChange={(e) => setFilter('winner', e.target.value || null)}
      >
        <option value="">All winners</option>
        {winners.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          className="text-sm text-muted-foreground hover:text-foreground underline"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
