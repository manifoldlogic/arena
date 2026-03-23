import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  connected: boolean;
  reconnecting: boolean;
  /** Bump this number each time a new SSE event arrives to trigger a pulse */
  eventCount?: number;
}

export function ConnectionStatus({ connected, reconnecting, eventCount = 0 }: ConnectionStatusProps) {
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (eventCount > 0 && connected) {
      setPulsing(true);
    }
  }, [eventCount, connected]);

  const handlePulseComplete = useCallback(() => {
    setPulsing(false);
  }, []);

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
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            'h-2 w-2 rounded-full relative z-10',
            connected
              ? 'bg-green-500'
              : reconnecting
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500',
          )}
        />
        <AnimatePresence>
          {pulsing && (
            <motion.div
              key={eventCount}
              className="absolute inset-0 rounded-full bg-green-500"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 3.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              onAnimationComplete={handlePulseComplete}
            />
          )}
        </AnimatePresence>
      </div>
      <span className="text-xs text-muted-foreground">
        {connected ? 'Live' : reconnecting ? 'Reconnecting' : 'Offline'}
      </span>
    </div>
  );
}
