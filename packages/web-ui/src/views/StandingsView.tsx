import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CompetitorStanding } from '@arena/schemas';
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
import { maxCallsMap } from '@/lib/maxCalls';

type BreakdownMode = 'codebase' | 'query_category';
type ScoreMode = 'raw' | 'qas';

function LeaderSummary({ standings }: { standings: CompetitorStanding[] }) {
  if (standings.length < 2) return null;

  const leader = standings[0];
  const second = standings[1];
  const gap = leader.total - second.total;
  const maxScore = leader.total;
  const leaderPct = maxScore > 0 ? 100 : 0;
  const secondPct = maxScore > 0 ? (second.total / maxScore) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {leader.competitor}
        </span>
        <span className="text-sm font-medium text-muted-foreground">leads by {gap} pts</span>
      </div>

      <div className="mt-4 space-y-2">
        {/* Leader bar */}
        <div className="flex items-center gap-3">
          <span className="w-28 truncate text-sm font-medium">{leader.competitor}</span>
          <div className="flex-1">
            <div
              className="h-3 rounded-full bg-primary transition-all"
              style={{ width: `${leaderPct}%` }}
            />
          </div>
          <span className="w-14 text-right font-mono text-sm font-semibold">{leader.total}</span>
        </div>

        {/* 2nd place bar */}
        <div className="flex items-center gap-3">
          <span className="w-28 truncate text-sm font-medium text-muted-foreground">
            {second.competitor}
          </span>
          <div className="flex-1">
            <div
              className="h-3 rounded-full bg-muted-foreground/30 transition-all"
              style={{ width: `${secondPct}%` }}
            />
          </div>
          <span className="w-14 text-right font-mono text-sm text-muted-foreground">
            {second.total}
          </span>
        </div>
      </div>
    </div>
  );
}

export function StandingsView() {
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>('codebase');
  const [scoreMode, setScoreMode] = useState<ScoreMode>('raw');

  const { rounds: liveRounds } = useCompetitionData();
  const rounds = liveRounds;

  const standings = useMemo(
    () => computeStandings(rounds, scoreMode === 'qas' ? maxCallsMap : undefined),
    [rounds, scoreMode],
  );
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Standings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overall standings, score progression, and performance breakdown.
        </p>
      </div>

      {/* Leader Summary */}
      <LeaderSummary standings={standings} />

      {/* Standings Table */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Overall Standings</h2>
          <div className="flex rounded-md border border-border text-sm">
            <button
              className={`px-3 py-1 transition-colors ${
                scoreMode === 'raw'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setScoreMode('raw')}
            >
              Raw
            </button>
            <button
              className={`px-3 py-1 transition-colors ${
                scoreMode === 'qas'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setScoreMode('qas')}
            >
              QAS
            </button>
          </div>
        </div>
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
        <AnimatePresence mode="wait">
          <motion.div
            key={breakdownMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <CodebaseBreakdown
              data={breakdown}
              competitors={competitors}
              colorMap={colorMap}
            />
          </motion.div>
        </AnimatePresence>
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
