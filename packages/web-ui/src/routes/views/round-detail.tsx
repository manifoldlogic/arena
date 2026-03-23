import { useParams } from 'react-router-dom';

export function RoundDetailView() {
  const { roundId } = useParams<{ roundId: string }>();

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">
        Round {roundId}
      </h2>
      <p className="text-muted-foreground">
        Detailed round results with scoring breakdown and judge notes.
        Built in ARENA-05.
      </p>
    </div>
  );
}
