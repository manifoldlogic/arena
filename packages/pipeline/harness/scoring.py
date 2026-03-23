"""
Scoring module for Search Olympics Benchmark Harness v2.

Provides mechanical scoring, judge output parsing, judge prompt template rendering,
statistical aggregation, winner determination, and Markdown report generation.

Dependencies: Python stdlib only (statistics, json, re, os, math).
"""

import json
import math
import os
import re
import statistics


def score_speed(duration_seconds, thresholds=None):
    """5-tier speed scoring based on duration thresholds.

    Args:
        duration_seconds: Time taken in seconds (numeric).
        thresholds: List of 4 ascending threshold values.
            Defaults to [45, 60, 90, 120].

    Returns:
        Integer score from 5 (fastest) to 1 (slowest):
            <thresholds[0] => 5
            thresholds[0]-thresholds[1] => 4
            thresholds[1]-thresholds[2] => 3
            thresholds[2]-thresholds[3] => 2
            >thresholds[3] => 1
    """
    if thresholds is None:
        thresholds = [45, 60, 90, 120]

    if duration_seconds < thresholds[0]:
        return 5
    elif duration_seconds < thresholds[1]:
        return 4
    elif duration_seconds < thresholds[2]:
        return 3
    elif duration_seconds < thresholds[3]:
        return 2
    else:
        return 1


def score_efficiency(total_tool_calls, thresholds=None):
    """5-tier efficiency scoring based on tool call count thresholds.

    Args:
        total_tool_calls: Total number of tool calls (integer).
        thresholds: List of 4 ascending threshold values.
            Defaults to [20, 30, 45, 60].

    Returns:
        Integer score from 5 (most efficient) to 1 (least efficient):
            <thresholds[0] => 5
            thresholds[0]-thresholds[1] => 4
            thresholds[1]-thresholds[2] => 3
            thresholds[2]-thresholds[3] => 2
            >thresholds[3] => 1
    """
    if thresholds is None:
        thresholds = [20, 30, 45, 60]

    if total_tool_calls < thresholds[0]:
        return 5
    elif total_tool_calls < thresholds[1]:
        return 4
    elif total_tool_calls < thresholds[2]:
        return 3
    elif total_tool_calls < thresholds[3]:
        return 2
    else:
        return 1


def parse_judge_score(judge_output, max_score=5):
    """Parse 'SCORE: N' from judge output text.

    Args:
        judge_output: String containing judge's response.
        max_score: Maximum valid score (default 5).

    Returns:
        Integer score if valid (1 to max_score inclusive),
        or string 'JUDGE_ERROR' on parse failure or out-of-range.
    """
    if not isinstance(judge_output, str):
        return 'JUDGE_ERROR'

    # Robust to whitespace variations: match SCORE: followed by optional
    # whitespace and a number
    match = re.search(r'SCORE:\s*(\d+)', judge_output)
    if match:
        score = int(match.group(1))
        if 1 <= score <= max_score:
            return score

    return 'JUDGE_ERROR'


def render_judge_prompt(template_path, variables):
    """Render a judge prompt template by replacing {variable_name} placeholders.

    Reads the template file and replaces placeholders like {coverage_topics},
    {accuracy_markers}, {query}, and {agent_summary} with values from the
    variables dict.

    Args:
        template_path: Path to the template file.
        variables: Dict mapping variable names to replacement values.
            Supported: coverage_topics, accuracy_markers, query, agent_summary.

    Returns:
        Rendered prompt string with all placeholders replaced.

    Raises:
        FileNotFoundError: If template_path does not exist.
        ValueError: If a template variable is missing from variables dict.
    """
    with open(template_path, 'r') as f:
        template = f.read()

    # Find all {variable_name} placeholders in the template
    placeholders = re.findall(r'\{(\w+)\}', template)

    # Check for missing variables
    for placeholder in placeholders:
        if placeholder not in variables:
            raise ValueError(
                f"Template variable '{{{placeholder}}}' found in template "
                f"but not provided in variables dict. "
                f"Available variables: {list(variables.keys())}"
            )

    # Replace all placeholders with values
    rendered = template
    for name, value in variables.items():
        rendered = rendered.replace('{' + name + '}', str(value))

    return rendered


def compute_run_statistics(runs):
    """Compute mean and standard deviation for each scoring dimension across runs.

    Args:
        runs: List of run result dicts, each containing:
            - speed: int score
            - efficiency: int score
            - coverage: int score
            - accuracy: int score

    Returns:
        Dict with:
            - mean_scores: dict of dimension -> mean
            - stdev_scores: dict of dimension -> stdev
            - mean_total_score: mean of total scores
            - stdev_total_score: stdev of total scores
        For single-run case, stdev values are 0.0.
    """
    dimensions = ['speed', 'efficiency', 'coverage', 'accuracy']

    # Collect scores per dimension
    dim_scores = {dim: [] for dim in dimensions}
    total_scores = []

    for run in runs:
        run_total = 0
        for dim in dimensions:
            score = run[dim]
            dim_scores[dim].append(score)
            run_total += score
        total_scores.append(run_total)

    # Compute statistics
    mean_scores = {}
    stdev_scores = {}

    for dim in dimensions:
        values = dim_scores[dim]
        mean_scores[dim] = statistics.mean(values)
        if len(values) >= 2:
            stdev_scores[dim] = statistics.stdev(values)
        else:
            stdev_scores[dim] = 0.0

    mean_total = statistics.mean(total_scores)
    if len(total_scores) >= 2:
        stdev_total = statistics.stdev(total_scores)
    else:
        stdev_total = 0.0

    return {
        'mean_scores': mean_scores,
        'stdev_scores': stdev_scores,
        'mean_total_score': mean_total,
        'stdev_total_score': stdev_total,
    }


def determine_winner(agent_stats):
    """Determine the overall winner with confidence indicator.

    Args:
        agent_stats: Dict mapping agent_name -> statistics dict
            (from compute_run_statistics). Each statistics dict must contain
            'mean_total_score' and 'stdev_total_score'.

    Returns:
        Dict with:
            - winner: name of winning agent, or 'tie' if scores are equal
            - margin: absolute difference in mean_total_score
            - confidence: 'high' if margin > 2*max_stdev,
                          'medium' if margin > max_stdev,
                          'low' otherwise
    """
    # Find the agent with the highest mean total score
    sorted_agents = sorted(
        agent_stats.items(),
        key=lambda x: x[1]['mean_total_score'],
        reverse=True
    )

    best_name, best_stats = sorted_agents[0]
    second_name, second_stats = sorted_agents[1]

    margin = best_stats['mean_total_score'] - second_stats['mean_total_score']

    # Handle tie
    if margin == 0:
        return {
            'winner': 'tie',
            'margin': 0.0,
            'confidence': 'low',
        }

    # Confidence based on margin vs stdev
    # Use the larger of the two stdevs for conservative confidence estimate
    max_stdev = max(
        best_stats['stdev_total_score'],
        second_stats['stdev_total_score']
    )

    if max_stdev == 0:
        # If stdev is 0 (single run or identical scores), any margin is "high"
        confidence = 'high'
    elif margin > 2 * max_stdev:
        confidence = 'high'
    elif margin > max_stdev:
        confidence = 'medium'
    else:
        confidence = 'low'

    return {
        'winner': best_name,
        'margin': margin,
        'confidence': confidence,
    }


def generate_report(results, config):
    """Generate a Markdown report from benchmark results.

    Args:
        results: Results dict conforming to the schema in architecture.md Appendix A.
            Must contain: run_id, benchmark_version, config, queries, summary, winner, margin.
            Optional: confidence (for multi-run results).
        config: Benchmark configuration dict (from benchmark.json).

    Returns:
        Markdown report string.
    """
    lines = []

    # --- Section 1: Header and overall result ---
    run_id = results.get('run_id', 'unknown')
    benchmark_version = results.get('benchmark_version', 'unknown')
    agents = results.get('config', {}).get('agents', [])
    query_ids = results.get('config', {}).get('queries', [])
    num_queries = len(query_ids)
    runs_per_query = results.get('config', {}).get('runs_per_query', 1)
    winner = results.get('winner', 'unknown')
    margin = results.get('margin', 0)
    confidence = results.get('confidence', '')

    # Compute max possible score
    max_per_query = 20  # 4 dimensions x 5 max score
    max_possible = max_per_query * num_queries

    lines.append('# Search Olympics v2 -- Benchmark Report')
    lines.append('')
    lines.append(f'**Run ID:** {run_id}')
    lines.append(f'**Benchmark Version:** {benchmark_version}')
    lines.append(f'**Codebase:** {config.get("benchmark", {}).get("codebase", {}).get("name", "unknown")}')
    lines.append(f'**Queries:** {num_queries}')
    lines.append(f'**Runs per Query:** {runs_per_query}')
    lines.append('')

    # Overall result
    lines.append('## Overall Result')
    lines.append('')

    summary = results.get('summary', {})
    if winner == 'tie':
        # Get any agent's total for display
        first_agent = agents[0] if agents else 'unknown'
        first_total = _get_agent_total(summary, first_agent)
        lines.append(f'**Result: Tie** ({first_total} each out of {max_possible})')
    else:
        winner_total = _get_agent_total(summary, winner)
        loser = [a for a in agents if a != winner]
        loser_name = loser[0] if loser else 'unknown'
        loser_total = _get_agent_total(summary, loser_name)
        conf_str = f' (confidence: {confidence})' if confidence else ''
        lines.append(
            f'**Winner: {winner}**{conf_str} '
            f'({winner_total} vs {loser_total} out of {max_possible}, margin: {margin})'
        )
    lines.append('')

    # --- Section 2: Per-query comparison table ---
    lines.append('## Per-Query Results')
    lines.append('')

    header = '| Query | Category | ' + ' | '.join(agents) + ' | Winner |'
    separator = '|-------|----------|' + '|'.join(['---------'] * len(agents)) + '|--------|'
    lines.append(header)
    lines.append(separator)

    for query_data in results.get('queries', []):
        qid = query_data.get('query_id', '?')
        qtext = query_data.get('query_text', '')
        # Truncate query text for table display
        short_text = qtext[:40] + '...' if len(qtext) > 40 else qtext
        category = query_data.get('query_type', 'positive')

        # Find category from config
        query_config_category = ''
        for qc in config.get('queries', []):
            if qc.get('id') == qid:
                query_config_category = qc.get('category', '')
                break

        agent_results = query_data.get('agent_results', {})
        agent_totals = {}
        cells = []
        for agent in agents:
            ar = agent_results.get(agent, {})
            total = ar.get('total_score', 0)
            # For multi-run, use statistics mean
            stats = ar.get('statistics', {})
            if stats:
                total = stats.get('mean_total_score', total)
            agent_totals[agent] = total
            cells.append(str(round(total, 1) if isinstance(total, float) else total))

        # Determine per-query winner
        if len(agent_totals) >= 2:
            sorted_totals = sorted(agent_totals.items(), key=lambda x: x[1], reverse=True)
            if sorted_totals[0][1] > sorted_totals[1][1]:
                q_winner = sorted_totals[0][0]
            else:
                q_winner = 'Tie'
        else:
            q_winner = '-'

        row = f'| {qid}: {short_text} | {query_config_category} | ' + ' | '.join(cells) + f' | {q_winner} |'
        lines.append(row)

    lines.append('')

    # --- Section 3: Dimension totals ---
    lines.append('## Dimension Totals')
    lines.append('')

    dimensions = ['speed', 'efficiency', 'coverage', 'accuracy']
    dim_header = '| Dimension | ' + ' | '.join(agents) + ' |'
    dim_sep = '|-----------|' + '|'.join(['---------'] * len(agents)) + '|'
    lines.append(dim_header)
    lines.append(dim_sep)

    grand_totals = {}
    for agent in agents:
        grand_totals[agent] = 0

    for dim in dimensions:
        cells = []
        for agent in agents:
            agent_summary = summary.get(agent, {})
            # Multi-run format
            dim_means = agent_summary.get('dimension_means', {})
            # Single-run format
            dim_totals = agent_summary.get('dimension_totals', {})
            val = dim_means.get(dim, dim_totals.get(dim, 0))
            grand_totals[agent] += val
            cells.append(str(round(val, 1) if isinstance(val, float) else val))
        row = f'| {dim.capitalize()} | ' + ' | '.join(cells) + ' |'
        lines.append(row)

    # Total row
    total_cells = []
    for agent in agents:
        agent_summary = summary.get(agent, {})
        total = agent_summary.get('mean_total_score', agent_summary.get('total_score', grand_totals[agent]))
        total_cells.append(f'**{round(total, 1) if isinstance(total, float) else total}**')
    lines.append(f'| **Total** | ' + ' | '.join(total_cells) + ' |')
    lines.append('')

    # --- Section 4: Per-query detail breakdown ---
    lines.append('## Detailed Scores')
    lines.append('')

    for query_data in results.get('queries', []):
        qid = query_data.get('query_id', '?')
        qtext = query_data.get('query_text', '')
        lines.append(f'### {qid}: {qtext}')
        lines.append('')

        detail_header = '| Dimension | ' + ' | '.join(agents) + ' |'
        detail_sep = '|-----------|' + '|'.join(['---------'] * len(agents)) + '|'
        lines.append(detail_header)
        lines.append(detail_sep)

        agent_results = query_data.get('agent_results', {})
        query_totals = {}

        for dim in dimensions:
            cells = []
            for agent in agents:
                ar = agent_results.get(agent, {})
                # Multi-run: use statistics
                stats = ar.get('statistics', {})
                if stats and 'mean_scores' in stats:
                    score_val = stats['mean_scores'].get(dim, 0)
                    cells.append(str(round(score_val, 2)))
                else:
                    # Single-run: get from mechanical_scores and judge_scores
                    mech = ar.get('mechanical_scores', {})
                    judge = ar.get('judge_scores', {})
                    score_val = mech.get(dim, judge.get(dim, 0))
                    # Add raw metric for speed/efficiency
                    metrics = ar.get('metrics', {})
                    if dim == 'speed' and 'duration_seconds' in metrics:
                        cells.append(f'{score_val} ({metrics["duration_seconds"]:.0f}s)')
                    elif dim == 'efficiency' and 'total_tool_calls' in metrics:
                        cells.append(f'{score_val} ({metrics["total_tool_calls"]} calls)')
                    else:
                        cells.append(str(score_val))
            row = f'| {dim.capitalize()} | ' + ' | '.join(cells) + ' |'
            lines.append(row)

        # Total row per query
        total_cells = []
        for agent in agents:
            ar = agent_results.get(agent, {})
            stats = ar.get('statistics', {})
            if stats:
                total = stats.get('mean_total_score', 0)
            else:
                total = ar.get('total_score', 0)
            total_cells.append(f'**{round(total, 1) if isinstance(total, float) else total}**')
        lines.append(f'| **Total** | ' + ' | '.join(total_cells) + ' |')
        lines.append('')

        # Per-query winner
        agent_totals = {}
        for agent in agents:
            ar = agent_results.get(agent, {})
            stats = ar.get('statistics', {})
            if stats:
                agent_totals[agent] = stats.get('mean_total_score', 0)
            else:
                agent_totals[agent] = ar.get('total_score', 0)

        if len(agent_totals) >= 2:
            sorted_totals = sorted(agent_totals.items(), key=lambda x: x[1], reverse=True)
            if sorted_totals[0][1] > sorted_totals[1][1]:
                lines.append(f'**Winner:** {sorted_totals[0][0]}')
            else:
                lines.append('**Winner:** Tie')
        lines.append('')

    # --- Section 5: Key Findings ---
    lines.append('## Key Findings')
    lines.append('')

    finding_num = 1
    lines.append(
        f'{finding_num}. **Overall**: {winner} wins'
        + (f' with {confidence} confidence' if confidence else '')
        + f' (margin: {margin}).'
    )
    finding_num += 1

    for dim in dimensions:
        dim_vals = {}
        for agent in agents:
            agent_summary = summary.get(agent, {})
            dim_means = agent_summary.get('dimension_means', {})
            dim_totals = agent_summary.get('dimension_totals', {})
            dim_vals[agent] = dim_means.get(dim, dim_totals.get(dim, 0))

        sorted_dim = sorted(dim_vals.items(), key=lambda x: x[1], reverse=True)
        if len(sorted_dim) >= 2:
            lead = sorted_dim[0]
            trail = sorted_dim[1]
            diff = lead[1] - trail[1]
            if diff == 0:
                lines.append(
                    f'{finding_num}. **{dim.capitalize()}**: Tied at {lead[1]}.'
                )
            else:
                lines.append(
                    f'{finding_num}. **{dim.capitalize()}**: {lead[0]} leads '
                    f'({lead[1]} vs {trail[1]}, +{round(diff, 1)}).'
                )
        finding_num += 1

    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('*Report generated by Search Olympics Benchmark Harness v2*')

    return '\n'.join(lines)


def _get_agent_total(summary, agent_name):
    """Helper to extract total score for an agent from summary."""
    agent_summary = summary.get(agent_name, {})
    return agent_summary.get('mean_total_score', agent_summary.get('total_score', 0))
