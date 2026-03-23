import { useMemo } from 'react';
import { computeStandings, computeStreaks } from '@/lib/transforms';
import { StreakBanner } from '@/components/charts';
import { useCompetitionData } from '@/hooks/use-competition-data';
import type { RoundResult, CompetitorStanding } from '@arena/schemas';

function LeaderHeroBar({ standings }: { standings: CompetitorStanding[] }) {
  if (standings.length < 2) return null;
  const leader = standings[0];
  const second = standings[1];
  const margin = leader.total - second.total;
  const maxTotal = leader.total;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="text-sm text-muted-foreground mb-1">Competition Leader</div>
      <div className="text-3xl font-bold tracking-tight">{leader.competitor}</div>
      <div className="text-sm text-muted-foreground mt-1">
        leads by {margin} pts &middot; avg {leader.avg.toFixed(2)} per round
      </div>
      <div className="mt-4 space-y-2">
        {standings.slice(0, 4).map((s) => (
          <div key={s.competitor} className="flex items-center gap-3">
            <span className="w-28 text-sm truncate">{s.competitor}</span>
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(s.total / maxTotal) * 100}%`, opacity: s === leader ? 1 : 0.5 }}
              />
            </div>
            <span className="text-sm font-mono w-12 text-right">{s.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentRoundCard({ rounds }: { rounds: RoundResult[] }) {
  if (rounds.length === 0) return null;

  // Find the most recent round ID
  const latestRoundId = [...new Set(rounds.map((r) => r.round_id))].sort().pop();
  if (!latestRoundId) return null;

  const roundEntries = rounds.filter((r) => r.round_id === latestRoundId);
  const query = roundEntries[0]?.query_text || '';
  const codebase = roundEntries[0]?.codebase || '';
  const winner = roundEntries[0]?.round_winner;
  const signal = roundEntries[0]?.divergence_signal;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-primary">{latestRoundId}</span>
        <span className="text-xs text-muted-foreground">{codebase}</span>
        {signal && signal !== 'gray' && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            signal === 'signal' ? 'bg-destructive/20 text-destructive' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {signal.toUpperCase()}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{query}</p>
      <div className="grid grid-cols-2 gap-2">
        {roundEntries
          .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
          .map((r) => (
            <div
              key={r.competitor}
              className={`flex items-center justify-between px-3 py-1.5 rounded text-sm ${
                r.competitor === winner ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              <span className="truncate">{r.competitor}</span>
              <span className="font-mono">{r.total}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function QuickStats({ rounds }: { rounds: RoundResult[] }) {
  const roundIds = [...new Set(rounds.map((r) => r.round_id))];
  const competitors = [...new Set(rounds.map((r) => r.competitor))];
  const codebases = [...new Set(rounds.map((r) => r.codebase))];
  const signals = rounds.filter((r) => r.divergence_signal === 'signal').length;
  const uniqueSignalRounds = [...new Set(
    rounds.filter((r) => r.divergence_signal === 'signal').map((r) => r.round_id),
  )].length;

  const stats = [
    { label: 'Rounds', value: roundIds.length },
    { label: 'Competitors', value: competitors.length },
    { label: 'Codebases', value: codebases.length },
    { label: 'Signal Rounds', value: uniqueSignalRounds },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-bold">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function OverviewView() {
  const { rounds } = useCompetitionData();
  const standings = useMemo(() => computeStandings(rounds), [rounds]);
  const streaks = useMemo(() => computeStreaks(rounds), [rounds]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      <StreakBanner streaks={streaks} />
      <LeaderHeroBar standings={standings} />
      <QuickStats rounds={rounds} />
      <RecentRoundCard rounds={rounds} />
    </div>
  );
}
