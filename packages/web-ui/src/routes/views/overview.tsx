import { useMemo } from 'react';
import type { RoundResult, CompetitorStanding } from '@arena/schemas';
import { useCompetitionData } from '@/hooks/use-competition-data';
import {
  computeStandings,
  computeStreaks,
  computeScoreTimeline,
  computeWinTieLoss,
} from '@/lib/transforms';
import { getCompetitorColor } from '@/lib/competitor-colors';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompetitorChip } from '@/components/ui/CompetitorChip';
import { StreakBanner, ScoreTimeline, WinTieLoss } from '@/components/charts';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Filter to scored, non-calibration rounds with dedup. */
function scoredRounds(rounds: RoundResult[]): RoundResult[] {
  const scored = rounds.filter(
    (r) => r.source === 'score' && !r.is_calibration,
  );
  const deduped = new Map<string, RoundResult>();
  for (const r of scored) {
    deduped.set(`${r.round_id}:${r.competitor}`, r);
  }
  return [...deduped.values()];
}

/** Get the most recent round group (all competitors for the same round_id). */
function latestRoundGroup(rounds: RoundResult[]): RoundResult[] {
  if (rounds.length === 0) return [];
  const sorted = [...rounds].sort((a, b) => {
    if (a.timestamp && b.timestamp)
      return b.timestamp.localeCompare(a.timestamp);
    return b.round_id.localeCompare(a.round_id);
  });
  const latestId = sorted[0].round_id;
  return sorted.filter((r) => r.round_id === latestId);
}

/** Count unique values in a field. */
function countUnique(rounds: RoundResult[], field: keyof RoundResult): number {
  return new Set(rounds.map((r) => r[field]).filter(Boolean)).size;
}

/** Notable milestones derived from standings and rounds. */
interface Milestone {
  label: string;
  detail: string;
  kind: 'record' | 'streak' | 'info';
}

function deriveMilestones(
  standings: CompetitorStanding[],
  rounds: RoundResult[],
): Milestone[] {
  const milestones: Milestone[] = [];
  if (standings.length === 0) return milestones;

  // Highest single-round score
  const best = rounds.reduce<RoundResult | null>((prev, r) => {
    if (!prev || (r.total ?? 0) > (prev.total ?? 0)) return r;
    return prev;
  }, null);
  if (best && best.total != null) {
    milestones.push({
      label: 'Highest round score',
      detail: `${best.total.toFixed(1)} by ${best.competitor} (${best.round_id})`,
      kind: 'record',
    });
  }

  // Most wins
  const topWinner = [...standings].sort((a, b) => b.wins - a.wins)[0];
  if (topWinner.wins > 0) {
    milestones.push({
      label: 'Most wins',
      detail: `${topWinner.competitor} with ${topWinner.wins} win${topWinner.wins !== 1 ? 's' : ''}`,
      kind: 'info',
    });
  }

  // Best average (min 2 rounds)
  const qualified = standings.filter((s) => s.rounds >= 2);
  if (qualified.length > 0) {
    const bestAvg = [...qualified].sort((a, b) => b.avg - a.avg)[0];
    milestones.push({
      label: 'Best average',
      detail: `${bestAvg.competitor} at ${bestAvg.avg.toFixed(2)} per round`,
      kind: 'record',
    });
  }

  // Most rounds played
  const mostActive = [...standings].sort((a, b) => b.rounds - a.rounds)[0];
  milestones.push({
    label: 'Most active',
    detail: `${mostActive.competitor} with ${mostActive.rounds} round${mostActive.rounds !== 1 ? 's' : ''}`,
    kind: 'info',
  });

  return milestones;
}

const MILESTONE_STYLE: Record<Milestone['kind'], string> = {
  record:
    'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20',
  streak:
    'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20',
  info: 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20',
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LeaderBar({ standings }: { standings: CompetitorStanding[] }) {
  if (standings.length === 0) return null;

  const leader = standings[0];
  const runnerUp = standings[1] ?? null;
  const gap = runnerUp ? leader.total - runnerUp.total : 0;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        {/* Trophy area */}
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
          style={{
            backgroundColor: `${getCompetitorColor(leader.competitor)}20`,
            color: getCompetitorColor(leader.competitor),
          }}
        >
          1
        </div>

        {/* Leader info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CompetitorChip competitor={leader.competitor} />
            <Badge variant="secondary" className="text-xs">
              {leader.total.toFixed(1)} pts
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {leader.wins}W / {leader.ties}T / {leader.losses}L
            {' · '}
            {leader.rounds} round{leader.rounds !== 1 ? 's' : ''}
            {' · '}avg {leader.avg.toFixed(2)}
          </p>
        </div>

        {/* Gap indicator */}
        {runnerUp && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Lead over #2</p>
            <p
              className={cn(
                'text-lg font-bold tabular-nums',
                gap > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400',
              )}
            >
              {gap > 0 ? '+' : ''}
              {gap.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              vs <CompetitorChip competitor={runnerUp.competitor} />
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentRound({ results }: { results: RoundResult[] }) {
  if (results.length === 0) return null;

  const roundId = results[0].round_id;
  const codebase = results[0].codebase;
  const winner = results.find((r) => r.round_winner === r.competitor);
  const sorted = [...results].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Latest Round</CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {roundId}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{codebase}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((r, i) => (
          <div
            key={r.competitor}
            className={cn(
              'flex items-center justify-between rounded-md px-3 py-2 text-sm',
              i === 0 ? 'bg-muted/50' : '',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 text-xs text-muted-foreground">
                {i + 1}.
              </span>
              <CompetitorChip competitor={r.competitor} />
              {winner && r.competitor === winner.competitor && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  W
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-right font-mono text-xs">
              <span className="text-muted-foreground" title="Precision">
                P {r.precision?.toFixed(1) ?? '\u2014'}
              </span>
              <span className="text-muted-foreground" title="Recall">
                R {r.recall?.toFixed(1) ?? '\u2014'}
              </span>
              <span className="text-muted-foreground" title="Insight">
                I {r.insight?.toFixed(1) ?? '\u2014'}
              </span>
              <span className="font-semibold">
                {r.total?.toFixed(1) ?? '\u2014'}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MilestonesList({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Milestones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {milestones.map((m) => (
          <div
            key={m.label}
            className={cn(
              'rounded-md border px-3 py-2',
              MILESTONE_STYLE[m.kind],
            )}
          >
            <p className="text-xs font-semibold">{m.label}</p>
            <p className="text-xs text-muted-foreground">{m.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */

export function OverviewView() {
  const { rounds } = useCompetitionData();

  const scored = useMemo(() => scoredRounds(rounds), [rounds]);
  const standings = useMemo(() => computeStandings(rounds), [rounds]);
  const streaks = useMemo(() => computeStreaks(rounds), [rounds]);
  const timeline = useMemo(() => computeScoreTimeline(rounds), [rounds]);
  const wtl = useMemo(() => computeWinTieLoss(standings), [standings]);
  const competitors = useMemo(
    () => standings.map((s) => s.competitor),
    [standings],
  );
  const recentGroup = useMemo(() => latestRoundGroup(scored), [scored]);
  const milestones = useMemo(
    () => deriveMilestones(standings, scored),
    [standings, scored],
  );

  const totalRounds = countUnique(scored, 'round_id');
  const totalCodebases = countUnique(scored, 'codebase');
  const avgScore =
    scored.length > 0
      ? scored.reduce((s, r) => s + (r.total ?? 0), 0) / scored.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Competition dashboard — {competitors.length} competitor
          {competitors.length !== 1 ? 's' : ''} across {totalRounds} round
          {totalRounds !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Streak banner */}
      <StreakBanner streaks={streaks} />

      {/* Leader bar */}
      <LeaderBar standings={standings} />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Rounds"
          value={totalRounds}
          sub={`${totalCodebases} codebase${totalCodebases !== 1 ? 's' : ''}`}
        />
        <StatCard label="Competitors" value={competitors.length} />
        <StatCard
          label="Avg Score"
          value={avgScore.toFixed(2)}
          sub="per competitor per round"
        />
        <StatCard
          label="Total Points"
          value={standings.reduce((s, st) => s + st.total, 0).toFixed(1)}
          sub="all competitors combined"
        />
      </div>

      {/* Recent round + milestones */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentRound results={recentGroup} />
        <MilestonesList milestones={milestones} />
      </div>

      {/* Score timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cumulative Score Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreTimeline data={timeline} competitors={competitors} />
        </CardContent>
      </Card>

      {/* Win/Tie/Loss breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Win / Tie / Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <WinTieLoss data={wtl} />
        </CardContent>
      </Card>
    </div>
  );
}
