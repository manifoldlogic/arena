import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Arena</h1>
        <span className="text-sm text-muted-foreground">
          Agent Olympics Dashboard
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Competition selector placeholder — wired in Phase 3 */}
        <div id="competition-selector-slot" />

        {/* Connection status placeholder — wired in Phase 2 */}
        <div id="connection-status-slot" />

        <button
          onClick={() =>
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
