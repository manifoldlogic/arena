import { Outlet } from 'react-router-dom';
import { useCompetitionData } from '@/hooks/use-competition-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function LoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="loading-skeleton">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function ErrorDisplay({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20" data-testid="error-display">
      <h2 className="text-2xl font-bold">Failed to load data</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );
}

export function ContentArea() {
  const { loading, error, refetch } = useCompetitionData();

  return (
    <main className="flex-1 overflow-auto p-6">
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={refetch} />
      ) : (
        <Outlet />
      )}
    </main>
  );
}
