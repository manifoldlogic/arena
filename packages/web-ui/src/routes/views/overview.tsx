import { useEffect, useMemo, useState } from 'react';
import type { RoundResult, CompetitorStanding, Season, Chapter } from '@arena/schemas';
import { computeStreaks } from '@/lib/transforms';
import { StreakBanner } from '@/components/charts';
import { MilestonesPanel } from '@/components/rounds/MilestonesPanel';
import { useCompetitionData } from '@/hooks/use-competition-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ── Helpers ─────────────────────────────────────────────────────────

function getLeader(standings: CompetitorStanding[]) {
  if (standings.length === 0) return null;
  const sorted = [...standings].sort((a, b) => b.total - a.total);
  const leader = sorted[0];
  const second = sorted[1];
  return {
    name: leader.competitor,
    total: leader.total,
    wins: leader.wins,
    rounds: leader.rounds,
    avg: leader.avg,
    margin: second ? leader.total - second.total : leader.total,
    secondName: second?.competitor ?? null,
    secondTotal: second?.total ?? 0,
  };
}

function getLastRound(rounds: RoundResult[]) {
  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);
  if (scored.length === 0) return null;

  const roundIds = [...new Set(scored.map((r) => r.round_id))];
  const lastId = roundIds[roundIds.length - 1];
  const group = scored.filter((r) => r.round_id === lastId);

  return {
    roundId: lastId,
    codebase: group[0]?.codebase ?? '',
    winner: group[0]?.round_winner ?? null,
    scores: group
      .map((r) => ({
        competitor: r.competitor,
        total: r.total!,
        precision: r.precision ?? 0,
        recall: r.recall ?? 0,
        insight: r.insight ?? 0,
      }))
      .sort((a, b) => b.total - a.total),
  };
}

// ── Season hook — fetches from /api/seasons ─────────────────────────

function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/seasons')
      .then((res) => (res.ok ? res.json() : { seasons: [] }))
      .then((data: { seasons: Season[] }) => {
        if (!cancelled) {
          setSeasons(data.seasons ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { seasons, loading };
}

// ── Components ──────────────────────────────────────────────────────

function LeaderHeroBar({ standings }: { standings: CompetitorStanding[] }) {
  const leader = useMemo(() => getLeader(standings), [standings]);
  if (!leader) {
    return (
      <Card className="md:col-span-2 border-primary/20">
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          No standings data yet
        </CardContent>
      </Card>
    );
  }

  const gapPct = leader.total > 0
    ? Math.min(100, Math.max(5, (leader.margin / leader.total) * 100))
    : 0;

  return (
    <Card className="md:col-span-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Leader identity */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Current Leader
            </p>
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
              {leader.name}
            </h3>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground tabular-nums">
              <span>{leader.wins}W / {leader.rounds}R</span>
              <span>Avg {leader.avg.toFixed(1)}</span>
            </div>
          </div>

          {/* Score + gap bar */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-4xl font-black tabular-nums text-primary">
                {leader.total}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">total pts</p>
            </div>

            <div className="w-40">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gap
                </span>
                <span className="text-sm font-bold tabular-nums text-primary">
                  +{leader.margin}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${gapPct}%` }}
                />
              </div>
              {leader.secondName && (
                <p className="text-[10px] text-muted-foreground mt-1 text-right tabular-nums">
                  vs {leader.secondName} ({leader.secondTotal})
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRoundCard({ rounds }: { rounds: RoundResult[] }) {
  const lastRound = useMemo(() => getLastRound(rounds), [rounds]);
  if (!lastRound) return null;

  const headline = lastRound.winner
    ? `${lastRound.winner} wins ${lastRound.roundId}`
    : `${lastRound.roundId} — tie`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-[10px] uppercase tracking-widest">
            Last Round
          </CardDescription>
          <span className="text-[10px] text-muted-foreground">{lastRound.codebase}</span>
        </div>
        <CardTitle className="text-base">{headline}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {lastRound.scores.map((s, i) => {
            const isWinner = i === 0 && lastRound.winner === s.competitor;
            return (
              <div
                key={s.competitor}
                className={cn(
                  'flex items-center justify-between rounded px-2 py-1 text-sm',
                  isWinner && 'bg-primary/5',
                )}
              >
                <span className={cn('font-medium', isWinner && 'text-primary')}>
                  {s.competitor}
                </span>
                <div className="flex gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>P:{s.precision}</span>
                  <span>R:{s.recall}</span>
                  <span>I:{s.insight}</span>
                  <span className={cn(
                    'font-bold ml-1',
                    isWinner ? 'text-primary' : 'text-foreground',
                  )}>
                    {s.total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StreakSection({ rounds }: { rounds: RoundResult[] }) {
  const streaks = useMemo(() => computeStreaks(rounds), [rounds]);

  return <StreakBanner streaks={streaks} />;
}

const CHAPTER_STATUS_STYLES: Record<string, string> = {
  closed: 'border-muted bg-muted/30',
  in_progress: 'border-primary/30 bg-primary/5',
  planned: 'border-border bg-card',
};

const CHAPTER_DOT_STYLES: Record<string, string> = {
  closed: 'bg-muted-foreground/40',
  in_progress: 'bg-primary',
  planned: 'bg-border',
};

function SeasonSection() {
  const { seasons, loading } = useSeasons();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading season data...
        </CardContent>
      </Card>
    );
  }

  if (seasons.length === 0) return null;

  // Find active season (one with an in_progress chapter) or last one
  let activeSeason = seasons.find((s) =>
    s.chapters.some((ch: Chapter) => ch.status === 'in_progress'),
  );
  if (!activeSeason) activeSeason = seasons[seasons.length - 1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] uppercase tracking-widest">
          Season
        </CardDescription>
        <CardTitle className="text-base">{activeSeason.name}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Target: <span className="font-medium text-foreground">{activeSeason.codebase}</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {activeSeason.chapters.map((ch: Chapter) => (
            <div
              key={ch.id}
              className={cn(
                'rounded border px-3 py-2 text-sm',
                CHAPTER_STATUS_STYLES[ch.status],
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  CHAPTER_DOT_STYLES[ch.status],
                )} />
                <span className="font-medium flex-1">{ch.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {ch.round_range[0]}–{ch.round_range[1]}
                </span>
              </div>
              {ch.status === 'in_progress' && ch.thesis && (
                <p className="text-xs text-muted-foreground mt-1 ml-4 italic">
                  {ch.thesis}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main View ───────────────────────────────────────────────────────

export function OverviewView() {
  const { rounds, standings } = useCompetitionData();
  const scoredCount = rounds.filter((r) => r.source === 'score').length;

  return (
    <div className="space-y-4">
      {/* Page header with live stats bar */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {scoredCount} scored rounds
        </span>
      </div>

      {/* Hero — full-width leader bar */}
      <LeaderHeroBar standings={standings} />

      {/* Streak indicator */}
      <StreakSection rounds={rounds} />

      {/* Intel row: last round + milestones + season */}
      <div className="grid gap-4 md:grid-cols-3">
        <RecentRoundCard rounds={rounds} />
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-widest">
              Milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MilestonesPanel results={rounds} />
          </CardContent>
        </Card>
        <SeasonSection />
      </div>
    </div>
  );
}
