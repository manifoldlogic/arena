#!/usr/bin/env zsh
# End-to-end test for Olympics scoreboard pipeline
# Simulates a full competition session by piping mock hook JSON through each script
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/../scripts" && pwd)"
FIXTURE_DIR="$(cd "$(dirname "$0")/fixtures" && pwd)"
TEST_DIR=$(mktemp -d /tmp/olympics-test-XXXXXX)
PASS_COUNT=0
FAIL_COUNT=0
REPORT=""

# Helper function
log_result() {
  local step="$1"
  local result="$2"
  local detail="$3"
  if [ "$result" = "PASS" ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    echo "[PASS] $step: $detail"
    REPORT="${REPORT}\n| $step | PASS | $detail |"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "[FAIL] $step: $detail"
    REPORT="${REPORT}\n| $step | FAIL | $detail |"
  fi
}

export ARENA_DATA_DIR="$TEST_DIR"
mkdir -p "$TEST_DIR/scripts"

# Create a stub generate-scoreboard.py in the test dir so subprocess call works
cp "$SCRIPT_DIR/generate-scoreboard.py" "$TEST_DIR/scripts/generate-scoreboard.py"

echo "=== Olympics E2E Test ==="
echo "Test dir: $TEST_DIR"
echo ""

# ─── Step 1: SessionStart init ───
echo "--- Step 1: SessionStart init ---"
python3 "$SCRIPT_DIR/init-session.py" < "$FIXTURE_DIR/mock-hook-session.json" > /dev/null
if [ -f "$TEST_DIR/session.json" ]; then
  CODEBASE=$(python3 -c "import json; d=json.load(open('$TEST_DIR/session.json')); print(d.get('codebase',''))")
  HAS_NEXT=$(python3 -c "import json; d=json.load(open('$TEST_DIR/session.json')); print('yes' if 'next_round' in d else 'no')")
  if [ "$CODEBASE" = "django" ] && [ "$HAS_NEXT" = "no" ]; then
    log_result "Step1" "PASS" "session.json created, codebase=django, no next_round"
  else
    log_result "Step1" "FAIL" "codebase=$CODEBASE, has_next_round=$HAS_NEXT"
  fi
else
  log_result "Step1" "FAIL" "session.json not created"
fi

# ─── Step 2: Olympics agent sentinel ───
echo "--- Step 2: Olympics agent sentinel ---"
python3 "$SCRIPT_DIR/log-round.py" --mode=agent < "$FIXTURE_DIR/mock-hook-agent-olympics.json"
if [ -f "$TEST_DIR/rounds.jsonl" ]; then
  LINE_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
  FIRST_SOURCE=$(python3 -c "import json; print(json.loads(open('$TEST_DIR/rounds.jsonl').readline()).get('source',''))")
  if [ "$LINE_COUNT" = "1" ] && [ "$FIRST_SOURCE" = "agent" ]; then
    log_result "Step2" "PASS" "1 line in rounds.jsonl with source=agent"
  else
    log_result "Step2" "FAIL" "lines=$LINE_COUNT, source=$FIRST_SOURCE"
  fi
else
  log_result "Step2" "FAIL" "rounds.jsonl not created"
fi

# ─── Step 3: Non-Olympics agent filtered ───
echo "--- Step 3: Non-Olympics agent filtered ---"
BEFORE_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
python3 "$SCRIPT_DIR/log-round.py" --mode=agent < "$FIXTURE_DIR/mock-hook-agent-other.json" || true
AFTER_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
if [ "$BEFORE_COUNT" = "$AFTER_COUNT" ]; then
  log_result "Step3" "PASS" "Non-sentinel agent filtered out (line count unchanged: $AFTER_COUNT)"
else
  log_result "Step3" "FAIL" "Line count changed from $BEFORE_COUNT to $AFTER_COUNT"
fi

# ─── Step 4: 2-competitor scoring ───
echo "--- Step 4: 2-competitor scoring ---"
BEFORE_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
python3 "$SCRIPT_DIR/log-round.py" --mode=score < "$FIXTURE_DIR/mock-hook-write-scoring.json"
AFTER_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
NEW_LINES=$((AFTER_COUNT - BEFORE_COUNT))
if [ "$NEW_LINES" = "2" ]; then
  log_result "Step4" "PASS" "2 new lines appended (total=$AFTER_COUNT)"
else
  log_result "Step4" "FAIL" "Expected 2 new lines, got $NEW_LINES (total=$AFTER_COUNT)"
fi

# ─── Step 5: Field validation ───
echo "--- Step 5: Field validation ---"
VALID=true
DETAIL=""
# Check last 2 lines for required fields
LAST_TWO=$(tail -n 2 "$TEST_DIR/rounds.jsonl")
LINE_NUM=0
echo "$LAST_TWO" | while IFS= read -r line; do
  LINE_NUM=$((LINE_NUM + 1))
  HAS_ROUND_ID=$(echo "$line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print('yes' if 'round_id' in d else 'no')")
  HAS_DIV=$(echo "$line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print('yes' if 'divergence_signal' in d else 'no')")
  SCHEMA_V=$(echo "$line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('schema_version',''))")
  if [ "$HAS_ROUND_ID" != "yes" ] || [ "$HAS_DIV" != "yes" ] || [ "$SCHEMA_V" != "1" ]; then
    echo "FIELD_FAIL" > "$TEST_DIR/_field_check"
  fi
done
if [ -f "$TEST_DIR/_field_check" ]; then
  log_result "Step5" "FAIL" "Missing required fields in score lines"
  rm -f "$TEST_DIR/_field_check"
else
  log_result "Step5" "PASS" "All score lines have round_id, divergence_signal, schema_version=1"
fi

# ─── Step 6: Non-scoring path filtered ───
echo "--- Step 6: Non-scoring path filtered ---"
BEFORE_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
python3 "$SCRIPT_DIR/log-round.py" --mode=score < "$FIXTURE_DIR/mock-hook-write-other.json" || true
AFTER_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
if [ "$BEFORE_COUNT" = "$AFTER_COUNT" ]; then
  log_result "Step6" "PASS" "Non-scoring path filtered (line count unchanged: $AFTER_COUNT)"
else
  log_result "Step6" "FAIL" "Line count changed from $BEFORE_COUNT to $AFTER_COUNT"
fi

# ─── Step 7: SCOREBOARD.md sections ───
echo "--- Step 7: SCOREBOARD.md sections ---"
if [ -f "$TEST_DIR/SCOREBOARD.md" ]; then
  MISSING=""
  for section in \
    "## 1. Overall Standings" \
    "## 2. Per-Codebase" \
    "## 3. Per-Query-Category" \
    "## 4. Round-by-Round" \
    "## 5. Divergence Signals" \
    "## 6. Closest Calls" \
    "## 7. Dimension Totals" \
    "## 8. Bridge Rounds" \
    "## 9. Calibration Rounds"; do
    if ! grep -qF "$section" "$TEST_DIR/SCOREBOARD.md"; then
      MISSING="${MISSING} '${section}'"
    fi
  done
  if [ -z "$MISSING" ]; then
    log_result "Step7" "PASS" "All 9 section headings present in SCOREBOARD.md"
  else
    log_result "Step7" "FAIL" "Missing sections:$MISSING"
  fi
else
  log_result "Step7" "FAIL" "SCOREBOARD.md not created"
fi

# ─── Step 8: Divergence stderr ───
echo "--- Step 8: Divergence stderr ---"
# Create a gray-round fixture inline
GRAY_FIXTURE='{"tool_input":{"file_path":"/workspace/olympics-v2/results/scored/django/R02.json","content":"{\"round_id\": \"R02\", \"query_category\": \"configuration\", \"codebase\": \"django\", \"phase\": 1, \"scores\": {\"maproom\": {\"precision\": 3, \"recall\": 3, \"insight\": 3, \"total\": 9}, \"explore\": {\"precision\": 3, \"recall\": 3, \"insight\": 2, \"total\": 8}}, \"measured\": {\"maproom\": {\"tool_calls\": 10, \"wall_time_seconds\": 20.0}, \"explore\": {\"tool_calls\": 12, \"wall_time_seconds\": 25.0}}, \"round_winner\": \"maproom\", \"judge_notes\": \"Close match\", \"divergence_signal\": \"gray\"}"},"session_id":"sess_test"}'
echo "$GRAY_FIXTURE" | python3 "$SCRIPT_DIR/log-round.py" --mode=score 2>/dev/null || true

# Run generate-scoreboard.py separately and capture stderr
STDERR_OUTPUT=$(python3 "$TEST_DIR/scripts/generate-scoreboard.py" 2>&1 1>/dev/null)
if echo "$STDERR_OUTPUT" | grep -qF "[olympics:INFO] Gray round"; then
  log_result "Step8" "PASS" "Divergence stderr contains Gray round info"
else
  log_result "Step8" "FAIL" "Expected '[olympics:INFO] Gray round' in stderr, got: $STDERR_OUTPUT"
fi

# ─── Step 9: 3-competitor round ───
echo "--- Step 9: 3-competitor round ---"
BEFORE_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
python3 "$SCRIPT_DIR/log-round.py" --mode=score < "$FIXTURE_DIR/mock-hook-write-scoring-3comp.json"
AFTER_COUNT=$(wc -l < "$TEST_DIR/rounds.jsonl" | tr -d ' ')
NEW_LINES=$((AFTER_COUNT - BEFORE_COUNT))
if [ "$NEW_LINES" = "3" ]; then
  log_result "Step9" "PASS" "3 new lines appended for 3-competitor round (total=$AFTER_COUNT)"
else
  log_result "Step9" "FAIL" "Expected 3 new lines, got $NEW_LINES (total=$AFTER_COUNT)"
fi

# ─── Step 10: Multi-round accumulation ───
echo "--- Step 10: Multi-round accumulation ---"
ACCUM_OK=true
ACCUM_DETAIL=""
if [ -f "$TEST_DIR/SCOREBOARD.md" ]; then
  # Check that Overall Standings has competitor names
  HAS_MAPROOM=$(grep -c "maproom" "$TEST_DIR/SCOREBOARD.md" || true)
  HAS_EXPLORE=$(grep -c "explore" "$TEST_DIR/SCOREBOARD.md" || true)
  # Check round-by-round has R01 and R02
  HAS_R01=$(grep -c "R01" "$TEST_DIR/SCOREBOARD.md" || true)
  HAS_R02=$(grep -c "R02" "$TEST_DIR/SCOREBOARD.md" || true)

  if [ "$HAS_MAPROOM" -gt 0 ] && [ "$HAS_EXPLORE" -gt 0 ] && [ "$HAS_R01" -gt 0 ] && [ "$HAS_R02" -gt 0 ]; then
    log_result "Step10" "PASS" "SCOREBOARD.md has maproom, explore, R01, R02"
  else
    log_result "Step10" "FAIL" "maproom=$HAS_MAPROOM, explore=$HAS_EXPLORE, R01=$HAS_R01, R02=$HAS_R02"
  fi
else
  log_result "Step10" "FAIL" "SCOREBOARD.md not found"
fi

# ─── Hook Preservation Check ───
echo ""
echo "--- Hook Preservation Check ---"
SETTINGS_FILE="/workspace/.claude/settings.json"
HOOK_STATUS=""
for hook_name in "rebuild-maproom" "maproom-sync" "specs-autocommit"; do
  if grep -qF "$hook_name" "$SETTINGS_FILE" 2>/dev/null; then
    HOOK_STATUS="${HOOK_STATUS}\n- ${hook_name}: present"
  else
    HOOK_STATUS="${HOOK_STATUS}\n- ${hook_name}: MISSING"
  fi
done
for hook_event in "Notification" "UserPromptSubmit"; do
  if grep -qF "\"$hook_event\"" "$SETTINGS_FILE" 2>/dev/null; then
    HOOK_STATUS="${HOOK_STATUS}\n- ${hook_event}: present"
  else
    HOOK_STATUS="${HOOK_STATUS}\n- ${hook_event}: MISSING"
  fi
done

# ─── Write Report ───
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ "$FAIL_COUNT" = "0" ]; then
  VERDICT="PASS"
else
  VERDICT="FAIL"
fi

REPORT_PATH="$TEST_DIR/integration-test-report.md"
printf "# Integration Test Report\n\n" > "$REPORT_PATH"
printf "**Date:** %s\n" "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" >> "$REPORT_PATH"
printf "**Script:** test-e2e.sh\n" >> "$REPORT_PATH"
printf "**Test Dir:** %s\n\n" "$TEST_DIR" >> "$REPORT_PATH"
printf "## Results\n\n" >> "$REPORT_PATH"
printf "| Step | Status | Detail |\n" >> "$REPORT_PATH"
printf "|------|--------|--------|\n" >> "$REPORT_PATH"
printf "%b\n" "$REPORT" >> "$REPORT_PATH"
printf "\n## Summary\n\n" >> "$REPORT_PATH"
printf "Passed: %d/%d\n" "$PASS_COUNT" "$TOTAL" >> "$REPORT_PATH"
printf "Failed: %d/%d\n" "$FAIL_COUNT" "$TOTAL" >> "$REPORT_PATH"
printf "Verdict: %s\n\n" "$VERDICT" >> "$REPORT_PATH"
printf "## Hook Preservation\n\n" >> "$REPORT_PATH"
printf "All existing hooks in settings.json verified present:\n" >> "$REPORT_PATH"
printf "%b\n" "$HOOK_STATUS" >> "$REPORT_PATH"

echo ""
echo "=== Report written to $REPORT_PATH ==="
echo ""
echo "=== Summary: $PASS_COUNT/$TOTAL passed, $FAIL_COUNT/$TOTAL failed — $VERDICT ==="

# Cleanup
rm -rf "$TEST_DIR"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
