#!/usr/bin/env zsh
# run-benchmark.sh - Search Olympics Benchmark Harness v2 scoring pipeline
#
# Automates: metric extraction, mechanical scoring, judge invocation,
# statistical aggregation, and report generation.
#
# PREREQUISITE: Agents must be launched manually. This script works with
# existing JSONL files produced by agent runs.
#
# Exit codes: 0=success, 1=config error, 2=runtime error
#
# Shell: ZSH-compatible (POSIX-compatible syntax, no bash-only constructs)

set -e

# Enable word splitting on unquoted variable expansion (ZSH default differs from sh)
setopt shwordsplit 2>/dev/null || true

# ---------------------------------------------------------------------------
# Constants and defaults
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BENCHMARK_JSON="$SCRIPT_DIR/benchmark.json"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
RUN_ID="run-$(date -u '+%Y%m%d-%H%M%S')"

# CLI defaults
DRY_RUN=0
SCORE_ONLY=0
NO_REPORT=0
RESUME_FILE=""
OVERRIDE_RUNS=""
SINGLE_QUERY=""

# Temp directory for intermediate files
TMPDIR_WORK=$(mktemp -d)
trap 'rm -rf "$TMPDIR_WORK"' EXIT

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log_info() {
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] [INFO] $*"
}

log_warn() {
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] [WARN] $*" >&2
}

log_error() {
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2
}

# ---------------------------------------------------------------------------
# Usage / help
# ---------------------------------------------------------------------------
usage() {
  cat <<'USAGE_EOF'
Usage: run-benchmark.sh [OPTIONS]

Automates the Search Olympics scoring pipeline: metric extraction,
mechanical scoring, judge invocation, aggregation, and reporting.

PREREQUISITE: Agents must already be launched manually. This script
works with existing JSONL files.

Options:
  --dry-run       Validate config and pre-flight checks only
  --resume FILE   Resume from partial results JSON file
  --runs N        Override runs_per_query (default: from benchmark.json)
  --query Q_ID    Run only a specific query (for debugging)
  --score-only    Skip agent launching, score existing JSONL files only
  --no-report     Skip report generation
  --help          Show this usage message

Exit codes:
  0   Success
  1   Configuration error (missing files, invalid JSON)
  2   Runtime error (scoring failure, judge error)

Examples:
  ./run-benchmark.sh --dry-run
  ./run-benchmark.sh --score-only
  ./run-benchmark.sh --runs 1 --query Q4
  ./run-benchmark.sh --resume results/run-partial.json
USAGE_EOF
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --score-only)
      SCORE_ONLY=1
      shift
      ;;
    --no-report)
      NO_REPORT=1
      shift
      ;;
    --resume)
      if [ -z "$2" ] || echo "$2" | grep -q '^--'; then
        log_error "--resume requires a FILE argument"
        exit 1
      fi
      RESUME_FILE="$2"
      shift 2
      ;;
    --runs)
      if [ -z "$2" ] || echo "$2" | grep -q '^--'; then
        log_error "--runs requires a numeric argument"
        exit 1
      fi
      OVERRIDE_RUNS="$2"
      shift 2
      ;;
    --query)
      if [ -z "$2" ] || echo "$2" | grep -q '^--'; then
        log_error "--query requires a Q_ID argument"
        exit 1
      fi
      SINGLE_QUERY="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Stage 1: Pre-flight checks
# ---------------------------------------------------------------------------
log_info "=== Stage 1: Pre-flight checks ==="

preflight_ok=1

# 1a. Verify benchmark.json exists and is valid JSON
if [ ! -f "$BENCHMARK_JSON" ]; then
  log_error "benchmark.json not found at: $BENCHMARK_JSON"
  exit 1
fi

if ! python3 -c "import json; json.load(open('$BENCHMARK_JSON'))" 2>/dev/null; then
  log_error "benchmark.json is not valid JSON"
  exit 1
fi
log_info "benchmark.json: OK (valid JSON)"

# 1b. Load config values for pre-flight validation
RUNS_PER_QUERY=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
print(cfg['benchmark']['runs_per_query'])
")

if [ -n "$OVERRIDE_RUNS" ]; then
  RUNS_PER_QUERY="$OVERRIDE_RUNS"
  log_info "runs_per_query overridden to: $RUNS_PER_QUERY"
fi

# Extract agent IDs
AGENT_IDS=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
for a in cfg['agents']:
    print(a['id'])
")

# Extract query IDs
QUERY_IDS=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
for q in cfg['queries']:
    print(q['id'])
")

# Filter to single query if specified
if [ -n "$SINGLE_QUERY" ]; then
  # Verify the query exists in the config
  if ! echo "$QUERY_IDS" | grep -q "^${SINGLE_QUERY}$"; then
    log_error "Query '$SINGLE_QUERY' not found in benchmark.json"
    log_error "Available queries: $(echo $QUERY_IDS | tr '\n' ' ')"
    exit 1
  fi
  QUERY_IDS="$SINGLE_QUERY"
  log_info "Filtering to single query: $SINGLE_QUERY"
fi

# 1c. Verify ground truth files exist
log_info "Checking ground truth files..."
gt_missing=0
for qid in $(echo "$QUERY_IDS"); do
  gt_file=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
for q in cfg['queries']:
    if q['id'] == '$qid':
        print(q['ground_truth_file'])
        break
")
  gt_path="$SCRIPT_DIR/$gt_file"
  if [ ! -f "$gt_path" ]; then
    log_error "Ground truth file missing for $qid: $gt_path"
    gt_missing=1
    preflight_ok=0
  fi
done
if [ "$gt_missing" -eq 0 ]; then
  log_info "Ground truth files: OK (all present)"
fi

# 1d. Verify judge prompt templates exist
log_info "Checking judge prompt templates..."
judge_missing=0
for dim in coverage accuracy; do
  judge_file=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
print(cfg['scoring']['$dim']['judge_prompt_file'])
")
  judge_path="$SCRIPT_DIR/$judge_file"
  if [ ! -f "$judge_path" ]; then
    log_error "Judge prompt template missing for $dim: $judge_path"
    judge_missing=1
    preflight_ok=0
  fi
done
if [ "$judge_missing" -eq 0 ]; then
  log_info "Judge prompt templates: OK (all present)"
fi

# 1e. Verify Python dependencies (collect-stats.py, scoring.py)
if [ ! -f "$SCRIPT_DIR/collect-stats.py" ]; then
  log_error "collect-stats.py not found at: $SCRIPT_DIR/collect-stats.py"
  preflight_ok=0
fi
if [ ! -f "$SCRIPT_DIR/scoring.py" ]; then
  log_error "scoring.py not found at: $SCRIPT_DIR/scoring.py"
  preflight_ok=0
fi
if [ -f "$SCRIPT_DIR/collect-stats.py" ] && [ -f "$SCRIPT_DIR/scoring.py" ]; then
  log_info "Python scripts: OK (collect-stats.py, scoring.py present)"
fi

# 1f. Verify claude CLI is available (needed for judge invocation)
if ! command -v claude >/dev/null 2>&1; then
  log_warn "claude CLI not found in PATH -- judge invocation will fail"
  if [ "$DRY_RUN" -eq 0 ] && [ "$SCORE_ONLY" -eq 0 ]; then
    preflight_ok=0
  fi
else
  log_info "claude CLI: OK"
fi

# 1g. Verify python3 is available
if ! command -v python3 >/dev/null 2>&1; then
  log_error "python3 not found in PATH"
  exit 1
fi
log_info "python3: OK"

# Summary of pre-flight checks
if [ "$preflight_ok" -eq 0 ]; then
  log_error "Pre-flight checks FAILED -- see errors above"
  exit 1
fi
log_info "Pre-flight checks: ALL PASSED"

# If dry-run, exit here
if [ "$DRY_RUN" -eq 1 ]; then
  log_info "=== Dry-run complete: config valid, all files present ==="
  log_info "Configuration summary:"
  log_info "  Agents: $(echo $AGENT_IDS | tr '\n' ' ')"
  log_info "  Queries: $(echo $QUERY_IDS | tr '\n' ' ')"
  log_info "  Runs per query: $RUNS_PER_QUERY"
  log_info "  Score-only mode: $SCORE_ONLY"
  exit 0
fi

# ---------------------------------------------------------------------------
# Stage 2: Config loading and results initialization
# ---------------------------------------------------------------------------
log_info "=== Stage 2: Config loading ==="

# Create results directory if needed
mkdir -p "$RESULTS_DIR"

# Load scoring thresholds
SPEED_THRESHOLDS=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
print(json.dumps(cfg['scoring']['speed']['thresholds']))
")

EFFICIENCY_THRESHOLDS=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
print(json.dumps(cfg['scoring']['efficiency']['thresholds']))
")

# Load judge prompt file paths
JUDGE_COVERAGE_FILE=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
print(cfg['scoring']['coverage']['judge_prompt_file'])
")

JUDGE_ACCURACY_FILE=$(python3 -c "
import json
with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)
print(cfg['scoring']['accuracy']['judge_prompt_file'])
")

# Build list of agents and queries (as space-separated, trimmed)
AGENT_LIST=$(echo "$AGENT_IDS" | tr '\n' ' ' | sed 's/ *$//')
QUERY_LIST=$(echo "$QUERY_IDS" | tr '\n' ' ' | sed 's/ *$//')

log_info "Agents: $AGENT_LIST"
log_info "Queries: $QUERY_LIST"
log_info "Runs per query: $RUNS_PER_QUERY"

# Initialize or load results JSON
RESULTS_FILE="$RESULTS_DIR/${RUN_ID}.json"

if [ -n "$RESUME_FILE" ]; then
  if [ ! -f "$RESUME_FILE" ]; then
    log_error "Resume file not found: $RESUME_FILE"
    exit 1
  fi
  if ! python3 -c "import json; json.load(open('$RESUME_FILE'))" 2>/dev/null; then
    log_error "Resume file is not valid JSON: $RESUME_FILE"
    exit 1
  fi
  # Copy resume file to new results file
  cp "$RESUME_FILE" "$RESULTS_FILE"
  RUN_ID=$(python3 -c "
import json
with open('$RESULTS_FILE') as f:
    r = json.load(f)
print(r.get('run_id', 'run-resumed'))
")
  log_info "Resuming from: $RESUME_FILE (run_id: $RUN_ID)"
else
  # Create initial results structure
  python3 -c "
import json

with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)

agents = [a['id'] for a in cfg['agents']]
queries = [q['id'] for q in cfg['queries']]

results = {
    'run_id': '$RUN_ID',
    'benchmark_version': cfg['benchmark']['version'],
    'timestamp': '$TIMESTAMP',
    'config': {
        'agents': agents,
        'queries': queries,
        'runs_per_query': $RUNS_PER_QUERY,
        'speed_thresholds': cfg['scoring']['speed']['thresholds'],
        'efficiency_thresholds': cfg['scoring']['efficiency']['thresholds']
    },
    'queries': [],
    'summary': {},
    'winner': '',
    'margin': 0,
    'confidence': ''
}

with open('$RESULTS_FILE', 'w') as f:
    json.dump(results, f, indent=2)
"
  log_info "Results file initialized: $RESULTS_FILE"
fi

# ---------------------------------------------------------------------------
# Helper: check if a query+agent+run is already scored (for --resume)
# ---------------------------------------------------------------------------
is_already_scored() {
  _qid="$1"
  _agent="$2"
  _run="$3"
  python3 -c "
import json, sys
with open('$RESULTS_FILE') as f:
    r = json.load(f)
for q in r.get('queries', []):
    if q.get('query_id') == '$_qid':
        ar = q.get('agent_results', {}).get('$_agent', {})
        runs = ar.get('runs', [])
        for run in runs:
            if run.get('run_number') == $_run:
                if run.get('scored', False):
                    sys.exit(0)
sys.exit(1)
" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Helper: invoke judge with retry logic
# Uses temp files to avoid shell quoting issues with judge output
# ---------------------------------------------------------------------------
invoke_judge() {
  _prompt_file="$1"
  _retry_count=0
  _max_retries=3
  _judge_score="JUDGE_ERROR"
  _judge_output_file="$TMPDIR_WORK/judge_output.txt"

  while [ "$_retry_count" -lt "$_max_retries" ]; do
    # Log to stderr so it does not pollute the return value captured via $()
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] [INFO]   Invoking judge (attempt $((_retry_count + 1))/$_max_retries)..." >&2

    # Invoke claude with the rendered prompt, unsetting CLAUDECODE
    (unset CLAUDECODE && cat "$_prompt_file" | claude -p --model haiku > "$_judge_output_file" 2>&1) || true

    # Parse the judge score from the output file (avoids quoting issues)
    _judge_score=$(python3 -c "
import sys, os
sys.path.insert(0, '$SCRIPT_DIR')
from scoring import parse_judge_score
with open('$_judge_output_file', 'r') as f:
    judge_text = f.read()
result = parse_judge_score(judge_text)
print(result)
" 2>/dev/null) || _judge_score="JUDGE_ERROR"

    if [ "$_judge_score" != "JUDGE_ERROR" ]; then
      break
    fi

    _retry_count=$((_retry_count + 1))
    if [ "$_retry_count" -lt "$_max_retries" ]; then
      _sleep_time=$((1 << (_retry_count - 1)))
      echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] [WARN]   Judge returned JUDGE_ERROR, retry $_retry_count/$_max_retries (backoff: ${_sleep_time}s)" >&2
      sleep "$_sleep_time"
    else
      echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] [WARN]   Judge failed after $_max_retries retries" >&2
    fi
  done

  echo "$_judge_score"
}

# ---------------------------------------------------------------------------
# Stage 3: Main scoring pipeline
# ---------------------------------------------------------------------------
log_info "=== Stage 3: Scoring pipeline ==="

total_scored=0
total_errors=0

for qid in $QUERY_LIST; do
  # Export query metadata to temp files to avoid quoting issues
  # Python writes structured data to files; shell reads only simple values
  _qmeta_dir="$TMPDIR_WORK/$qid"
  mkdir -p "$_qmeta_dir"

  python3 -c "
import json, re, os

with open('$BENCHMARK_JSON') as f:
    cfg = json.load(f)

query = None
for q in cfg['queries']:
    if q['id'] == '$qid':
        query = q
        break

if query is None:
    raise SystemExit('Query $qid not found in benchmark.json')

outdir = '$_qmeta_dir'

# Write query text
with open(os.path.join(outdir, 'query_text.txt'), 'w') as f:
    f.write(query['text'])

# Write category
with open(os.path.join(outdir, 'category.txt'), 'w') as f:
    f.write(query.get('category', ''))

# Write query type
with open(os.path.join(outdir, 'query_type.txt'), 'w') as f:
    f.write(query.get('query_type', 'positive'))

# Write ground truth file path
with open(os.path.join(outdir, 'gt_file.txt'), 'w') as f:
    f.write(query['ground_truth_file'])

# Load ground truth and extract sections
gt_path = os.path.join('$SCRIPT_DIR', query['ground_truth_file'])
with open(gt_path, 'r') as f:
    content = f.read()

# Extract Coverage Topics section
match = re.search(r'## Coverage Topics\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
with open(os.path.join(outdir, 'coverage_topics.txt'), 'w') as f:
    f.write(match.group(1).strip() if match else 'No coverage topics found')

# Extract Accuracy Markers section
match = re.search(r'## Accuracy Markers\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
with open(os.path.join(outdir, 'accuracy_markers.txt'), 'w') as f:
    f.write(match.group(1).strip() if match else 'No accuracy markers found')
" || {
    log_error "Failed to load metadata for query $qid"
    total_errors=$((total_errors + 1))
    continue
  }

  query_category=$(cat "$_qmeta_dir/category.txt")
  query_type=$(cat "$_qmeta_dir/query_type.txt")

  log_info "--- Query: $qid ($query_category) ---"

  run_num=1
  while [ "$run_num" -le "$RUNS_PER_QUERY" ]; do
    for agent in $AGENT_LIST; do
      log_info "Processing: $qid / $agent / run $run_num"

      # Check if already scored (for --resume)
      if [ -n "$RESUME_FILE" ]; then
        if is_already_scored "$qid" "$agent" "$run_num"; then
          log_info "  Already scored (resuming) -- skipping"
          total_scored=$((total_scored + 1))
          continue
        fi
      fi

      # 3a. Locate JSONL file for this agent/query/run
      # Convention: runs/run<N>/<agent>-<qid>.jsonl
      jsonl_path=""

      # Check conventional path first
      conventional_path="$SCRIPT_DIR/runs/run${run_num}/${agent}-${qid}.jsonl"
      if [ -f "$conventional_path" ]; then
        jsonl_path="$conventional_path"
      fi

      # Also check without run number for single-run setups
      if [ -z "$jsonl_path" ]; then
        alt_path="$SCRIPT_DIR/runs/${agent}-${qid}.jsonl"
        if [ -f "$alt_path" ]; then
          jsonl_path="$alt_path"
        fi
      fi

      # Check flat runs directory with run suffix
      if [ -z "$jsonl_path" ]; then
        alt_path2="$SCRIPT_DIR/runs/${agent}-${qid}-run${run_num}.jsonl"
        if [ -f "$alt_path2" ]; then
          jsonl_path="$alt_path2"
        fi
      fi

      if [ -z "$jsonl_path" ] || [ ! -f "$jsonl_path" ]; then
        log_warn "  JSONL file not found for $agent/$qid/run$run_num -- skipping"
        log_warn "  Searched: $conventional_path"
        total_errors=$((total_errors + 1))
        continue
      fi

      log_info "  JSONL: $jsonl_path"

      # 3b. Extract metrics via collect-stats.py
      metrics_file="$TMPDIR_WORK/${qid}_${agent}_run${run_num}_metrics.json"
      if ! python3 "$SCRIPT_DIR/collect-stats.py" --jsonl-path "$jsonl_path" --extract-metrics > "$metrics_file" 2>"$TMPDIR_WORK/collect_err.txt"; then
        log_error "  Failed to extract metrics from: $jsonl_path"
        cat "$TMPDIR_WORK/collect_err.txt" >&2 || true
        total_errors=$((total_errors + 1))
        continue
      fi

      duration=$(python3 -c "import json; print(json.load(open('$metrics_file'))['duration_seconds'])")
      tool_calls=$(python3 -c "import json; print(json.load(open('$metrics_file'))['total_tool_calls'])")

      log_info "  Metrics: duration=${duration}s, tool_calls=$tool_calls"

      # 3c. Mechanical scoring
      speed_score=$(python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from scoring import score_speed
print(score_speed($duration, $SPEED_THRESHOLDS))
")

      efficiency_score=$(python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from scoring import score_efficiency
print(score_efficiency($tool_calls, $EFFICIENCY_THRESHOLDS))
")

      log_info "  Mechanical scores: speed=$speed_score, efficiency=$efficiency_score"

      # 3d. Extract agent summary to a temp file
      summary_file="$TMPDIR_WORK/${qid}_${agent}_run${run_num}_summary.txt"
      python3 -c "import json; print(json.load(open('$metrics_file'))['final_summary'])" > "$summary_file"

      # 3e. Render judge prompts via Python (all data via file paths, no shell quoting)
      coverage_prompt_file="$TMPDIR_WORK/${qid}_${agent}_run${run_num}_coverage_prompt.md"
      python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from scoring import render_judge_prompt

with open('$summary_file', 'r') as f:
    agent_summary = f.read()
with open('$_qmeta_dir/query_text.txt', 'r') as f:
    query = f.read()
with open('$_qmeta_dir/coverage_topics.txt', 'r') as f:
    coverage_topics = f.read()

rendered = render_judge_prompt(
    '$SCRIPT_DIR/$JUDGE_COVERAGE_FILE',
    {
        'query': query,
        'coverage_topics': coverage_topics,
        'agent_summary': agent_summary
    }
)
with open('$coverage_prompt_file', 'w') as f:
    f.write(rendered)
"

      log_info "  Invoking coverage judge..."
      coverage_score=$(invoke_judge "$coverage_prompt_file")

      if [ "$coverage_score" = "JUDGE_ERROR" ]; then
        log_warn "  Coverage judge failed -- using score 0"
        coverage_score=0
      fi
      log_info "  Coverage score: $coverage_score"

      # Render accuracy judge prompt
      accuracy_prompt_file="$TMPDIR_WORK/${qid}_${agent}_run${run_num}_accuracy_prompt.md"
      python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from scoring import render_judge_prompt

with open('$summary_file', 'r') as f:
    agent_summary = f.read()
with open('$_qmeta_dir/query_text.txt', 'r') as f:
    query = f.read()
with open('$_qmeta_dir/accuracy_markers.txt', 'r') as f:
    accuracy_markers = f.read()

rendered = render_judge_prompt(
    '$SCRIPT_DIR/$JUDGE_ACCURACY_FILE',
    {
        'query': query,
        'accuracy_markers': accuracy_markers,
        'agent_summary': agent_summary
    }
)
with open('$accuracy_prompt_file', 'w') as f:
    f.write(rendered)
"

      log_info "  Invoking accuracy judge..."
      accuracy_score=$(invoke_judge "$accuracy_prompt_file")

      if [ "$accuracy_score" = "JUDGE_ERROR" ]; then
        log_warn "  Accuracy judge failed -- using score 0"
        accuracy_score=0
      fi
      log_info "  Accuracy score: $accuracy_score"

      # Calculate total score
      total_score=$((speed_score + efficiency_score + coverage_score + accuracy_score))
      log_info "  Total score: $total_score (speed=$speed_score + efficiency=$efficiency_score + coverage=$coverage_score + accuracy=$accuracy_score)"

      # 3f. Write results to disk after each query (resumability)
      # Use Python with file paths for all text data to avoid quoting issues
      python3 -c "
import json

with open('$RESULTS_FILE') as f:
    results = json.load(f)

with open('$_qmeta_dir/query_text.txt', 'r') as f:
    query_text = f.read().strip()

qid = '$qid'
agent = '$agent'
run_num = $run_num
query_type = '$query_type'

# Find or create query entry
query_entry = None
for q in results['queries']:
    if q['query_id'] == qid:
        query_entry = q
        break

if query_entry is None:
    query_entry = {
        'query_id': qid,
        'query_text': query_text,
        'query_type': query_type,
        'agent_results': {}
    }
    results['queries'].append(query_entry)

# Find or create agent entry within query
if agent not in query_entry['agent_results']:
    query_entry['agent_results'][agent] = {
        'runs': [],
        'metrics': {},
        'mechanical_scores': {},
        'judge_scores': {},
        'total_score': 0
    }

agent_entry = query_entry['agent_results'][agent]

# Add the run result
run_result = {
    'run_number': run_num,
    'scored': True,
    'jsonl_path': '$jsonl_path',
    'metrics': {
        'duration_seconds': $duration,
        'total_tool_calls': $tool_calls
    },
    'speed': $speed_score,
    'efficiency': $efficiency_score,
    'coverage': $coverage_score,
    'accuracy': $accuracy_score,
    'total': $total_score
}

# Replace existing run if present, else append
replaced = False
for i, existing in enumerate(agent_entry['runs']):
    if existing.get('run_number') == run_num:
        agent_entry['runs'][i] = run_result
        replaced = True
        break
if not replaced:
    agent_entry['runs'].append(run_result)

# Update single-run convenience fields with latest run
agent_entry['metrics'] = run_result['metrics']
agent_entry['mechanical_scores'] = {
    'speed': $speed_score,
    'efficiency': $efficiency_score
}
agent_entry['judge_scores'] = {
    'coverage': $coverage_score,
    'accuracy': $accuracy_score
}
agent_entry['total_score'] = $total_score

with open('$RESULTS_FILE', 'w') as f:
    json.dump(results, f, indent=2)
"

      total_scored=$((total_scored + 1))
      log_info "  Result saved to: $RESULTS_FILE"

    done  # agents
    run_num=$((run_num + 1))
  done  # runs
done  # queries

log_info "Scoring complete: $total_scored scored, $total_errors errors"

# ---------------------------------------------------------------------------
# Stage 4: Statistical aggregation
# ---------------------------------------------------------------------------
if [ "$RUNS_PER_QUERY" -gt 1 ]; then
  log_info "=== Stage 4: Statistical aggregation ==="
else
  log_info "=== Stage 4: Summary computation ==="
fi

python3 -c "
import json, sys
sys.path.insert(0, '$SCRIPT_DIR')
from scoring import compute_run_statistics, determine_winner

with open('$RESULTS_FILE') as f:
    results = json.load(f)

runs_per_query = $RUNS_PER_QUERY

# Compute per-query statistics for each agent (if multi-run)
if runs_per_query > 1:
    for query_data in results.get('queries', []):
        for agent_id, agent_data in query_data.get('agent_results', {}).items():
            runs = agent_data.get('runs', [])
            if len(runs) > 1:
                stats = compute_run_statistics(runs)
                agent_data['statistics'] = stats

# Compute per-agent summary across all queries
for agent_id in results['config']['agents']:
    dim_totals = {'speed': 0, 'efficiency': 0, 'coverage': 0, 'accuracy': 0}
    total_score = 0
    query_count = 0

    for query_data in results.get('queries', []):
        ar = query_data.get('agent_results', {}).get(agent_id, {})
        stats = ar.get('statistics', {})
        if stats and runs_per_query > 1:
            for dim in dim_totals:
                dim_totals[dim] += stats.get('mean_scores', {}).get(dim, 0)
            total_score += stats.get('mean_total_score', 0)
        else:
            runs = ar.get('runs', [])
            if runs:
                run = runs[-1]
                for dim in dim_totals:
                    dim_totals[dim] += run.get(dim, 0)
                total_score += run.get('total', 0)
        query_count += 1

    if runs_per_query > 1:
        results['summary'][agent_id] = {
            'dimension_means': dim_totals,
            'mean_total_score': total_score,
            'query_count': query_count
        }
    else:
        results['summary'][agent_id] = {
            'dimension_totals': dim_totals,
            'total_score': total_score,
            'query_count': query_count
        }

# Determine winner
if len(results['config']['agents']) >= 2:
    agent_stats = {}
    for agent_id in results['config']['agents']:
        s = results['summary'].get(agent_id, {})
        mean_total = s.get('mean_total_score', s.get('total_score', 0))
        agent_stats[agent_id] = {
            'mean_total_score': mean_total,
            'stdev_total_score': 0.0
        }
    winner_info = determine_winner(agent_stats)
    results['winner'] = winner_info['winner']
    results['margin'] = winner_info['margin']
    results['confidence'] = winner_info['confidence']

with open('$RESULTS_FILE', 'w') as f:
    json.dump(results, f, indent=2)
"
log_info "Aggregation complete"

# ---------------------------------------------------------------------------
# Stage 5: Report generation (unless --no-report)
# ---------------------------------------------------------------------------
if [ "$NO_REPORT" -eq 1 ]; then
  log_info "=== Stage 5: Report generation SKIPPED (--no-report) ==="
else
  log_info "=== Stage 5: Report generation ==="

  REPORT_FILE="$RESULTS_DIR/${RUN_ID}-report.md"

  python3 -c "
import json, sys
sys.path.insert(0, '$SCRIPT_DIR')
from scoring import generate_report

with open('$RESULTS_FILE') as f:
    results = json.load(f)

with open('$BENCHMARK_JSON') as f:
    config = json.load(f)

report = generate_report(results, config)

with open('$REPORT_FILE', 'w') as f:
    f.write(report)
"

  log_info "Report written to: $REPORT_FILE"
fi

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
log_info "=== Pipeline complete ==="
log_info "Results: $RESULTS_FILE"
if [ "$NO_REPORT" -eq 0 ]; then
  log_info "Report: $REPORT_FILE"
fi
log_info "Scored: $total_scored queries"
if [ "$total_errors" -gt 0 ]; then
  log_warn "Errors: $total_errors (see log above)"
  exit 2
fi
exit 0
