# [LANGUAGE] Benchmark Repo Evaluation

<!--
  EVALUATION TEMPLATE

  This template is used for BENCH-02 (Go) and BENCH-03 (Java) evaluations.
  See specs/benchmarks/rust-evaluation.md for a completed example.

  Instructions:
  1. Replace all [BRACKETED PLACEHOLDERS] with language-specific content.
  2. Follow the <!-- Evaluator: ... --> guidance comments in each section.

3. Rate each criterion as Strong, Adequate, or Weak with cited evidence.
4. Do not add or remove sections — maintain this structure for cross-language consistency.
   -->

## Evaluation Criteria

This document evaluates [NUMBER] [LANGUAGE] repository candidates for inclusion in Arena's benchmark suite. Each candidate is assessed against six criteria using a three-tier rubric:

- **Strong**: Evidence clearly supports benchmark suitability for this criterion. The repo excels in ways that reduce onboarding risk and increase benchmark value.
- **Adequate**: Evidence shows this criterion is met at a functional level but is not exceptional. The repo can serve as a benchmark target but may require additional effort or carry minor limitations.
- **Weak**: Evidence shows a meaningful gap or concern for this criterion. The gap may block onboarding or significantly reduce the repo's value as a benchmark target.

The six criteria are:

1. **Test Suite Reliability** -- Whether the repo has a comprehensive, stable test suite that produces consistent results across runs and platforms. A reliable test suite is essential for distinguishing genuine agent-produced fixes from false positives.

2. **CI Reproducibility** -- Whether the CI configuration can be reproduced in Arena's benchmark environment. This includes workflow complexity, external dependencies, platform matrix breadth, and pinned toolchain versions.

3. **Issue History Depth** -- Whether the repo has a rich history of issues with clear problem descriptions, reproduction steps, and linked fixes. Deep issue history supports task curation for SWE-bench-style benchmarks.

4. **Validated Task Count** -- How many curated benchmark tasks already exist for this repo in Multi-SWE-bench and SWE-bench Multilingual. A higher validated task count reduces the effort needed to establish a meaningful benchmark baseline.

5. **Codebase Complexity** -- Whether the codebase size, structure, and module boundaries create a realistic and challenging benchmark environment. Too simple means the benchmark lacks discriminative power; too complex means high onboarding cost.

6. **Community Health** -- Whether the project is actively maintained with regular releases, responsive issue triage, and a stable contributor base. Healthy projects produce a steady stream of new issues suitable for benchmark task curation.

---

## Candidate Evaluations

<!-- Evaluator: Repeat the entire subsection below (from ### to the end of the Summary Rating table) for each candidate repository. Add horizontal rules (---) between candidates. -->

### [OWNER]/[REPO]

#### Overview

<!-- Evaluator: Provide a concise summary of the repository including:
  - What the project does (one sentence)
  - Creation year and age as of the evaluation date
  - Star count, approximate contributor count, license
  - Codebase scale: number of modules/packages, file count, lines of code
  - Notable benchmark dataset presence (e.g., Multi-SWE-bench instance count)
  All statistics must include the date they were collected. -->

[Describe the repository: purpose, age, stars, contributors, license, codebase scale, and benchmark dataset presence. Include collection date for all statistics.]

#### Criterion 1: Test Suite Reliability

**Rating: [CRITERION RATING: Strong / Adequate / Weak]**

<!-- Evaluator: Describe the test infrastructure. Evidence to collect:
  - CI job structure (what test suites run, how they are organized)
  - Cross-platform coverage (which OS targets, architecture targets)
  - Specialized testing (sanitizers, fuzz testing, coverage tracking, etc.)
  - Recent CI stability (check the last 3+ runs on the default branch)

  Strong: Multi-platform CI consistently green, comprehensive test types, coverage tracking.
  Adequate: CI passes but limited platform coverage or test types; no major red flags.
  Weak: Flaky CI, single-platform only, minimal test coverage, or recent failures on default branch. -->

[Describe the test infrastructure, cross-platform coverage, specialized testing modes, and recent CI stability. Cite specific evidence (e.g., "3 most recent CI runs all green as of [DATE]").]

#### Criterion 2: CI Reproducibility

**Rating: [CRITERION RATING: Strong / Adequate / Weak]**

<!-- Evaluator: Assess how feasible it is to reproduce the CI in Arena's environment. Evidence to collect:
  - Number and size of workflow files
  - Build matrix breadth (OS targets, toolchain versions, feature flags)
  - External dependencies (third-party services, cross-language requirements)
  - Pinned toolchain versions or MSRV policies

  Strong: Simple CI with few external dependencies; straightforward to reproduce.
  Adequate: Moderately complex CI; reproducible with effort but has external integrations or broad matrices.
  Weak: Highly complex CI with many external dependencies; full reproduction is costly or impractical.

  Note: If the full CI is too complex to reproduce, identify a feasible subset for initial onboarding and document what is excluded and why. -->

[Describe the CI configuration complexity, build matrix, external dependencies, and toolchain requirements. Identify any components that should be excluded from initial benchmark reproduction and explain why.]

#### Criterion 3: Issue History Depth

**Rating: [CRITERION RATING: Strong / Adequate / Weak]**

<!-- Evaluator: Assess the issue history for SWE-bench-style task curation potential. Evidence to collect:
  - Total open issues and PRs (with date)
  - Project age and issue volume trajectory
  - Issue quality: clear descriptions, reproduction steps, linked fixes
  - Response times (sample a few recent issues)

  Strong: Large volume of well-structured issues with clear reproduction steps; fast response times; history amenable to automated task extraction.
  Adequate: Functional issue history but lower volume, less structured descriptions, or slower response times.
  Weak: Sparse issue history, poor issue quality, or issues that lack reproduction steps. -->

[Describe the issue history volume, quality, response times, and suitability for task curation. Cite specific examples (e.g., "issue #N created [DATE], closed [DATE] with N comments").]

#### Criterion 4: Validated Task Count

**Rating: [CRITERION RATING: Strong / Adequate / Weak]**

<!-- Evaluator: Report the number of pre-curated benchmark tasks. Evidence to collect:
  - Multi-SWE-bench instance count (source: arxiv:2504.02605, Table 1, #Num column)
  - SWE-bench Multilingual task count (source: swebench.com/multilingual.html)
  - Combined total
  - Any additional per-repo statistics from Multi-SWE-bench (avg tokens per issue, avg files changed per fix)

  Use the format: "Multi-SWE-bench instances: N | SWE-bench Multilingual tasks: N"
  If a repo is absent from a dataset, state that explicitly (e.g., "0 (absent)").

  Strong: Large pre-curated task pool (50+ instances) sufficient for immediate benchmarking.
  Adequate: Moderate task pool (15-50 instances); functional for initial benchmarking but may need supplementation.
  Weak: Fewer than 15 instances or absent from primary datasets; requires significant curation effort. -->

Multi-SWE-bench instances: [N or 0 (absent)] | SWE-bench Multilingual tasks: [N or 0 (absent)]

[Report the validated task counts with sources and collection dates. Compare to other candidates if relevant. Note any discrepancies with planning document figures.]

#### Criterion 5: Codebase Complexity

**Rating: [CRITERION RATING: Strong / Adequate / Weak]**

<!-- Evaluator: Assess codebase complexity as a benchmark characteristic. Evidence to collect:
  - Lines of code, file count, module/package count
  - Architectural patterns (monorepo, workspace modules, microservices, etc.)
  - Cross-module dependency depth
  - Average files changed per fix (from Multi-SWE-bench if available)

  Strong: Substantial codebase with meaningful cross-module interactions; tasks require multi-file reasoning.
  Adequate: Moderate codebase; provides useful benchmark tasks but limited diversity or cross-module complexity.
  Weak: Too simple (trivial tasks) or too complex (prohibitive onboarding cost with little benchmark payoff). -->

[Describe the codebase scale, architecture, cross-module dependencies, and what this means for benchmark task difficulty. Cite LOC, file counts, and avg files changed per fix.]

#### Criterion 6: Community Health

**Rating: [CRITERION RATING: Strong / Adequate / Weak]**

<!-- Evaluator: Assess project maintenance and sustainability. Evidence to collect:
  - Release frequency (count in past 12 months, latest release date)
  - Most recent commit date
  - Contributor count and trajectory
  - Star count (as a proxy for ecosystem importance)
  - Communication channels (Discord, mailing list, etc.)

  Strong: Regular releases (monthly or more), recent commits, large contributor base, active communication.
  Adequate: Releases and commits are recent but less frequent; smaller but stable contributor base.
  Weak: Stale releases, infrequent commits, declining contributor activity, or signs of abandonment. -->

[Describe the release cadence, recent commit activity, contributor base, and sustainability indicators. Cite specific dates and counts.]

#### Summary Rating

| Criterion              | Rating                     |
| ---------------------- | -------------------------- |
| Test Suite Reliability | [Strong / Adequate / Weak] |
| CI Reproducibility     | [Strong / Adequate / Weak] |
| Issue History Depth    | [Strong / Adequate / Weak] |
| Validated Task Count   | [Strong / Adequate / Weak] |
| Codebase Complexity    | [Strong / Adequate / Weak] |
| Community Health       | [Strong / Adequate / Weak] |

---

<!-- Evaluator: Repeat the candidate subsection above for each additional repository.
     Separate candidates with horizontal rules (---). -->

## Cross-Candidate Comparison

<!-- Evaluator: Consolidate key metrics from the per-candidate evaluations into
  side-by-side comparison tables for quick reference. Suggested tables:

  - SWE-bench Participation (Multi-SWE-bench instances, SWE-bench Multilingual tasks, combined total)
  - GitHub Statistics (stars, contributors, open issues+PRs, age)
  - Codebase Scale (modules/packages, files, LOC)
  - CI Maturity (workflow files, primary CI size, OS coverage, special testing)

  All figures should be drawn from the candidate sections above. -->

### SWE-bench Participation

| Repo           | Multi-SWE-bench Instances | SWE-bench Multilingual Tasks | Combined Total |
| -------------- | ------------------------- | ---------------------------: | -------------: |
| [OWNER]/[REPO] | [N or 0 (absent)]         |            [N or 0 (absent)] |            [N] |

### GitHub Statistics (as of [DATE])

| Repo           | Stars | Contributors | Open Issues+PRs | Age       |
| -------------- | ----: | -----------: | --------------: | --------- |
| [OWNER]/[REPO] |   [N] |         [~N] |             [N] | [N years] |

### Codebase Scale

| Repo           | Modules/Packages | Files |  LOC |
| -------------- | :--------------: | ----: | ---: |
| [OWNER]/[REPO] |       [N]        |   [N] | [Nk] |

### CI Maturity

| Repo           | Workflow Files | Primary CI Size | OS Coverage   | Special Testing |
| -------------- | :------------: | --------------: | ------------- | --------------- |
| [OWNER]/[REPO] |      [N]       |          [N KB] | [description] | [description]   |

---

## Comparative Ranking

<!-- Evaluator: Rank all candidates from most to least suitable. For each rank:
  - State the rank position and repo name
  - Explain why this repo ranks where it does relative to the others
  - Highlight the key differentiating factor(s)
  - If the ranking diverges from a naive reading of the summary rating tables
    (e.g., a repo with more "Adequate" ratings ranks above one with more "Strong" ratings),
    explain the reasoning explicitly

  The ranking is a reasoned judgment, not a numeric sum of ratings. -->

### 1. [OWNER]/[REPO] (Recommended Primary)

[Explain why this candidate ranks first. Identify the decisive advantage and address any weaknesses.]

### 2. [OWNER]/[REPO] (Recommended Secondary)

[Explain why this candidate ranks second. Compare to the primary pick and note what makes it a strong secondary choice.]

### 3. [OWNER]/[REPO] ([Conditional / Not Recommended])

[Explain this ranking. Note what would need to change for the candidate to move up.]

<!-- Add additional ranked entries as needed for all candidates. -->

---

## Recommendation

### Primary Pick: [OWNER]/[REPO]

[Summarize why this repo is recommended as the primary benchmark target. Reference the key strengths (validated task count, CI reliability, etc.) and explain how it enables Arena to establish a benchmark baseline with minimal overhead.]

### Secondary Pick: [OWNER]/[REPO]

[Summarize why this repo is recommended as the secondary target. Explain what it adds beyond the primary pick (e.g., domain diversity, codebase complexity) and when it should be onboarded.]

### Not Recommended for Initial Onboarding

<!-- Evaluator: List any candidates that are not recommended, with a one-sentence reason for each. -->

- **[OWNER]/[REPO]**: [One-sentence reason for exclusion. Note conditions under which this could be revisited.]

---

## Methodology Notes

<!-- Evaluator: Document how the evaluation was conducted for transparency and reproducibility. -->

- **Data collection date:** [YYYY-MM-DD]
- **Sources used:**
  - [List all data sources with URLs: GitHub API, Multi-SWE-bench paper/dataset, SWE-bench Multilingual, etc.]
- **No live builds were performed.** All CI and test suite assessments are based on GitHub Actions data (workflow configurations, recent run statuses, and CI badge states) rather than local build reproduction. [If a toolchain verification report was consumed, cite it here instead.]
- [Note any data corrections, discrepancies with planning documents, or caveats that affect interpretation.]
