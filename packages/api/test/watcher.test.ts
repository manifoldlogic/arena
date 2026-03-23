import { describe, expect, test, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, renameSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { watchFile, type FileWatcher } from "../src/watcher";

let watcher: FileWatcher | null = null;
let testDir: string;
let testCounter = 0;

function makeTestDir(): string {
  testCounter++;
  const dir = join(tmpdir(), `arena-watcher-test-${Date.now()}-${testCounter}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

afterEach(() => {
  watcher?.close();
  watcher = null;
  if (testDir) {
    try { rmSync(testDir, { recursive: true }); } catch {}
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("watchFile", () => {
  test("detects file change", async () => {
    testDir = makeTestDir();
    const filePath = join(testDir, "rounds.jsonl");
    writeFileSync(filePath, '{"line":1}\n');

    let changeCount = 0;
    watcher = watchFile(filePath, () => { changeCount++; }, { debounceMs: 50 });

    await sleep(150);
    writeFileSync(filePath, '{"line":1}\n{"line":2}\n');
    await sleep(300);

    expect(changeCount).toBeGreaterThanOrEqual(1);
  });

  test("re-subscribes after rename (atomic write pattern)", async () => {
    testDir = makeTestDir();
    const filePath = join(testDir, "rounds.jsonl");
    const tmpPath = join(testDir, "rounds.jsonl.tmp");
    writeFileSync(filePath, '{"line":1}\n');

    let changeCount = 0;
    watcher = watchFile(filePath, () => { changeCount++; }, { debounceMs: 50 });

    await sleep(150);

    // Simulate atomic write: write to temp, rename over original
    writeFileSync(tmpPath, '{"line":1}\n{"line":2}\n');
    renameSync(tmpPath, filePath);
    await sleep(500);

    expect(changeCount).toBeGreaterThanOrEqual(1);
  });

  test("close stops watching", async () => {
    testDir = makeTestDir();
    const filePath = join(testDir, "rounds.jsonl");
    writeFileSync(filePath, '{"line":1}\n');

    let changeCount = 0;
    watcher = watchFile(filePath, () => { changeCount++; }, { debounceMs: 50 });

    await sleep(150);
    watcher.close();
    watcher = null;

    // Reset count after close to ignore any events from setup
    changeCount = 0;
    writeFileSync(filePath, '{"line":1}\n{"line":2}\n');
    await sleep(300);

    expect(changeCount).toBe(0);
  });
});
