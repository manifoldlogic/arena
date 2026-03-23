import { useMemo } from 'react';
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
import seasonsData from '../../../../../specs/seasons.json';

// ── Helpers ─────────────────────────────────────────────────────────

function getLeader(standings: CompetitorStanding[]): {
  name: string;
  total: number;
  margin: number;
  maxTotal: number;
} | null {
  if (standings.length === 0) return null;
  const sorted = [...standings].sort((a, b) => b.total - a.total);
  const leader = sorted[0];
  const second = sorted[1];
  return {
    name: leader.competitor,
    total: leader.total,
    margin: second ? leader.total - second.total : leader.total,
    maxTotal: leader.total,
  };
}

function getLastRound(rounds: RoundResult[]): {
  roundId: string;
  winner: string | null;
  scores: { competitor: string; total: number; precision: number; recall: number; insight: number }[];
} | null {
  const scored = rounds.filter((r) => r.source === 'score' && r.total != null);
  if (scored.length === 0) return null;

  // Find the latest round_id
  const roundIds = [...new Set(scored.map((r) => r.round_id))];
  const lastId = roundIds[roundIds.length - 1];
  const group = scored.filter((r) => r.round_id === lastId);

  return {
    roundId: lastId,
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

function getCurrentSeason(): { season: Season; chapter: Chapter | null } | null {
  const seasons = seasonsData.seasons as Season[];
  if (seasons.length === 0) return null;

  // Find the season with an in_progress chapter, or the last season
  for (const season of seasons) {
    const activeChapter = season.chapters.find((ch: Chapter) => ch.status === 'in_progress');
    if (activeChapter) return { season, chapter: activeChapter };
  }

  // Fallback: last season, last chapter
  const last = seasons[seasons.length - 1];
  const lastChapter = last.chapters[last.chapters.length - 1] ?? null;
  return { season: last, chapter: lastChapter };
}

// ── Components ──────────────────────────────────────────────────────

function LeaderHeroBar({ standings }: { standings: CompetitorStanding[] }) {
  const leader = useMemo(() => getLeader(standings), [standings]);
  if (!leader) return null;

  const barWidth = leader.maxTotal > 0
    ? Math.max(10, (leader.margin / leader.maxTotal) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>Current Leader</CardDescription>
        <CardTitle className="text-2xl">{leader.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold tabular-nums text-primary">
            {leader.total}
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Margin over 2nd</span>
              <span className="font-medium tabular-nums">+{leader.margin}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${barWidth}%` }}
              />
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
    : `${lastRound.roundId} ended in a tie`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>Last Round</CardDescription>
        <CardTitle className="text-lg">{headline}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lastRound.scores.map((s) => (
            <div key={s.competitor} className="flex items-center justify-between text-sm">
              <span className="font-medium">{s.competitor}</span>
              <div className="flex gap-3 text-muted-foreground tabular-nums">
                <span title="Precision">P:{s.precision}</span>
                <span title="Recall">R:{s.recall}</span>
                <span title="Insight">I:{s.insight}</span>
                <span className="font-semibold text-foreground">{s.total}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const CHAPTER_STATUS_STYLES: Record<string, string> = {
  closed: 'border-muted bg-muted/50 text-muted-foreground',
  in_progress: 'border-primary/30 bg-primary/5 text-foreground',
  planned: 'border-border bg-card text-muted-foreground',
};

function SeasonSection() {
  const current = useMemo(() => getCurrentSeason(), []);
  if (!current) return null;

  const { season, chapter } = current;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>Season</CardDescription>
        <CardTitle className="text-lg">{season.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Codebase: <span className="font-medium text-foreground">{season.codebase}</span>
        </p>
        <ul className="space-y-2">
          {season.chapters.map((ch: Chapter) => (
            <li
              key={ch.id}
              className={cn(
                'rounded border p-2 text-sm',
                CHAPTER_STATUS_STYLES[ch.status],
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{ch.name}</span>
                <span className="text-xs">
                  {ch.round_range[0]}–{ch.round_range[1]}
                </span>
              </div>
              <p className="text-xs mt-1 opacity-80">{ch.theme}</p>
              {ch.thesis && (
                <p className="text-xs mt-1 italic opacity-70">{ch.thesis}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Main View ───────────────────────────────────────────────────────

export function OverviewView() {
  const { rounds, standings } = useCompetitionData();
  const streaks = useMemo(() => computeStreaks(rounds), [rounds]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Overview</h2>

      {/* Leader + Recent Round — side by side on wider screens */}
      <div className="grid gap-4 md:grid-cols-2">
        <LeaderHeroBar standings={standings} />
        <RecentRoundCard rounds={rounds} />
      </div>

      {/* Streak Indicator */}
      <StreakBanner streaks={streaks} />

      {/* Milestones + Season — side by side on wider screens */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Milestones</CardTitle>
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
