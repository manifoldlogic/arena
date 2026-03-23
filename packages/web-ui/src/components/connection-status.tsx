import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  connected: boolean;
  reconnecting: boolean;
}

export function ConnectionStatus({ connected, reconnecting }: ConnectionStatusProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      title={
        connected
          ? 'Connected'
          : reconnecting
            ? 'Reconnecting...'
            : 'Disconnected'
      }
    >
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          connected
            ? 'bg-green-500'
            : reconnecting
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500',
        )}
      />
      <span className="text-xs text-muted-foreground">
        {connected ? 'Live' : reconnecting ? 'Reconnecting' : 'Offline'}
      </span>
    </div>
  );
}
