#!/bin/sh
# test-api.sh — Run API integration tests
#
# 1. Copies fixtures to temp directory
# 2. Starts API server with ARENA_DATA_DIR set to temp dir
# 3. Waits for health check
# 4. Runs integration tests via vitest
# 5. Cleans up on exit
#
# Depends on ARENA-02 (API server). If server binary not found, skips gracefully.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMPDIR=""
SERVER_PID=""

cleanup() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Stopping API server (PID $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
    if [ -n "$TMPDIR" ] && [ -d "$TMPDIR" ]; then
        echo "Cleaning up temp dir..."
        rm -rf "$TMPDIR"
    fi
}

trap cleanup EXIT

echo "=== API Integration Tests ==="
echo ""

# Step 1: Create temp data directory with fixtures
TMPDIR="$(mktemp -d)"
mkdir -p "$TMPDIR"
cp "$REPO_ROOT/packages/pipeline/tests/cross-system/consistency-test-rounds.jsonl" "$TMPDIR/rounds.jsonl"
echo "Using temp data dir: $TMPDIR"

# Step 2: Check for API server (ARENA-02 dependency)
API_SERVER="$REPO_ROOT/packages/web-ui/server.ts"
if [ ! -f "$API_SERVER" ]; then
    echo ""
    echo "WARNING: API server not found at $API_SERVER"
    echo "  API integration tests require ARENA-02 (API server implementation)."
    echo "  Running tests in skip mode (all ARENA-02-dependent tests will be skipped)."
    echo ""
    # Run tests anyway — they'll skip via isServerUp() check
    export ARENA_DATA_DIR="$TMPDIR"
    export ARENA_API_URL="http://localhost:3001"
    cd "$REPO_ROOT"
    npx vitest run tests/integration/api.test.ts tests/integration/sse.test.ts --reporter=verbose 2>&1
    RESULT=$?
    exit "$RESULT"
fi

# Step 3: Start API server
export ARENA_DATA_DIR="$TMPDIR"
export ARENA_API_URL="http://localhost:3001"
echo "Starting API server..."
bun run "$API_SERVER" &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Step 4: Wait for health check (up to 10 seconds)
echo "Waiting for server health check..."
RETRIES=0
MAX_RETRIES=20
while [ "$RETRIES" -lt "$MAX_RETRIES" ]; do
    if curl -sf "http://localhost:3001/api/competition" >/dev/null 2>&1; then
        echo "Server is up!"
        break
    fi
    RETRIES=$((RETRIES + 1))
    sleep 0.5
done

if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Server failed to start within 10 seconds"
    exit 1
fi

# Step 5: Run integration tests
echo ""
echo "Running API integration tests..."
cd "$REPO_ROOT"
npx vitest run tests/integration/api.test.ts tests/integration/sse.test.ts --reporter=verbose 2>&1
RESULT=$?

echo ""
if [ "$RESULT" -eq 0 ]; then
    echo "=== API integration tests PASSED ==="
else
    echo "=== API integration tests FAILED ==="
fi

exit "$RESULT"
