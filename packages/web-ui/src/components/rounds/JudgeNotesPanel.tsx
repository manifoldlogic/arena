import type { RoundResult } from '@arena/schemas';

interface JudgeNotesPanelProps {
  results: RoundResult[];
}

export function JudgeNotesPanel({ results }: JudgeNotesPanelProps) {
  const withNotes = results.filter((r) => r.judge_notes);

  if (withNotes.length === 0) {
    return <p className="text-sm text-muted-foreground">No judge notes available.</p>;
  }

  return (
    <div className="space-y-3">
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
  );
}
