import type { RoundResult } from '@arena/schemas';

interface JudgeNotesPanelProps {
  results: RoundResult[];
}

const DIMENSIONS = ['precision', 'recall', 'insight'] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_LABELS: Record<Dimension, string> = {
  precision: 'Precision',
  recall: 'Recall',
  insight: 'Insight',
};

const DIM_COLORS: Record<Dimension, string> = {
  precision: 'var(--dim-precision, 217 91% 65%)',
  recall: 'var(--dim-recall, 142 76% 50%)',
  insight: 'var(--dim-insight, 280 67% 60%)',
};

function deriveHeadline(results: RoundResult[]): string | null {
  const scored = results.filter((r) => r.total != null);
  if (scored.length < 2) return null;

  const sorted = [...scored].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const top = sorted[0];
  const runnerUp = sorted[1];
  const topTotal = top.total ?? 0;
  const runnerUpTotal = runnerUp.total ?? 0;

  if (topTotal === runnerUpTotal) {
    return `Tie at ${topTotal} — no separation between ${top.competitor} and ${runnerUp.competitor}`;
  }

  const margin = topTotal - runnerUpTotal;
  if (margin <= 2) {
    return `${top.competitor} edges out ${runnerUp.competitor} by ${margin} — a razor-thin margin`;
  }
  return `${top.competitor} takes it by ${margin} over ${runnerUp.competitor}`;
}

interface DimensionDelta {
  dimension: Dimension;
  delta: number;
  maxScore: number;
}

function computeDecisiveDimension(results: RoundResult[]): DimensionDelta | null {
  const scored = results.filter((r) => r.total != null);
  if (scored.length < 2) return null;

  const sorted = [...scored].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const winner = sorted[0];
  const runnerUp = sorted[1];

  let maxDelta = 0;
  let decisive: Dimension = 'precision';
  const maxScore = 10;

  for (const dim of DIMENSIONS) {
    const delta = (winner[dim] ?? 0) - (runnerUp[dim] ?? 0);
    if (delta > maxDelta) {
      maxDelta = delta;
      decisive = dim;
    }
  }

  return { dimension: decisive, delta: maxDelta, maxScore };
}

function getNextQueryHint(results: RoundResult[]): string | undefined {
  for (const r of results) {
    if (r.next_query_hint) return r.next_query_hint;
  }
  return undefined;
}

export function JudgeNotesPanel({ results }: JudgeNotesPanelProps) {
  const withNotes = results.filter((r) => r.judge_notes);
  const headline = deriveHeadline(results);
  const decisive = computeDecisiveDimension(results);
  const nextHint = getNextQueryHint(results);
  const hasContent = headline || decisive || nextHint || withNotes.length > 0;

  if (!hasContent) {
    return <p className="text-sm text-muted-foreground">No judge notes available.</p>;
  }

  return (
    <div className="space-y-4">
      {headline && (
        <div className="rounded border border-border bg-muted/50 p-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Round Outcome
          </div>
          <p className="text-sm font-medium text-foreground" data-testid="round-headline">
            {headline}
          </p>
        </div>
      )}

      {decisive && decisive.delta > 0 && (
        <div className="rounded border border-border p-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Decisive Dimension
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground w-20" data-testid="decisive-label">
              {DIM_LABELS[decisive.dimension]}
            </span>
            <div className="flex-1 bg-muted rounded-full h-4 relative">
              <div
                className="h-4 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((decisive.delta / decisive.maxScore) * 100, 100)}%`,
                  backgroundColor: `hsl(${DIM_COLORS[decisive.dimension]})`,
                }}
                data-testid="decisive-bar"
              />
            </div>
            <span className="text-xs font-mono text-foreground w-8 text-right" data-testid="decisive-delta">
              +{decisive.delta}
            </span>
          </div>
        </div>
      )}

      {nextHint && (
        <div className="rounded border border-border bg-muted/50 p-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Next Query Hint
          </div>
          <p className="text-sm text-foreground italic" data-testid="next-query-hint">
            {nextHint}
          </p>
        </div>
      )}

      {withNotes.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Judge Notes
          </div>
          {withNotes.map((r) => (
            <div key={r.competitor} className="rounded border border-border p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {r.competitor}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {r.judge_notes}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
