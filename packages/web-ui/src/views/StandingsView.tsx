import { useMemo, useState } from 'react';
import {
  computeStandings,
  computeScoreTimeline,
  computeCodebaseBreakdown,
  computeWinTieLoss,
  computeEfficiencyScatter,
  computeStreaks,
} from '@/lib/transforms';
import {
  StandingsTable,
  ScoreTimeline,
  CodebaseBreakdown,
  WinTieLoss,
  EfficiencyScatter,
} from '@/components/charts';
import { buildColorMap } from '@/lib/chartColors';
import { useCompetitionData } from '@/hooks/use-competition-data';

type BreakdownMode = 'codebase' | 'query_category';

export function StandingsView() {
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>('codebase');

  const { rounds: liveRounds } = useCompetitionData();
  const rounds = liveRounds;

  const standings = useMemo(() => computeStandings(rounds), [rounds]);
  const competitors = useMemo(() => standings.map((s) => s.competitor), [standings]);
  const timeline = useMemo(() => computeScoreTimeline(rounds), [rounds]);
  const breakdown = useMemo(
    () => computeCodebaseBreakdown(rounds, breakdownMode),
    [rounds, breakdownMode],
  );
  const winTieLoss = useMemo(() => computeWinTieLoss(standings), [standings]);
  const scatter = useMemo(() => computeEfficiencyScatter(rounds), [rounds]);
  const streaks = useMemo(() => computeStreaks(rounds), [rounds]);

  // Build color map from CSS variables (falls back to static colors in SSR)
  const colorMap = useMemo(() => {
    if (typeof document === 'undefined') return undefined;
    try {
      return buildColorMap(competitors);
    } catch {
      return undefined;
    }
  }, [competitors]);

  return (
    <div className="space-y-8">
      {/* Standings Table */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Overall Standings</h2>
        <StandingsTable standings={standings} streaks={streaks} />
      </section>

      {/* Score Timeline */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Score Progression</h2>
        <ScoreTimeline
          data={timeline}
          competitors={competitors}
          colorMap={colorMap}
        />
      </section>

      {/* Codebase / Category Breakdown */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Breakdown</h2>
          <div className="flex rounded-md border border-border text-sm">
            <button
              className={`px-3 py-1 transition-colors ${
                breakdownMode === 'codebase'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setBreakdownMode('codebase')}
            >
              By Codebase
            </button>
            <button
              className={`px-3 py-1 transition-colors ${
                breakdownMode === 'query_category'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setBreakdownMode('query_category')}
            >
              By Category
            </button>
          </div>
        </div>
        <CodebaseBreakdown
          data={breakdown}
          competitors={competitors}
          colorMap={colorMap}
        />
      </section>

      {/* Win/Tie/Loss Donuts + Efficiency Scatter side by side */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Win / Tie / Loss</h2>
          <WinTieLoss data={winTieLoss} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Efficiency</h2>
          <EfficiencyScatter
            data={scatter}
            competitors={competitors}
            colorMap={colorMap}
          />
        </section>
      </div>
    </div>
  );
}
