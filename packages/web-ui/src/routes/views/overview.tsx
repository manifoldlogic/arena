import { useMemo } from 'react';
import { computeStreaks } from '@/lib/transforms';
import { StreakBanner } from '@/components/charts';
import { useCompetitionData } from '@/hooks/use-competition-data';

export function OverviewView() {
  const { rounds } = useCompetitionData();
  const streaks = useMemo(() => computeStreaks(rounds), [rounds]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      <StreakBanner streaks={streaks} />
      <p className="text-muted-foreground">
        Competition dashboard overview with key metrics and recent activity.
      </p>
    </div>
  );
}
