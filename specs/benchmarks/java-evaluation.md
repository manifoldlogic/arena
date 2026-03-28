# Java Benchmark Repo Evaluation

> Structure defined by BENCH-03 (Java). BENCH-01 (Rust) and BENCH-02 (Go) outputs should conform to this table structure when produced.

**Evaluation date**: 2026-03-28
**Evaluation basis**: Published data only (no live execution). Java toolchain is not yet installed in the Arena devcontainer. See [DevContainer Toolchain Requirements](#devcontainer-toolchain-requirements) for the specification to close this gap.

---

## Methodology

### Evaluation Criteria

Each candidate repository is assessed against six standardized criteria shared with BENCH-01 (Rust) and BENCH-02 (Go) evaluations. The criteria are defined as follows:

1. **Test Suite Reliability** -- Does the test suite run deterministically? Are there known flaky tests? What testing frameworks and conventions are used?
2. **CI Reproducibility** -- Does CI run on GitHub Actions? Can builds be reproduced in a containerized environment? What are the build system requirements?
3. **Issue History Depth** -- How many issues exist? What is the distribution across bug reports, feature requests, and discussions? Is there sufficient material for competition task mining?
4. **Validated Task Count** -- How many instances exist across Multi-SWE-bench, SWE-bench Multilingual, and SWE-bench-java-verified? What difficulty distribution is available?
5. **Codebase Complexity** -- How large is the codebase (files, lines of code, modules)? Is it within agent tool budget constraints? For benchmark suitability, smaller and more navigable is better.
6. **Community Health** -- Stars, contributors, recent release cadence, maintainer health, organizational backing.

### Rating Scale

Each criterion receives one of three categorical ratings:

| Rating       | Definition                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strong**   | The repository clearly meets or exceeds the criterion's requirements for benchmark suitability. Minor weaknesses may exist but do not materially affect viability.    |
| **Adequate** | The repository meets the criterion's minimum requirements. Notable limitations exist and are documented, but they do not disqualify the repository.                   |
| **Weak**     | The repository falls short of the criterion's requirements. Mitigating factors are documented, but the weakness represents a material risk for benchmark suitability. |

No fourth tier (e.g., "Disqualifying") is used. Repositories with severe weaknesses receive a Weak rating with disqualifying concerns noted in the narrative.

### Data Sources

This evaluation uses published data only. No live `mvn test` or `./gradlew check` execution was performed because the Arena devcontainer does not currently include a Java toolchain (this is a documented gap, not a blocker for evaluation). All quantitative claims cite specific sources. Primary sources:

- Multi-SWE-bench paper: arXiv:2504.02605v1, Table 1 (columns: Repository, Files, LoC, Instances, Avg Issue Tokens, Avg Patch Lines)
- SWE-bench Multilingual: swebench.com/multilingual.html
- SWE-bench-java-verified: arXiv:2408.14354
- GitHub API: Stars, issues, contributors, releases, workflows (retrieved 2026-03-28)
- DevContainer features: github.com/devcontainers/features/tree/main/src/java
- OpenHub: openhub.net/p/lucene (Lucene codebase metrics)

### Critical Data Correction

The planning document `analysis.md` misread Multi-SWE-bench Table 1 columns. Numbers cited as "instance counts" were actually the **Files** column. Corrected values used throughout this document:

| Repository      | Files (Table 1) | Instances (Table 1) | analysis.md claimed |
| --------------- | --------------- | ------------------- | ------------------- |
| google/gson     | 261             | **5**               | "261 instances"     |
| mockito/mockito | 986             | **6**               | "986 instances"     |
| apache/dubbo    | 3,939           | **3**               | "3,939 instances"   |

Source: arXiv:2504.02605v1, Table 1.

---

## Candidate Evaluations

### google/gson

#### Profile

| Metric             | Value                                                                                            | Source                                |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Stars              | 24,351                                                                                           | GitHub API, 2026-03-28                |
| Forks              | 4,417                                                                                            | GitHub API, 2026-03-28                |
| Open Issues        | 336                                                                                              | GitHub API, 2026-03-28 (includes PRs) |
| Contributors       | 156                                                                                              | GitHub API, 2026-03-28                |
| Language           | Java (100%)                                                                                      | GitHub API                            |
| License            | Apache-2.0                                                                                       | GitHub API                            |
| Build System       | Maven (`mvn clean verify`)                                                                       | gson README.md                        |
| JDK for building   | 17+ (21 recommended)                                                                             | gson README.md                        |
| Latest Release     | Gson 2.13.2 (September 10, 2025)                                                                 | GitHub Releases API                   |
| Module Structure   | gson (core), extras, metrics, proto, test-jpms, test-graal-native-image, test-shrinker           | GitHub API tree listing               |
| Maintenance Status | Maintenance mode: "existing bugs will be fixed, but large new features will likely not be added" | gson README.md                        |

#### Test Suite Reliability

**Rating: Adequate**

Gson uses Maven Surefire for unit tests (`*Test.java` convention) and Maven Failsafe for integration tests (`*IT.java` convention). Tests are organized across seven Maven modules: `gson/` (core), `extras/`, `metrics/`, `proto/`, `test-jpms`, `test-graal-native-image`, and `test-shrinker` (GitHub API tree listing). The CI build workflow (`build.yml`) runs on GitHub Actions and is listed as active (GitHub Actions API). No publicly documented flaky test issues were found in GitHub Issues.

The small codebase (~261 source files per Multi-SWE-bench Table 1) keeps the test surface manageable. However, no live test execution was performed -- this assessment relies on CI status and issue tracker evidence. The absence of reported flaky tests is a positive signal but not a guarantee of full determinism.

#### CI Reproducibility

**Rating: Strong**

GitHub Actions CI (`build.yml`) runs on push and PR events (GitHub Actions API). The Maven build command (`mvn clean verify`) is standard and well-documented (gson README.md). JDK 17+ is the minimum, with JDK 21 recommended -- both are mainstream and widely available in CI environments. Additional CI checks include Android compatibility, API compatibility, CIFuzz (fuzz testing), CodeQL (security analysis), and Scorecard (supply-chain security) (GitHub Actions API). Maven is natively supported by the devcontainer Java feature (`installMaven: true`). No exotic build dependencies or custom toolchain requirements are documented.

_Potential weakness_: The multi-workflow CI setup is more complex to reproduce locally than a single-workflow project, though each workflow is individually straightforward.

#### Issue History Depth

**Rating: Adequate**

The repository has 336 open issues (GitHub API, 2026-03-28) and has been active since 2015. Maintenance mode means the new issue creation rate is declining, but the existing corpus is substantial for historical task mining. SWE-bench datasets have already successfully mined gson issues: 5 Multi-SWE-bench instances, 9 SWE-bench Multilingual tasks, and 9 SWE-bench-java-verified instances. Last push was 2026-03-19, indicating ongoing (if infrequent) activity.

_Potential weakness_: Declining issue creation limits future task expansion. The existing corpus is adequate for current benchmarking but unlikely to grow significantly.

#### Validated Task Count

**Rating: Weak**

| Dataset                 | Instance Count | Source                                     |
| ----------------------- | -------------- | ------------------------------------------ |
| Multi-SWE-bench         | 5              | arXiv:2504.02605v1, Table 1                |
| SWE-bench Multilingual  | 9              | swebench.com/multilingual.html             |
| SWE-bench-java-verified | 9              | arXiv:2408.14354                           |
| **Total (upper bound)** | **~23**        | Union across datasets; some overlap likely |

Gson's resolution rate on SWE-bench Multilingual is 66.7% (6 resolved, 3 unresolved) -- the highest among Java repos in that dataset (swebench.com/multilingual.html). However, with at most ~23 unique validated tasks, gson has a limited task pool for sustained benchmarking.

_Mitigating factor_: The high resolution rate suggests gson tasks are well-suited for agent evaluation. The small codebase makes tasks more tractable, which partially offsets the low count. Per-repo difficulty distribution is not published; the Java aggregate across all repos is 27 easy / 65 medium / 36 hard out of 128 total instances (Multi-SWE-bench Table 2, arXiv:2504.02605v1).

#### Codebase Complexity

**Rating: Strong**

Gson has approximately 261 source files (Multi-SWE-bench Table 1). The module count is small (7 directories), with `gson/` as the core module and a clear JPMS module boundary (`com.google.gson`). This is well within agent tool budget constraints and comparable to or smaller than Arena's existing benchmarks (e.g., fastapi). Agents can realistically navigate and modify the entire codebase within token limits.

_Potential weakness_: The small codebase may limit task diversity. Complex multi-module refactoring tasks are unlikely in a project of this size.

#### Community Health

**Rating: Adequate**

Gson has 24,351 stars and 156 contributors (GitHub API). The project is explicitly in maintenance mode -- not abandoned, but not actively growing. Three releases shipped in 2025 (2.13.0 through 2.13.2), with no 2026 releases as of March 2026. Google's organizational backing provides institutional stability even in maintenance mode.

_Potential weakness_: Release cadence may slow further. No new features means no new SWE-bench-suitable issues for future task mining.

_Mitigating factor_: For benchmarking, stability is a positive. Pinned commits remain valid longer when the codebase is not undergoing rapid change.

#### Overall Rating

Gson is a **compact, stable, highly reproducible** benchmark candidate hampered by a **low validated task count**. Its small codebase and standard Maven build make it the easiest candidate to onboard, but ~23 tasks may be insufficient for sustained competition rounds. Best suited as a secondary benchmark or for initial Java toolchain validation.

---

### mockito/mockito

#### Profile

| Metric          | Value                                                                                         | Source                                |
| --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| Stars           | 15,434                                                                                        | GitHub API, 2026-03-28                |
| Forks           | 2,654                                                                                         | GitHub API, 2026-03-28                |
| Open Issues     | 481                                                                                           | GitHub API, 2026-03-28 (includes PRs) |
| Contributors    | 305                                                                                           | GitHub API, 2026-03-28                |
| Language        | Java (98.8%)                                                                                  | GitHub API                            |
| License         | MIT                                                                                           | GitHub API                            |
| Build System    | Gradle (wrapper: `./gradlew build`)                                                           | mockito GitHub page                   |
| JDK Requirement | 11+ (Mockito 5)                                                                               | mockito documentation                 |
| Latest Release  | v5.23.0 (March 11, 2026)                                                                      | GitHub Releases API                   |
| Recent Releases | v5.22.0 (Feb 27, 2026), v5.21.0 (Dec 9, 2025), v5.20.0 (Sep 20, 2025), v5.19.0 (Aug 15, 2025) | GitHub Releases API                   |

#### Test Suite Reliability

**Rating: Strong**

Mockito is itself a testing framework; its test suite is extensive and battle-tested by the nature of the project. It uses Gradle test tasks for execution and publishes automated snapshots to Sonatype on every commit (GitHub project documentation). The monthly release cadence (5 releases from August 2025 to March 2026) implies CI is reliably green -- releases would not ship at this rate with persistent test failures (GitHub Releases API). No publicly documented persistent flaky test issues were found. JDK 11+ is stable and well-tested across CI environments.

_Potential weakness_: Mockito 5 requires running as a Java agent due to Java 22+ dynamic attachment restrictions. This introduces a non-trivial test configuration requirement that could surface unexpected failures in novel environments.

#### CI Reproducibility

**Rating: Adequate**

A single CI workflow (`ci.yml`) runs on GitHub Actions (GitHub Actions API). The Gradle wrapper (`./gradlew`) ensures consistent build tool versions across environments. JDK 11 minimum is universally available. The devcontainer Java feature supports both JDK installation and Gradle (`installGradle: true`).

_Potential weakness_: Mockito's Java agent requirement (needed for Mockito 5 under Java 22+ security restrictions) adds a configuration step that is absent from simpler library builds. This could complicate devcontainer reproducibility compared to gson's straightforward `mvn clean verify`.

_Mitigating factor_: The Gradle wrapper abstracts most build complexity. The agent configuration is well-documented in Mockito's own documentation.

#### Issue History Depth

**Rating: Strong**

The repository has 481 open issues (GitHub API, 2026-03-28) spanning mocking behavior bugs, Java version compatibility, Kotlin interoperability, and API design. With 305 contributors, issue reporters are diverse and problem types are varied -- well-suited for code-fix benchmarking. The project remains active with continuous issue creation and resolution.

_Potential weakness_: If the maintainer transition leads to project slowdown, the rate of new issue creation could decline.

#### Validated Task Count

**Rating: Weak**

| Dataset                   | Instance Count   | Source                         |
| ------------------------- | ---------------- | ------------------------------ |
| Multi-SWE-bench           | 6                | arXiv:2504.02605v1, Table 1    |
| SWE-bench Multilingual    | 0 (not included) | swebench.com/multilingual.html |
| SWE-bench-java-verified   | 0 (not included) | arXiv:2408.14354               |
| **Total validated tasks** | **6**            | Single dataset only            |

Mockito has the lowest validated task count among the three primary candidates. It is absent from both SWE-bench Multilingual and SWE-bench-java-verified. The Multi-SWE-RL community dataset (4,723 instances across 76 repos) may contain additional mockito instances, but the HuggingFace dataset viewer was non-functional at time of research due to a parquet schema validation error -- this is documented as a data gap.

_Mitigating factor_: Mockito's active issue corpus (481 open issues) provides raw material for future task curation. The issue types (mocking behavior bugs, compatibility) are well-suited for SWE-bench-style task generation. Per-repo difficulty distribution is not published.

#### Codebase Complexity

**Rating: Adequate**

Mockito has 986 source files and 84.0K lines of code (Multi-SWE-bench Table 1, arXiv:2504.02605v1). This is a medium-sized codebase -- larger than gson but much smaller than lucene. The Gradle wrapper ensures reproducible builds. The codebase is within agent tool budget constraints for Arena competition rounds.

_Potential weakness_: As a test framework that tests itself, Mockito has significant internal test infrastructure complexity. Agents modifying Mockito's internals must understand the recursive nature of a mocking framework's self-tests.

#### Community Health

**Rating: Adequate**

Mockito has 15,434 stars, 305 contributors, and an MIT license (GitHub API). The release cadence is strong: monthly releases continue through March 2026.

**Maintainer transition risk**: Tim van der Lippe announced stepping down after 10 years as maintainer (Issue #3777, opened December 28, 2025, OPEN as of March 2026). Stated reasons include energy drain from Mockito 5's agent architecture changes, Kotlin complexity concerns, and a shift to Servo/Rust projects (Hacker News discussion, news.ycombinator.com/item?id=46414078). The issue has **0 comments** as of March 2026 (GitHub API), which is concerning -- no public discussion of successors.

_Optimistic trajectory_: The mockito GitHub organization (not a single-person project) with 305 contributors provides bus factor resilience. Releases continue post-announcement (v5.22.0, v5.23.0 shipped in February-March 2026). A new maintainer could emerge from the existing contributor base and bring renewed energy.

_Pessimistic trajectory_: Zero comments on the transition issue suggests limited community engagement on succession. If no successor steps up by mid-2026, the project could drift into de facto maintenance mode, reducing its value as an active benchmark target.

#### Overall Rating

Mockito is a **well-tested, actively maintained** candidate with **strong issue depth** but **critically low validated task count** (only 6 instances) and **uncertain maintainer continuity**. The maintainer transition is an active risk that should be monitored. With only 6 validated tasks across a single dataset, mockito requires significant future task curation before it can support sustained benchmarking.

---

### apache/lucene

#### Profile

| Metric                                    | Value                                               | Source                                                 |
| ----------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Stars                                     | 3,391                                               | GitHub API, 2026-03-28                                 |
| Forks                                     | 1,322                                               | GitHub API, 2026-03-28                                 |
| Open Issues                               | 2,554                                               | GitHub API, 2026-03-28 (includes PRs)                  |
| Open PRs                                  | ~304                                                | GitHub API, 2026-03-28                                 |
| Contributors                              | 320                                                 | GitHub API, 2026-03-28                                 |
| Language                                  | Java (97.5%)                                        | GitHub API                                             |
| License                                   | Apache-2.0                                          | GitHub API                                             |
| Build System                              | Gradle (wrapper with Develocity: `./gradlew check`) | lucene project documentation                           |
| JDK: Lucene 10.x (current stable)         | 21                                                  | github.com/apache/lucene/issues/14229                  |
| JDK: Lucene 9.x                           | 11+                                                 | lucene.apache.org/core/9_12_0/SYSTEM_REQUIREMENTS.html |
| JDK: Lucene 11.x (unreleased main branch) | 25                                                  | github.com/apache/lucene/issues/14229                  |
| Latest Release (10.x)                     | 10.4.0 (February 25, 2026)                          | GitHub Releases API                                    |
| Total Commits                             | 73,926                                              | openhub.net/p/lucene                                   |
| Codebase Size                             | 933,720 LoC (98% Java)                              | openhub.net/p/lucene                                   |

#### Test Suite Reliability

**Rating: Adequate**

Lucene has an extensive test suite using `./gradlew check` across all modules. However, there are **known flaky tests**:

- `TestTaxonomyFacetAssociations.testFloatSumAssociation`: Floating-point precision issue (expects `1832078.0`, gets `1832078.25`). Tracked as github.com/apache/lucene/issues/13720.
- `TestIndexWriterOnVMError.testUnknownError`: Timeout/deadlock with tragic exceptions, requiring manual kill. Tracked as github.com/apache/lucene/issues/12654.

The large test suite (proportional to 933K LoC) makes some intermittent failures expected. Flaky tests are documented and tracked, which is a positive signal for project quality discipline.

_Potential weakness_: Flaky tests could cause false negatives in SWE-bench task evaluation. Agents may produce correct fixes that fail CI due to unrelated flaky tests.

_Mitigating factor_: Pinning to specific commits where CI is green and excluding known-flaky test modules from evaluation can neutralize this risk.

#### CI Reproducibility

**Rating: Adequate**

Lucene has 20+ GitHub Actions workflows covering module-specific checks, nightly smoke tests, formatting, backports, CodeQL, and more (GitHub Actions API). This is the most comprehensive CI setup among the three candidates. The Gradle wrapper with Develocity integration ensures consistent builds. Apache infrastructure supplements GitHub Actions for official release verification. JDK 21 (for Lucene 10.x) is well-supported in all CI environments.

_Potential weakness_: The sheer number of modules and test configurations adds reproduction overhead. Running the full test suite takes significant compute and time compared to gson or mockito.

_Mitigating factor_: SWE-bench tasks target specific subsystems. Agents and evaluators can scope test execution to relevant modules rather than running the entire suite.

#### Issue History Depth

**Rating: Strong**

Lucene has 2,554 open issues (GitHub API, 2026-03-28) -- by far the deepest issue corpus among the three candidates. With 73,926 total commits over 24+ years, ~304 open PRs, and 134 unique contributors in 2025 alone (openhub.net/p/lucene), the development activity is substantial. Issues span search indexing, query parsing, faceted search, text analysis, spatial search, and more -- providing diverse problem domains for benchmark tasks. Apache's Jira tracker adds additional historical depth beyond GitHub Issues.

_Potential weakness_: The sheer volume may make task curation more labor-intensive than for smaller repositories.

#### Validated Task Count

**Rating: Weak**

| Dataset                   | Instance Count   | Source                         |
| ------------------------- | ---------------- | ------------------------------ |
| Multi-SWE-bench           | 0 (not included) | arXiv:2504.02605v1, Table 1    |
| SWE-bench Multilingual    | 9                | swebench.com/multilingual.html |
| SWE-bench-java-verified   | 0 (not included) | arXiv:2408.14354               |
| **Total validated tasks** | **9**            | Single dataset only            |

Lucene has only 9 validated tasks, all from SWE-bench Multilingual. It is absent from both Multi-SWE-bench and SWE-bench-java-verified. The resolution rate on SWE-bench Multilingual is 33.3% (3 resolved, 6 unresolved) -- the lowest among Java repos in that dataset (swebench.com/multilingual.html), suggesting Lucene tasks are particularly challenging.

_Mitigating factor_: Lucene's enormous issue history (2,554 open issues, 73K+ commits) provides abundant raw material for future SWE-bench task curation. The low resolution rate indicates tasks that meaningfully differentiate agent capability rather than trivial fixes.

#### Codebase Complexity

**Rating: Weak**

Lucene has 933,720 lines of code across multiple complex modules: core search, analysis, facets, spatial, codecs, sandbox, and more (openhub.net/p/lucene). This is approximately 45% larger than the 644K LoC estimate in planning documents (~1.45x). At this scale, Lucene significantly exceeds Arena's current largest benchmark. Agent tool budgets may be insufficient for meaningful navigation and modification. Context window limitations could prevent agents from understanding cross-module dependencies.

_Mitigating factor_: SWE-bench Multilingual tasks target specific subsystems (core indexing, geometry, query parsing, facet search), not the entire codebase (HuggingFace dataset viewer). Agents only need to navigate relevant modules for each task, substantially reducing the effective working set.

_Potential risk_: Even with scoped tasks, the build time for the full project and the complexity of understanding module boundaries adds overhead compared to gson or mockito.

#### Community Health

**Rating: Strong**

Apache Software Foundation governance ensures institutional continuity regardless of individual contributors. Lucene has 320 contributors with 134 unique contributors in 2025 alone (openhub.net/p/lucene). Development activity is high: 1,756 commits in 2025, 80 commits in the last 30 days, and 5 new contributors in that period (openhub.net/p/lucene). The release cadence is steady: 4 releases on the 10.x branch from September 2025 to February 2026, plus maintenance releases on 9.x (GitHub Releases API). The 3,391 star count is lower than gson or mockito, but reflects that search infrastructure libraries have different adoption patterns than utility libraries.

_Potential weakness_: None material. Apache governance, active development, and distributed maintainership make this the strongest community health profile among the three candidates.

#### Overall Rating

Lucene is the **most actively developed and institutionally stable** candidate with the **deepest issue history**, but it is **too large** for straightforward agent benchmarking (933K LoC) and has **few validated tasks** (9 instances). Its strength lies in future potential: the deep issue corpus could yield many new SWE-bench tasks, and scoped subsystem tasks can mitigate codebase size. Best suited as a stretch target after establishing Java benchmarking with a smaller repository.

---

> **Data freshness notice:** GitHub metrics and community health data retrieved 2026-03-28. Verify current status before making onboarding decisions.

## Summary Comparison Table

| Criterion              | google/gson | mockito/mockito | apache/lucene |
| ---------------------- | ----------- | --------------- | ------------- |
| Test Suite Reliability | Adequate    | **Strong**      | Adequate      |
| CI Reproducibility     | **Strong**  | Adequate        | Adequate      |
| Issue History Depth    | Adequate    | **Strong**      | **Strong**    |
| Validated Task Count   | Weak        | Weak            | Weak          |
| Codebase Complexity    | **Strong**  | Adequate        | Weak          |
| Community Health       | Adequate    | Adequate        | **Strong**    |
| **Strong ratings**     | **2**       | **2**           | **2**         |
| **Weak ratings**       | **1**       | **1**           | **2**         |

All three candidates share a critical weakness: **low validated task counts** (5-9 instances per repo in their best dataset). This is the dominant finding of this evaluation and applies to all primary candidates equally.

The differentiator is the balance of remaining criteria. Gson and mockito each have 2 Strong and 1 Weak rating; lucene has 2 Strong and 2 Weak ratings (codebase complexity is an additional Weak).

---

## Ranked Recommendation

### 1st Choice: google/gson

**Rationale**: Gson is recommended as the first Java onboarding target based on practical considerations:

- **Lowest onboarding friction**: Small codebase (261 files), standard Maven build, JDK 21 compatibility. An engineer can clone, build, and run tests in minutes. This makes it ideal for validating the Java devcontainer toolchain before tackling more complex repositories.
- **Highest task tractability**: The 66.7% SWE-bench Multilingual resolution rate (highest among Java repos) indicates agents can realistically solve gson tasks. This produces meaningful benchmark signal from day one.
- **Broadest SWE-bench coverage**: Gson is the only primary candidate present in all three SWE-bench datasets (5 Multi-SWE-bench + 9 Multilingual + 9 java-verified = ~23 tasks upper bound). While the absolute count is low, it exceeds mockito (6 total) and lucene (9 total).
- **Stability advantage**: Maintenance mode is a feature, not a bug, for benchmarking. Pinned commits stay valid. The codebase does not shift under active development.

**Tiebreaker rationale** (gson vs. mockito, both at 2 Strong / 1 Weak): Gson wins on (a) codebase complexity (Strong vs. Adequate -- smaller is better for first onboarding), (b) validated task count (23 vs. 6 -- nearly 4x more tasks), and (c) SWE-bench dataset breadth (3 datasets vs. 1). Mockito's stronger test suite and issue history do not overcome these practical advantages for an initial onboarding decision.

**Why gson over jackson-databind for first onboarding**: jackson-databind has a substantially larger validated task pool (~91 tasks vs. ~23 for gson), which makes it the stronger long-term benchmark candidate. However, gson's codebase is roughly one-third the size (~80K LoC estimated vs. 217.5K LoC for jackson-databind, with 261 files vs. 1,230 files), making it far more tractable for initial toolchain validation and agent feasibility testing. Both use Maven with straightforward build commands, so build complexity is comparable. Gson is preferred for first onboarding because it minimizes the variables when standing up Arena's Java pipeline for the first time; jackson-databind is the recommended first fallback once gson's task pool is exhausted (see [Alternative Candidates](#alternative-candidates)).

### 2nd Choice: mockito/mockito

**Rationale**: Mockito is the second choice for Java benchmarking:

- **Strong test suite and issue depth** make it a compelling long-term benchmark candidate.
- **Active development** with monthly releases demonstrates the project is alive and generating new issues.
- **Medium codebase** (986 files, 84K LoC) is manageable for agents.

**Blockers for first choice**: Only 6 validated tasks (in a single dataset) is critically low. The maintainer transition (Issue #3777) introduces uncertainty. Mockito should be onboarded after (a) the maintainer transition resolves, and (b) additional SWE-bench tasks are curated from its 481 open issues.

### 3rd Choice: apache/lucene

**Rationale**: Lucene is deferred as a Java benchmark target, not rejected:

- **Strongest community health and issue depth** of any candidate -- the raw material for benchmark tasks is abundant.
- **933K LoC is a material risk** for agent feasibility. Arena's current benchmarks are substantially smaller. Scoped subsystem tasks can mitigate this, but the overhead of building and testing within a 933K LoC project remains.
- **Only 9 validated tasks** with a 33.3% resolution rate -- the hardest tasks among the three candidates.
- **JDK 21 is sufficient** for Lucene 10.x (the JDK 25 concern from planning documents was incorrect; see [DevContainer Toolchain Requirements](#devcontainer-toolchain-requirements)).

Lucene should be evaluated for onboarding after gson and mockito are established, when Arena has more experience with Java benchmarks and can assess whether agents can handle the codebase scale.

### What If We Are Wrong

- **If gson's ~23 tasks are exhausted quickly**: Pivot to jackson-databind (~91 validated tasks). Jackson-databind was not a primary candidate in this evaluation's scope but has substantially better task coverage. See [Alternative Candidates](#alternative-candidates).
- **If gson's maintenance mode leads to stale benchmarks**: Mockito (with ongoing development) or lucene (with Apache governance) provide repositories with active issue streams.
- **If mockito's maintainer transition fails**: Defer mockito indefinitely. The combination of gson + jackson-databind covers the Java benchmark need without mockito.
- **If lucene's codebase size is manageable in practice**: Promote lucene to second choice. Its issue depth and community health are the strongest among all candidates.

---

## DevContainer Toolchain Requirements

Java is the only Arena benchmark language where the devcontainer toolchain is absent. Rust and Go are already installed. The following specification is written as an actionable infrastructure requirement -- an engineer can implement it without further research.

### Required Feature Configuration

Add to `devcontainer.json` features:

```json
"ghcr.io/devcontainers/features/java:1": {
  "version": "21",
  "installMaven": true,
  "installGradle": true
}
```

**Feature ID**: `ghcr.io/devcontainers/features/java:1`
**Source**: github.com/devcontainers/features/tree/main/src/java

This feature uses SDKMAN as its backend for JDK version management. Both Maven and Gradle are enabled because the candidate repositories use different build systems.

### JDK Version Matrix

| Candidate          | Required JDK         | Build Command      | Notes                                                     |
| ------------------ | -------------------- | ------------------ | --------------------------------------------------------- |
| google/gson        | 17+ (21 recommended) | `mvn clean verify` | Maven; JDK 21 satisfies the 17+ requirement               |
| mockito/mockito    | 11+                  | `./gradlew build`  | Gradle wrapper; JDK 21 exceeds the 11+ minimum            |
| apache/lucene 10.x | 21 (exact)           | `./gradlew check`  | Gradle wrapper with Develocity; JDK 21 is the exact match |
| apache/lucene 9.x  | 11+                  | `./gradlew check`  | Fallback for SWE-bench tasks targeting older versions     |
| apache/lucene 11.x | 25                   | N/A                | Unreleased main branch; NOT recommended for benchmarking  |

**Unified configuration**: JDK 21 satisfies all three primary candidates. A single devcontainer feature entry with `"version": "21"` covers gson (17+ compatible), mockito (11+ compatible), and Lucene 10.x (21 required).

### Lucene JDK 25 Go/No-Go

**Verdict: Lucene IS viable without JDK 25.**

Lucene 10.x (current stable, most recently released as 10.4.0 on February 25, 2026) requires JDK 21, not JDK 25. The JDK 25 requirement applies only to the unreleased Lucene 11.0.0 main branch. Issue #14229 ("Bump Lucene 11.0.0 minimum required Java version to 25") explicitly states: "Since Lucene 10 has already shipped artifacts compiled with class file version 65.0 (Java 21), then there is no suggestion to change this in any of the 10.x releases" (github.com/apache/lucene/issues/14229).

Even if JDK 25 were needed: JDK 25 reached GA on September 16, 2025 (oracle.com/news/announcement/oracle-releases-java-25-2025-09-16/) and is available through SDKMAN from multiple vendors including Amazon Corretto 25.0.2 and Eclipse Temurin (sdkman.io/jdks/).

Existing SWE-bench Multilingual lucene tasks target Lucene 9.x era versions (issue numbers lucene-11760 through lucene-13301), which require JDK 11+ -- further eliminating any JDK 25 concern for current benchmarking (HuggingFace SWE-bench Multilingual dataset).

### Alternative Configuration for Maximum Compatibility

If SWE-bench tasks targeting Lucene 9.x require exact JDK 11 version matching:

```json
"ghcr.io/devcontainers/features/java:1": {
  "version": "21",
  "additionalVersions": "11",
  "installMaven": true,
  "installGradle": true
}
```

### Build Tool Summary

| Candidate       | Build Tool       | System Install Needed            | Notes                                                       |
| --------------- | ---------------- | -------------------------------- | ----------------------------------------------------------- |
| google/gson     | Maven            | Yes (`installMaven: true`)       | Standard Maven lifecycle                                    |
| mockito/mockito | Gradle (wrapper) | Optional (`installGradle: true`) | Wrapper provides its own Gradle; system install is fallback |
| apache/lucene   | Gradle (wrapper) | Optional (`installGradle: true`) | Wrapper with Develocity integration                         |

Both `installMaven: true` and `installGradle: true` are specified in the recommended configuration. Gradle wrappers in mockito and lucene technically do not require a system Gradle installation, but having it available provides fallback and tooling support.

---

## SWE-bench Cross-Reference

| Dataset                                    | google/gson | mockito/mockito  | apache/lucene    | Source                                   |
| ------------------------------------------ | ----------- | ---------------- | ---------------- | ---------------------------------------- |
| Multi-SWE-bench (arXiv:2504.02605v1)       | 5           | 6                | 0 (not included) | Table 1, Instances column                |
| SWE-bench Multilingual                     | 9           | 0 (not included) | 9                | swebench.com/multilingual.html           |
| SWE-bench-java-verified (arXiv:2408.14354) | 9           | 0 (not included) | 0 (not included) | Per-repo table                           |
| **Total (upper bound)**                    | **~23**     | **6**            | **9**            | Union; overlap possible between datasets |

### Context: Java in Multi-SWE-bench

Multi-SWE-bench contains 128 total Java instances across all Java repositories (arXiv:2504.02605v1, Table 2). The Java difficulty distribution across all repos is: 27 easy, 65 medium, 36 hard. Per-repo difficulty breakdowns are not published.

The three primary candidates collectively account for only 11 of the 128 Java instances (8.6%). The remainder is distributed across repositories including jackson-databind (42), logstash (38), jackson-core (18), and others. See [Alternative Candidates](#alternative-candidates) for details.

### Context: SWE-bench-java-verified

SWE-bench-java-verified contains 91 verified instances across 6 Java repositories (arXiv:2408.14354). Gson accounts for 9 of those 91 instances (9.9%). Neither mockito nor lucene is included in this dataset. The largest contributor is jackson-databind with 49 instances (53.8% of the dataset), followed by jackson-core, jackson-dataformat-xml, jib, and dubbo (arXiv:2408.14354, Table 1).

---

## Alternative Candidates

The following repositories were not selected as primary candidates for this evaluation but have notable SWE-bench presence. They are documented here to enable future evaluation if primary candidates prove insufficient.

### FasterXML/jackson-databind

| Metric                            | Value                                          | Source                                                                          |
| --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Stars                             | 3,695                                          | GitHub API, 2026-03-28                                                          |
| Forks                             | 1,473                                          | GitHub API, 2026-03-28                                                          |
| Open Issues                       | 166                                            | GitHub API, 2026-03-28                                                          |
| License                           | Apache-2.0                                     | GitHub API                                                                      |
| Build System                      | Maven                                          | GitHub README                                                                   |
| JDK Requirement                   | Java 8+ (Jackson 2.13+); JDK 17+ (Jackson 3.0) | Web search                                                                      |
| Multi-SWE-bench Instances         | 42                                             | arXiv:2504.02605v1, Table 1                                                     |
| SWE-bench-java-verified Instances | 49                                             | arXiv:2408.14354, Table 1 (49 of 91 verified instances)                         |
| SWE-bench Multilingual Instances  | 0 (not included)                               | swebench.com/multilingual.html                                                  |
| **Total validated tasks**         | **~91**                                        | Union across datasets; overlap likely between Multi-SWE-bench and java-verified |
| Codebase Size                     | 1,230 files, 217.5K LoC                        | Multi-SWE-bench Table 1, arXiv:2504.02605v1                                     |

**Why not selected as primary**: jackson-databind was not in the original evaluation scope (the epic specified gson, mockito, and lucene as primary candidates). However, jackson-databind has the **strongest validated task count of any Java repository**: 42 Multi-SWE-bench + 49 SWE-bench-java-verified = ~91 tasks (with overlap). Its 49 SWE-bench-java-verified instances represent 53.8% of that dataset's 91 verified instances (arXiv:2408.14354, Table 1). The moderate codebase (217.5K LoC), mainstream build (Maven), and standard JDK requirements make it a strong candidate.

**Data correction**: An earlier version of this document cited 105 SWE-bench-java-verified instances for jackson-databind. The 105 figure was misread from the "Gold Patch #Files" column (average files modified per patch) in arXiv:2408.14354, Table 1. The correct instance count is 49.

**Recommendation**: jackson-databind should be the **first fallback** if gson's ~23 tasks prove insufficient. It arguably has better benchmark suitability than any of the three primary candidates on the Validated Task Count criterion alone.

### apache/dubbo

| Metric                            | Value                                             | Source                                      |
| --------------------------------- | ------------------------------------------------- | ------------------------------------------- |
| Stars                             | 41,711                                            | GitHub API, 2026-03-28                      |
| Forks                             | 26,526                                            | GitHub API, 2026-03-28                      |
| Open Issues                       | 948                                               | GitHub API, 2026-03-28                      |
| License                           | Apache-2.0                                        | GitHub API                                  |
| Build System                      | Maven                                             | Web search                                  |
| JDK Requirement                   | Java 8+ (Dubbo 3.x); JDK 17+ (with Spring Boot 3) | Web search                                  |
| Multi-SWE-bench Instances         | 3                                                 | arXiv:2504.02605v1, Table 1                 |
| SWE-bench-java-verified Instances | 4                                                 | HuggingFace Daoguang/Multi-SWE-bench swe-bench-java-verified.json |
| SWE-bench Multilingual Instances  | 0 (not included)                                  | swebench.com/multilingual.html              |
| **Total validated tasks**         | **~7**                                            | Union across datasets                       |
| Codebase Size                     | 3,939 files, 402.1K LoC                           | Multi-SWE-bench Table 1, arXiv:2504.02605v1 |

**Why not selected as primary**: Despite being the highest-starred Java repo in this analysis (41.7K stars), dubbo has only ~7 validated tasks. The planning document incorrectly cited "3,939 instances" -- this was the file count, not the instance count (actual: 3 Multi-SWE-bench instances). The large codebase (402K LoC) and complex RPC/microservice deployment requirements make it less suitable for isolated benchmark tasks than simpler library repos.

**Assessment**: Not recommended. Low task count despite high stars, complex deployment model, and large codebase.

### Other Notable Repositories

| Repository                       | Multi-SWE-bench | SWE-bench-java-verified | Total | Codebase              | Build              | Notes                                       |
| -------------------------------- | --------------- | ----------------------- | ----- | --------------------- | ------------------ | ------------------------------------------- |
| FasterXML/jackson-core           | 18              | 23                      | ~41   | 366 files, 105.7K LoC | Maven              | Jackson core module; strong task count      |
| elastic/logstash                 | 38              | 0                       | 38    | 562 files, 59.9K LoC  | Mixed (JRuby/Java) | Complex polyglot deployment                 |
| FasterXML/jackson-dataformat-xml | 5               | 5                       | ~10   | 206 files             | Maven              | Jackson XML format module                   |
| GoogleContainerTools/jib         | 5               | 5                       | ~10   | 604 files             | Gradle             | Container image builder                     |
| alibaba/fastjson2                | 6               | 0                       | 6     | 424 files, 443.8K LoC | Maven              | JSON library; large codebase for task count |

Sources: arXiv:2504.02605v1 Table 1 (Multi-SWE-bench); HuggingFace Daoguang/Multi-SWE-bench swe-bench-java-verified.json (SWE-bench-java-verified per-repo counts).

**Data correction**: Earlier SWE-bench-java-verified per-repo counts (jackson-core 58, jackson-dataformat-xml 16, jib 13, dubbo 12) were misread from the "Gold Patch #Files" column of arXiv:2408.14354 Table 1. Corrected counts above are from the authoritative dataset file (91 instances total: jackson-databind 49, jackson-core 23, jackson-dataformat-xml 5, gson 5, jib 5, dubbo 4).

**Key observation**: The Jackson ecosystem (jackson-databind + jackson-core + jackson-dataformat-xml) collectively has approximately 65 Multi-SWE-bench instances and 77 SWE-bench-java-verified instances -- substantially more than any individual primary candidate. If Arena's priority is maximizing validated task coverage, the Jackson family of repositories is the strongest choice in the Java ecosystem.

---

## Appendix: Raw Data References

### Primary Data Sources

| Source                        | Identifier                                                       | Access Method               | Retrieved  |
| ----------------------------- | ---------------------------------------------------------------- | --------------------------- | ---------- |
| Multi-SWE-bench paper         | arXiv:2504.02605v1                                               | arxiv.org/html/2504.02605v1 | 2026-03-28 |
| SWE-bench Multilingual        | swebench.com/multilingual.html                                   | Web                         | 2026-03-28 |
| SWE-bench-java-verified       | arXiv:2408.14354                                                 | arxiv.org/html/2408.14354   | 2026-03-28 |
| HuggingFace Multi-SWE-bench   | huggingface.co/datasets/ByteDance-Seed/Multi-SWE-bench           | Web                         | 2026-03-28 |
| HuggingFace Multi-SWE-RL      | huggingface.co/datasets/ByteDance-Seed/Multi-SWE-RL              | Web (dataset viewer broken) | 2026-03-28 |
| GitHub API                    | api.github.com                                                   | gh CLI                      | 2026-03-28 |
| DevContainer Java feature     | github.com/devcontainers/features/tree/main/src/java             | Web                         | 2026-03-28 |
| SDKMAN JDK distributions      | sdkman.io/jdks/                                                  | Web                         | 2026-03-28 |
| JDK 25 GA announcement        | oracle.com/news/announcement/oracle-releases-java-25-2025-09-16/ | Web                         | 2026-03-28 |
| Lucene JDK 25 issue           | github.com/apache/lucene/issues/14229                            | GitHub                      | 2026-03-28 |
| OpenHub Lucene                | openhub.net/p/lucene                                             | Web                         | 2026-03-28 |
| Mockito maintainer transition | github.com/mockito/mockito/issues/3777                           | GitHub                      | 2026-03-28 |
| Mockito HN discussion         | news.ycombinator.com/item?id=46414078                            | Web                         | 2026-03-28 |

### Multi-SWE-bench Table 1 (Java Repos, Selected Rows)

Reproduced from arXiv:2504.02605v1, Table 1 for reference:

| Repository                 | Files | LoC    | Instances | Avg Issue Tokens | Avg Patch Lines |
| -------------------------- | ----- | ------ | --------- | ---------------- | --------------- |
| google/gson                | 261   | --     | 5         | --               | --              |
| mockito/mockito            | 986   | 84.0K  | 6         | --               | --              |
| FasterXML/jackson-databind | 1,230 | 217.5K | 42        | --               | --              |
| FasterXML/jackson-core     | 366   | 105.7K | 18        | --               | --              |
| elastic/logstash           | 562   | 59.9K  | 38        | --               | --              |
| apache/dubbo               | 3,939 | 402.1K | 3         | --               | --              |

Note: Cells marked "--" indicate values not transcribed for this reference table. Full data is available in the original paper. Apache/lucene is **not included** in Multi-SWE-bench Table 1.

### Java Aggregate Difficulty Distribution (Multi-SWE-bench Table 2)

| Difficulty | Count   | Percentage |
| ---------- | ------- | ---------- |
| Easy       | 27      | 21.1%      |
| Medium     | 65      | 50.8%      |
| Hard       | 36      | 28.1%      |
| **Total**  | **128** | 100%       |

Source: arXiv:2504.02605v1, Table 2. Per-repo difficulty breakdowns are not published.

### Phase 1 Research Notes

Full research data: `/workspace/_SPECS/arena/tickets/ARENA-51_java-repo-evaluation/deliverables/java-repo-research-notes.md` (ARENA-51.1001 deliverable, 2026-03-28).
