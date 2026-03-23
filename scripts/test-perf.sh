#!/bin/sh
# test-perf.sh — Run performance benchmarks
#
# 1. Generates perf fixture if not present
# 2. Runs standings computation benchmark (Python + TypeScript)
# 3. Reports timing results
#
# Accepts --soak flag to include 10-minute memory soak test (opt-in).
# Depends on ARENA-02 for API server benchmarks.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE_PATH="$REPO_ROOT/packages/pipeline/tests/fixtures/perf-1000-rounds.jsonl"
SOAK=0

for arg in "$@"; do
    if [ "$arg" = "--soak" ]; then
        SOAK=1
    fi
done

echo "=== Performance Benchmarks ==="
echo ""

# Step 1: Generate fixture if needed
if [ ! -f "$FIXTURE_PATH" ]; then
    echo "[1] Generating perf fixture (1000 entries)..."
    python3 "$REPO_ROOT/tests/perf/generate_perf_fixture.py"
else
    echo "[1] Perf fixture already exists, skipping generation."
fi
echo ""

# Step 2: Python standings benchmark
echo "[2] Python standings computation benchmark..."
python3 -c "
import time, json, sys
sys.path.insert(0, '$REPO_ROOT/packages/pipeline/tests/cross-system')
from generate_golden import load_rounds, deduplicate, _scorable_entries, _compute_standings

entries = load_rounds('$FIXTURE_PATH')
runs = 100
times = []
for _ in range(runs):
    start = time.perf_counter()
    deduped = deduplicate(entries)
    _compute_standings(deduped)
    elapsed = time.perf_counter() - start
    times.append(elapsed * 1000)  # ms

times.sort()
p50 = times[len(times) // 2]
p95 = times[int(len(times) * 0.95)]
p99 = times[int(len(times) * 0.99)]
print(f'  Python standings (100 runs): p50={p50:.1f}ms  p95={p95:.1f}ms  p99={p99:.1f}ms')
"
echo ""

# Step 3: TypeScript standings benchmark
echo "[3] TypeScript standings computation benchmark..."
npx tsx -e "
import { readFileSync } from 'fs';
import { computeAll } from '$REPO_ROOT/packages/schemas/src/standings.js';

const content = readFileSync('$FIXTURE_PATH', 'utf-8');
const entries = content.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const runs = 100;
const times: number[] = [];
for (let i = 0; i < runs; i++) {
  const start = performance.now();
  computeAll(entries, 'perf-1000-rounds.jsonl');
  times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
const p50 = times[Math.floor(times.length / 2)];
const p95 = times[Math.floor(times.length * 0.95)];
const p99 = times[Math.floor(times.length * 0.99)];
console.log('  TypeScript standings (100 runs): p50=' + p50.toFixed(1) + 'ms  p95=' + p95.toFixed(1) + 'ms  p99=' + p99.toFixed(1) + 'ms');
" 2>&1
echo ""

# Step 4: API benchmarks (requires ARENA-02)
API_SERVER="$REPO_ROOT/packages/web-ui/server.ts"
if [ -f "$API_SERVER" ]; then
    echo "[4] API performance benchmarks..."
    echo "  (API benchmarks will be added when ARENA-02 lands)"
else
    echo "[4] Skipping API benchmarks (ARENA-02 not yet implemented)"
fi
echo ""

# Step 5: Soak test (opt-in)
if [ "$SOAK" -eq 1 ]; then
    echo "[5] Memory soak test (10 minutes)..."
    echo "  (Soak test will be added when ARENA-02 lands)"
else
    echo "[5] Soak test skipped (use --soak to include)"
fi

echo ""
echo "=== Performance benchmarks complete ==="
