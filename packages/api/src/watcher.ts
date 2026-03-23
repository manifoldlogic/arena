/**
 * File watcher for rounds.jsonl — watches parent directory for changes.
 *
 * Atomic writes (write-to-temp + rename) replace the file inode, which can
 * kill a direct file watcher on Linux. We watch the parent directory and use
 * mtime comparison to detect changes, since Linux inotify may only report
 * the .tmp source filename during rename, not the target.
 */
import { watch, statSync, type FSWatcher } from "fs";
import { dirname, basename } from "path";

export type ChangeCallback = () => void;

export interface FileWatcher {
  close(): void;
}

function getModTime(filePath: string): number {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Watch a file for changes by monitoring its parent directory.
 * Uses mtime comparison to reliably detect atomic write patterns.
 * Returns a handle with close() to stop watching.
 */
export function watchFile(
  filePath: string,
  onChange: ChangeCallback,
  options?: { debounceMs?: number },
): FileWatcher {
  const debounceMs = options?.debounceMs ?? 100;
  const dir = dirname(filePath);
  let closed = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let watcher: FSWatcher | null = null;
  let lastMtime = getModTime(filePath);

  function start() {
    if (closed) return;

    try {
      watcher = watch(dir, () => {
        if (closed) return;

        // Check if our target file actually changed via mtime
        const currentMtime = getModTime(filePath);
        if (currentMtime === lastMtime) return;
        lastMtime = currentMtime;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!closed) onChange();
        }, debounceMs);
      });

      watcher.on("error", () => {
        watcher?.close();
        watcher = null;
        setTimeout(() => {
          if (!closed) start();
        }, 500);
      });
    } catch {
      // Directory doesn't exist yet — retry
      setTimeout(() => {
        if (!closed) start();
      }, 500);
    }
  }

  start();

  return {
    close() {
      closed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      watcher?.close();
      watcher = null;
    },
  };
}
