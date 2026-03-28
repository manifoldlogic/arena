# Go Benchmark Repository Evaluation

## Methodology

### Data Sources

- **Multi-SWE-bench** (arXiv 2504.02605v1): "Multi-SWE-bench: A Multilingual Benchmark for Issue Resolving" (ByteDance Seed, NeurIPS 2025). Table 1 provides validated task instance counts, file counts, lines of code, and patch complexity metrics for Go repositories. Accessed 2026-03-28 via https://arxiv.org/html/2504.02605v1
- **SWE-bench Multilingual**: Princeton NLP benchmark. Provides validated task instances for Go repositories not present in Multi-SWE-bench. Accessed 2026-03-28 via https://www.swebench.com/multilingual.html
- **GitHub API**: Repository metadata (stars, issues, contributors, commits, workflows, file trees, community health scores) collected 2026-03-28 for all four candidate repositories.
- **Hugging Face datasets**: ByteDance-Seed/Multi-SWE-bench and ByteDance-Seed/Multi-SWE-RL. Accessed 2026-03-28 to confirm repository inclusion.

### Collection Date

2026-03-28

### Evaluation Criteria

Each repository is assessed on six criteria:

| Criterion | Definition |
|---|---|
| **Test Suite Reliability** | Quality of test isolation, mock infrastructure, test file coverage ratio, and evidence of tests running without external dependencies |
| **CI Reproducibility** | Ability to reproduce the CI test pipeline locally using standard Go tooling without proprietary runners, secrets, or non-standard infrastructure. CI Reproducibility ratings are assessed from CI configuration inspection and published test infrastructure documentation; live `go test ./...` verification is deferred to repository onboarding. |
| **Issue History Depth** | Volume and longevity of closed issues as a proxy for the repository's capacity to generate meaningful benchmark tasks |
| **Validated Task Count** | Number of validated task instances available in SWE-bench datasets (Multi-SWE-bench or SWE-bench Multilingual), representing the pool of tasks usable in Arena competitions |
| **Codebase Complexity** | Repository size, package depth, architectural patterns, and domain specialization — indicating the breadth and difficulty of tasks an agent must handle |
| **Community Health** | Stars, contributors, commit frequency, release cadence, organizational backing, and community governance infrastructure |

### Rating Scale

- **Strong**: The repository clearly excels on this criterion with substantial supporting evidence.
- **Adequate**: The repository meets baseline expectations but has notable limitations or caveats.
- **Weak**: The repository falls below the threshold needed for effective Arena benchmarking on this criterion.

### Validated Task Count Thresholds

| Rating | Threshold |
|---|---|
| Strong | >= 500 validated instances |
| Adequate | 50 -- 499 validated instances |
| Weak | < 50 validated instances |

### Issue History Depth Thresholds

| Rating | Closed Issue Count |
|---|---|
| Strong | 1,000+ closed issues |
| Adequate | 200–999 closed issues |
| Weak | Fewer than 200 closed issues |

### SWE-bench Coverage Gap

Two distinct SWE-bench datasets cover Go repositories, creating a two-tier evaluation:

- **Multi-SWE-bench** (arXiv 2504.02605, ByteDance Seed) includes **cli/cli** (397 validated instances) and **grpc/grpc-go** (16 validated instances), but does **not** include caddyserver/caddy or prometheus/prometheus.
- **SWE-bench Multilingual** (Princeton NLP) includes **caddyserver/caddy** (14 validated instances) and **prometheus/prometheus** (8 validated instances), but does **not** include cli/cli or grpc/grpc-go.

This asymmetry means the four candidates were validated through different pipelines. Repositories in Multi-SWE-bench have undergone a more extensive validation process (the paper reports 428 total Go instances across three repos). Repositories in SWE-bench Multilingual have smaller instance sets that have not been cross-validated against the Multi-SWE-bench methodology. This difference is noted in per-repo assessments but does not change the rating scale.

**Important correction**: The numbers 737 (cli/cli) and 981 (grpc/grpc-go) appearing in some planning documents are **file counts** from the #Files column of Multi-SWE-bench Table 1, not validated instance counts. The actual validated instance counts (#Num column) are 397 and 16, respectively.

This evaluation is considered current for 12 months from collection date (2026-03-28) or until Multi-SWE-bench releases a major Go dataset update, whichever comes first.

### DevContainer Baseline

All four Go candidates share a common baseline: the Go toolchain is pre-installed via `ghcr.io/devcontainers/features/go:1` with `"version": "latest"` in the Arena devcontainer. No candidate requires protoc or other code generators at test time -- all generated files (`.pb.go`, `.y.go`) are committed to their respective repositories. Per-repo DevContainer sections below document only repository-specific requirements beyond this baseline.

---

## Candidate Evaluations

### caddyserver/caddy

**Repository:** https://github.com/caddyserver/caddy
**Stars:** 71,129 (GitHub API, 2026-03-28)
**License:** Apache-2.0
**Architecture:** Fast, extensible multi-platform HTTP/1-2-3 web server with automatic HTTPS. Modular plugin architecture built around an `init()` registration system. 302 Go source files across 59 directories, organized into `modules/` (HTTP, TLS, PKI, logging, metrics, filesystem), `caddyconfig/` (Caddyfile parsing), `caddytest/` (integration testing), `cmd/`, and `internal/`. Single `go.mod` with no sub-modules.

#### Test Suite Reliability: Adequate

- 90 test files across 302 Go source files (29.8% test file ratio) -- lowest among the four candidates (Source: GitHub Trees API, 2026-03-28)
- Dedicated `caddytest/` integration test package provides end-to-end HTTP/TLS testing with pre-generated localhost TLS certificates
- Only 2 mock/stub files in the entire repository (`mockdns_test.go`, `dummyverifier.go`) -- minimal test isolation infrastructure compared to cli/cli's 20+ mock files (Source: GitHub Trees API, 2026-03-28)
- CI test command: `go test -v -coverprofile="cover-profile.out" -short -race ./...`
- Build tags `nobadger,nomysql,nopgx` set via `GOFLAGS` in CI to exclude optional storage backends; without these tags, compilation may fail if C libraries are not present
- `CGO_ENABLED=0` used explicitly for cross-platform builds; not required for core test execution
- Integration tests in `caddytest/` start actual Caddy server instances with TLS on localhost -- heavier than unit tests but self-contained

#### CI Reproducibility: Adequate

- 9 GitHub Actions workflow files including `ci.yml` (primary) and `lint.yml` (Source: GitHub API, 2026-03-28)
- Primary test command uses standard Go toolchain: `go test -v -short -race ./...`
- Build tags `GOFLAGS='-tags=nobadger,nomysql,nopgx'` required to exclude optional storage backend tests -- must be set in the Arena devcontainer environment
- s390x test job requires SSH access to `ci-s390x.caddyserver.com` with secrets -- not reproducible outside Caddy's CI infrastructure
- No protobuf, yacc, or other code generation tools required
- `CGO_ENABLED=0` for builds eliminates C compiler dependency

#### Issue History Depth: Strong

- 4,307 closed issues; 202 open issues (Source: GitHub Search API, 2026-03-28)
- Repository created 2015-01-13; over 11 years of issue history
- Latest push: 2026-03-26 (2 days before collection)

#### Validated Task Count: Weak

- **14 validated instances** in SWE-bench Multilingual (Source: swebench.com/multilingual.html, 2026-03-28)
- **0 instances** in Multi-SWE-bench -- caddy is not present in the dataset (Source: Table 1, arXiv 2504.02605v1; Hugging Face dataset ByteDance-Seed/Multi-SWE-bench, 2026-03-28)
- 14 tasks are insufficient for sustained multi-round Arena competitions; cli/cli has 397 instances by comparison
- Best reported resolution rate: 14.3% (2 of 12 resolved) on SWE-bench Multilingual leaderboard

#### Codebase Complexity: Adequate

- 302 Go source files across 59 directories -- moderate size, smaller than cli/cli (806 files) and grpc-go (1,013 files) (Source: GitHub Trees API, 2026-03-28)
- 26 packages at depth <= 2 -- relatively shallow package hierarchy
- Modular architecture: `modules/` contains self-contained HTTP, TLS, PKI, logging, metrics, and filesystem modules
- Plugin registration system via `init()` functions creates implicit coupling not visible from package structure
- HTTP/TLS domain knowledge required but less specialized than gRPC protocols or monitoring systems
- No protobuf or code generation requirements

#### Community Health: Strong

- 71,129 stars -- highest of all four Go candidates (Source: GitHub API, 2026-03-28)
- ~360 contributors; 4,691 forks
- ~100 commits in last 90 days (~1.1 commits/day)
- Latest release: v2.11.2 on 2026-03-06
- GitHub community health score: 87% (contributing guide, PR template, license, README; no code of conduct)
- Apache-2.0 license
- Independent open-source project (not backed by a major corporation but widely adopted in production)

#### DevContainer Compatibility

- **Go toolchain:** See DevContainer Baseline in Methodology.
- **Build tags required:** `GOFLAGS='-tags=nobadger,nomysql,nopgx'` must be set to exclude optional storage backend tests (MySQL, PostgreSQL, Badger)
- **CGO:** Not required for core functionality; CI sets `CGO_ENABLED=0` explicitly
- **Network independence:** Integration tests in `caddytest/` use pre-generated localhost TLS certificates and bind to localhost; no external network access required
- **No code generation tools needed:** No protobuf, yacc, or other generators
- **Verdict:** Tests should run with `go test -tags=nobadger,nomysql,nopgx ./...`. Main configuration requirement is setting the build tags.

---

### cli/cli

**Repository:** https://github.com/cli/cli
**Stars:** 43,387 (GitHub API, 2026-03-28)
**License:** MIT
**Architecture:** GitHub's official command line tool. 806 Go source files organized in a command-based architecture: `cmd/` (entry points), `pkg/` (public packages including `httpmock/`), `internal/` (private packages), `api/` (API client). 60 packages at depth <= 2. Dedicated `acceptance` test suite isolated from unit tests. 165.1k LoC (Source: Table 1, arXiv 2504.02605).

#### Test Suite Reliability: Strong

- 319 test files across 806 Go source files (39.6% test file ratio) -- highest among the four candidates (Source: GitHub Trees API, 2026-03-28)
- Dedicated `pkg/httpmock/` package provides an internal HTTP mocking framework with registry and stub infrastructure for network-free testing
- 20+ mock files throughout the codebase (mock API clients, mock prompters, mock verifiers) -- systematic test isolation (Source: GitHub Trees API, 2026-03-28)
- Standard test command: `go test ./...` via Makefile -- no custom test harness
- Separate `acceptance` test suite (build tag `acceptance`) isolates integration tests from unit tests
- High A2P2P count: 1,997.0 average pass-to-pass tests per instance, confirming extensive test coverage. A2P2P (average number of tests passing before a patch that also pass after) measures regression-catching capacity. (Source: Table 1, arXiv 2504.02605)
- No external service dependencies in unit test paths; mocks cover GitHub API, codespace RPC, and attestation verification

#### CI Reproducibility: Strong

- 13 GitHub Actions workflow files including `go.yml` (primary test pipeline) and `lint.yml` (Source: GitHub API, 2026-03-28)
- Makefile test target: `go test ./...` -- standard Go toolchain, no proprietary runners
- No evidence of required secrets for test execution (deployment and triage workflows are separate)
- `codeql.yml` and `govulncheck.yml` for security scanning -- standard GitHub-provided actions
- Build system uses standard `go build` via `script/build.go`

#### Issue History Depth: Strong

- 4,940 closed issues; 916 open issues (Source: GitHub Search API, 2026-03-28)
- Repository created 2019-10-03; over 6 years of issue history
- Latest push: 2026-03-27 (1 day before collection)

#### Validated Task Count: Adequate

- **397 validated instances** in Multi-SWE-bench (Source: Table 1, arXiv 2504.02605v1, #Num column)
- This is the **largest Go repository** in Multi-SWE-bench by a factor of ~25x over the next largest (grpc-go at 16)
- 397 of 428 total Go instances in Multi-SWE-bench = 92.8% of the Go task pool
- Falls below the Strong threshold (>= 500) but is by far the best available among Go candidates
- Note: the number 737 appearing in some planning documents is the #Files column, not validated instance count
- cli/cli is also present in Multi-SWE-RL (Hugging Face dataset ByteDance-Seed/Multi-SWE-RL, 2026-03-28)

#### Codebase Complexity: Strong

- 806 Go source files, 165.1k LoC across 60 packages (Source: GitHub Trees API, 2026-03-28; Table 1, arXiv 2504.02605)
- Clear command-based architecture: each CLI command is a self-contained package -- favorable for agent navigation and isolated task resolution
- Top-level structure: `cmd/`, `pkg/`, `internal/`, `api/` with 14 top-level directories
- Average 3.9 files per patch indicates moderate cross-file coupling (Source: Table 1, arXiv 2504.02605)
- Average 9.0 hunks per patch indicates non-trivial but manageable changes

#### Community Health: Strong

- 43,387 stars; ~384 contributors; ~402 commits in last 90 days (~4.5 commits/day) (Source: GitHub API, 2026-03-28)
- Latest release: v2.89.0 on 2026-03-26 (2 days before collection)
- GitHub community health score: 100% -- full community infrastructure (code of conduct, contributing guide, PR template, license, README)
- Backed by GitHub (Microsoft subsidiary) -- strong organizational support
- MIT license -- maximally permissive

#### DevContainer Compatibility

- **Go toolchain:** See DevContainer Baseline in Methodology. Standard `go test ./...` works.
- **Network independence:** Dedicated `pkg/httpmock/` package and 20+ mock files ensure unit tests run without network access. GitHub API is mocked at the HTTP transport level.
- **Acceptance tests:** Separate suite (requires `acceptance` build tag) may need actual GitHub API access; isolated from unit tests and not triggered by `go test ./...`.
- **No protobuf dependency:** Some `.proto.mock.go` files for codespace RPC are pre-generated mocks, not requiring `protoc` at test time.
- **Build dependencies:** Standard Go modules; `CGO_ENABLED` appears in Makefile but is not required for testing.
- **Verdict:** Unit tests should run cleanly in the Arena devcontainer with `go test ./...` without network access or special tooling.

---

### prometheus/prometheus

**Repository:** https://github.com/prometheus/prometheus
**Stars:** 63,289 (GitHub API, 2026-03-28)
**License:** Apache-2.0
**Architecture:** The Prometheus monitoring system and time series database. 687 Go source files across 266 directories with 127 packages at depth <= 2. Complex domain architecture: PromQL query engine (yacc-generated parser), TSDB storage engine, service discovery subsystem (20+ providers including AWS, Azure, Consul, Kubernetes, DNS), scrape engine, alerting/notification, and a mixed Go + React web UI. 5 separate `go.mod` files indicate sub-module complexity. CNCF graduated project.

#### Test Suite Reliability: Adequate

- 256 test files across 687 Go source files (37.3% test file ratio) -- comparable to grpc-go (35.9%) (Source: GitHub Trees API, 2026-03-28)
- 9 mock files across discovery subsystems and TSDB -- moderate test isolation infrastructure (Source: GitHub Trees API, 2026-03-28)
- Discovery service tests mock external cloud APIs (DigitalOcean, Hetzner, Linode, Vultr, etc.) -- good isolation from provider dependencies
- PromQL parser uses yacc-generated parser (`promql/parser/generated_parser.y`); generated file is committed, so `goyacc` is not needed for testing
- CI runs multiple test variants: standard, `--tags=dedupelabels`, `--tags=slicelabels -race`, `--tags=forcedirectio -race` -- indicating test configuration sensitivity
- Fuzzing test infrastructure present (`fuzzing.yml` workflow, `util/fuzzing/` directory)
- Concern: timing-sensitive tests in TSDB and scrape subsystems may be flaky in resource-constrained environments
- Concern: multiple build tag variants suggest tests may behave differently depending on configuration

#### CI Reproducibility: Adequate

- 13 GitHub Actions workflow files including `ci.yml` (primary test pipeline) (Source: GitHub API, 2026-03-28)
- CI runs inside a custom Docker container: `quay.io/prometheus/golang-builder:1.26-base` -- not using standard `ubuntu-latest` with `setup-go`
- Primary Go test path: `make GO_ONLY=1 SKIP_GOLANGCI_LINT=1` (skips UI build, runs Go tests only)
- `protoc` required only for proto regeneration, not for running tests; 5 generated `.pb.go` files are committed
- `goyacc` required only for parser regeneration, not for running tests; generated parser file is committed
- 5 sub-module `go.mod` files (compliance, documentation/examples, internal/tools, web/ui tools) have separate dependency trees
- Docker secrets used for container publishing but not for test execution
- Concern: custom CI builder image means the exact test environment differs from a standard Go installation; the Arena devcontainer uses a different base image and tests may have implicit dependencies

#### Issue History Depth: Strong

- 5,899 closed issues -- highest of all four Go candidates; 513 open issues (Source: GitHub Search API, 2026-03-28)
- Repository created 2012-11-24; over 13 years of issue history -- oldest of all four candidates
- Latest push: 2026-03-27 (1 day before collection)

#### Validated Task Count: Weak

- **8 validated instances** in SWE-bench Multilingual -- the smallest task inventory among all four candidates (Source: swebench.com/multilingual.html, 2026-03-28)
- **0 instances** in Multi-SWE-bench -- prometheus is not present in the dataset (Source: Table 1, arXiv 2504.02605v1; Hugging Face dataset ByteDance-Seed/Multi-SWE-bench, 2026-03-28)
- 8 tasks would support at most 1-2 competition rounds before exhaustion
- Best reported resolution rate: 37.5% (3 of 5 resolved) on SWE-bench Multilingual leaderboard
- cli/cli has 397 instances; prometheus's 8 instances represent ~2% of that scale

#### Codebase Complexity: Strong

- 687 Go source files across 266 directories, 127 packages at depth <= 2 -- comparable to grpc-go (169 packages) (Source: GitHub Trees API, 2026-03-28)
- Domain specialization: PromQL query language (yacc grammar), TSDB storage engine, service discovery (15+ providers), scrape engine, alerting/notification subsystem
- 23 top-level directories with clear subsystem separation: `promql/`, `tsdb/`, `discovery/`, `scrape/`, `storage/`, `rules/`, `notifier/`, `web/`
- Discovery subsystem alone spans 20+ provider-specific packages
- 5 separate `go.mod` files indicate sub-module complexity
- 4 `.proto` files and 5 generated `.pb.go` files for remote write/read protocol
- Mixed Go + React web UI (`web/ui/`) adds cross-language complexity, though `GO_ONLY=1` mode isolates Go tests

#### Community Health: Strong

- 63,289 stars -- second highest of all four candidates; 10,272 forks -- highest fork count (Source: GitHub API, 2026-03-28)
- ~351 contributors; ~612 commits in last 90 days (~6.8 commits/day) -- highest commit frequency of all four candidates
- Latest release: v3.10.0 on 2026-02-26
- GitHub community health score: 87%; full community infrastructure (code of conduct, contributing guide, PR template, license, README)
- CNCF graduated project -- strong organizational backing and governance
- Apache-2.0 license

#### DevContainer Compatibility

- **Go toolchain:** See DevContainer Baseline in Methodology. Standard `go test ./...` should work for core Go tests.
- **GO_ONLY mode:** Use `make GO_ONLY=1` or run `go test ./...` directly to skip UI/Node.js build steps.
- **protoc:** Required only for code regeneration (`make protoc && make proto`), not for running tests. Generated `.pb.go` files are committed.
- **goyacc:** Required only for regenerating the PromQL parser, not for running tests. Generated parser file is committed.
- **Network independence:** Discovery service tests use mock files for external cloud APIs. Core TSDB, PromQL, and scrape tests should not require external network access.
- **Timing sensitivity:** TSDB and scrape tests may include timing-dependent assertions that could be flaky in resource-constrained devcontainer environments.
- **Custom CI image:** Prometheus CI uses `quay.io/prometheus/golang-builder:1.26-base`; tests may have subtle differences when run on a different base image.
- **Verdict:** Go tests should run with `go test ./...` or `make GO_ONLY=1`. Main concerns are potential timing-sensitive test flakiness and implicit dependencies from the custom CI builder image.

---

### grpc/grpc-go

**Repository:** https://github.com/grpc/grpc-go
**Stars:** 22,857 (GitHub API, 2026-03-28)
**License:** Apache-2.0
**Architecture:** The Go language implementation of gRPC (HTTP/2 based RPC). 1,013 Go source files with 260.8k LoC across 169 packages at depth <= 2. Protocol-heavy architecture spanning transport, encoding, service layers, xDS, balancer, and resolver subsystems. 48 pre-committed generated `.pb.go` files from 13 `.proto` sources. Sub-modules present for `security/advancedtls` and `security/authorization`. Backed by Google/CNCF.

#### Test Suite Reliability: Adequate

- 364 test files across 1,013 Go source files (35.9% test file ratio) (Source: GitHub Trees API, 2026-03-28)
- Makefile test target: `go test -cpu 1,4 -timeout 7m google.golang.org/grpc/...`
- End-to-end tests use `bufconn` (in-process gRPC connections), not external network endpoints
- Protocol-heavy testing uses 48 generated test service stubs (`.pb.go` files pre-committed) (Source: GitHub Trees API, 2026-03-28)
- Low A2F2P: 0.6 average fail-to-pass tests per instance suggests fewer regression-catching test transitions (Source: Table 1, arXiv 2504.02605)
- Separate `testrace` target runs with `-race` flag -- indicates awareness of concurrency testing
- Sub-module tests (`security/advancedtls`, `security/authorization`) run separately via `testsubmodule` target
- Concern: `benchmark/` directory and some `interop/` tests may require more complex setup, but core `go test` should work

#### CI Reproducibility: Strong

- 8 GitHub Actions workflow files including `testing.yml` (primary) and `coverage.yml` (Source: GitHub API, 2026-03-28)
- Makefile `test` target uses standard `go test` with module path -- no proprietary toolchain
- `proto` target in Makefile checks for `protoc` but this is only for code generation, not for running tests; generated `.pb.go` files are committed
- `pr-validation.yml` present for PR checks
- No evidence of required secrets for test execution

#### Issue History Depth: Strong

- 2,860 closed issues; 105 open issues (Source: GitHub Search API, 2026-03-28)
- Repository created 2014-12-08; over 11 years of issue history
- Latest push: 2026-03-27

#### Validated Task Count: Weak

- **16 validated instances** in Multi-SWE-bench (Source: Table 1, arXiv 2504.02605v1, #Num column)
- Despite having 981 files and 260.8k LoC, only 16 tasks passed Multi-SWE-bench validation -- the protocol-heavy domain likely makes automated instance generation harder
- For context: cli/cli has 397 instances; zeromicro/go-zero has 15 -- grpc-go's count is nearly the lowest among all Go repos in Multi-SWE-bench
- Note: the number 981 appearing in some planning documents is the #Files column, not validated instance count
- grpc-go is NOT present in Multi-SWE-RL (Source: Hugging Face dataset ByteDance-Seed/Multi-SWE-RL, 2026-03-28)

#### Codebase Complexity: Strong

- 1,013 Go source files, 260.8k LoC, 169 packages at depth <= 2 -- largest and most complex codebase among the four candidates (Source: GitHub Trees API, 2026-03-28; Table 1, arXiv 2504.02605)
- 90 unique top-level path prefixes; 40+ top-level directories including `balancer`, `credentials`, `encoding`, `internal`, `xds`, `test`, `benchmark`, `examples`
- Domain specialization: gRPC protocol implementation requiring knowledge of HTTP/2, protobuf, and RPC semantics
- Average 2.8 files per patch and 7.7 hunks per patch -- moderate cross-file coupling (Source: Table 1, arXiv 2504.02605)
- Sub-modules (`security/advancedtls`, `security/authorization`) add an additional complexity layer

#### Community Health: Strong

- 22,857 stars; ~428 contributors; ~114 commits in last 90 days (~1.3 commits/day) (Source: GitHub API, 2026-03-28)
- Latest release: v1.79.3 on 2026-03-17
- GitHub community health score: 87%; full community infrastructure (code of conduct, contributing guide, PR template, license)
- Backed by Google/CNCF -- strong organizational support
- Apache-2.0 license

#### DevContainer Compatibility

- **Go toolchain:** See DevContainer Baseline in Methodology. Standard `go test google.golang.org/grpc/...` works.
- **protoc (protobuf compiler):** Available in the devcontainer if needed but not required for running the test suite. The 48 generated `.pb.go` files and 13 `.proto` source files are committed to the repository.
- **Network independence:** Tests use `bufconn` (in-process gRPC connections) for end-to-end tests, avoiding real network sockets. Core tests should run without external network access.
- **Sub-module tests:** `security/advancedtls` and `security/authorization` have their own `go.mod` files and may need separate `go test` invocations.
- **Verdict:** Tests should run in the Arena devcontainer without `protoc`. The main concern is codebase domain complexity rather than tooling barriers.

---

## Summary Comparison

| Criterion | caddyserver/caddy | cli/cli | prometheus/prometheus | grpc/grpc-go |
|---|---|---|---|---|
| **Test Suite Reliability** | Adequate | Strong | Adequate | Adequate |
| **CI Reproducibility** | Adequate | Strong | Adequate | Strong |
| **Issue History Depth** | Strong | Strong | Strong | Strong |
| **Validated Task Count** | Weak | Adequate | Weak | Weak |
| **Codebase Complexity** | Adequate | Strong | Strong | Strong |
| **Community Health** | Strong | Strong | Strong | Strong |
| **Overall Rank** | #3 | #1 | #4 | #2 |

---

## Ranked Recommendation

### 1. cli/cli (GitHub CLI)

cli/cli is the clear frontrunner among all Go benchmark candidates. With 397 validated Multi-SWE-bench instances, it holds 92.8% of all Go task instances in the dataset -- more than 24x the next largest Go repository. It is the only Go candidate rated Strong on Test Suite Reliability, owing to its dedicated `pkg/httpmock/` framework and 20+ mock files that ensure network-free testing. CI Reproducibility is Strong: standard `go test ./...` works without build tags, secrets, or special tooling. The command-based architecture (each CLI command is a self-contained package) is favorable for agent navigation and isolated task resolution. cli/cli is also the only Go repo present in Multi-SWE-RL, providing additional training/evaluation data. The MIT license is maximally permissive, and GitHub (Microsoft) backing ensures long-term maintenance.

**Primary limitation:** 397 instances falls in the Adequate range (below the 500 Strong threshold), but no other Go repository comes close to this count.

> **Note:** cli/cli accounts for 92.8% of all Go instances in Multi-SWE-bench (397/428). Arena's Go benchmark program has a single-point-of-failure dependency on this repository remaining in the dataset.

### 2. grpc/grpc-go

grpc-go ranks second based on its presence in Multi-SWE-bench and strong infrastructure metrics. It has Strong ratings on CI Reproducibility, Issue History Depth, Codebase Complexity, and Community Health. The Google/CNCF backing, 11 years of history, and 428 contributors provide a robust foundation. CI requires only standard `go test` -- protoc is not needed for running tests.

**Critical limitation:** Only 16 validated Multi-SWE-bench instances, rated Weak. Despite having 981 files and 260.8k LoC (the largest codebase among the four candidates), the protocol-heavy domain appears to make automated task instance generation difficult. 16 tasks would be exhausted in 2-3 competition rounds. grpc-go is a viable secondary benchmark target but cannot sustain multi-round competitions as a primary target without future growth of the Multi-SWE-bench Go dataset.

### 3. caddyserver/caddy

Caddy ranks third as the stronger of the two SWE-bench Multilingual-only repositories. It has the highest star count (71.1k) of all four candidates, a clean modular architecture, and a single `go.mod` with no sub-modules. The codebase is the most compact (302 Go files) and most accessible to agents, with straightforward HTTP/TLS domain knowledge requirements.

**Critical limitation:** Only 14 validated instances from SWE-bench Multilingual (not present in Multi-SWE-bench at all). This task count is insufficient for sustained Arena competitions. Additionally, the required build tags (`nobadger,nomysql,nopgx`) and lower test isolation infrastructure (only 2 mock files) reduce its benchmark readiness compared to cli/cli. Caddy could serve as a supplementary benchmark if its SWE-bench instance count grows, but it cannot be a primary competition target at present.

### 4. prometheus/prometheus

Prometheus ranks fourth with the smallest validated task inventory of all four candidates. While it excels on several infrastructure metrics -- highest closed issue count (5,899), highest commit frequency (612/90 days), oldest repository (13 years), and CNCF graduated governance -- these strengths cannot compensate for having only 8 SWE-bench Multilingual instances.

**Critical limitations:** (1) Only 8 validated instances, the fewest among all candidates, sufficient for at most 1-2 competition rounds. (2) Not present in Multi-SWE-bench. (3) The most complex domain among the four candidates: PromQL yacc grammar, TSDB storage engine, 20+ discovery providers, and sub-module structure create significant barriers for agent navigation. (4) CI reproducibility is complicated by the use of a custom Docker builder image (`quay.io/prometheus/golang-builder`) that differs from the Arena devcontainer. (5) Timing-sensitive TSDB and scrape tests may exhibit flakiness in constrained environments. Prometheus is not recommended as a benchmark target at this time.

---

## Appendix

### Format Precedent

Neither BENCH-01 (`specs/benchmarks/rust-evaluation.md`) nor BENCH-03 (`specs/benchmarks/java-evaluation.md`) existed at the time of writing (2026-03-28). This document defines the evaluation format for Arena benchmark repository assessments. Future Rust and Java evaluations should align with the structure established here: Methodology, per-repo Candidate Evaluations (with per-criterion ratings), Summary Comparison table, and Ranked Recommendation.

### DevContainer Toolchain

The shared Go toolchain baseline is documented in the DevContainer Baseline subsection of Methodology. The only per-repo configuration needed beyond the baseline:

- **caddy:** Set `GOFLAGS='-tags=nobadger,nomysql,nopgx'` to exclude optional storage backend tests.
- **prometheus:** Use `make GO_ONLY=1` or run `go test ./...` directly to skip the React UI build. Be aware of potential timing-sensitive test flakiness.
- **grpc-go:** No special configuration. `protoc` is not needed for `go test`.
- **cli/cli:** No special configuration. `go test ./...` works out of the box.

### Multi-SWE-bench vs. SWE-bench Multilingual

These are distinct benchmarks from different research groups:

- **Multi-SWE-bench** (arXiv 2504.02605, ByteDance Seed, NeurIPS 2025): Covers cli/cli and grpc-go among Go repos. Provides 428 total Go validated instances across three repositories (cli/cli: 397, grpc-go: 16, zeromicro/go-zero: 15). Validated through a multi-step pipeline including test generation and patch verification.
- **SWE-bench Multilingual** (Princeton NLP): Covers caddyserver/caddy (14 instances) and prometheus/prometheus (8 instances) among Go repos. Does not include cli/cli or grpc-go.

The two datasets were produced independently and their instance validation methodologies differ. Direct comparison of instance counts across datasets should note this caveat, though both aim to measure the same capability (automated issue resolution).

### Data Corrections

The numbers 737 (cli/cli) and 981 (grpc-go) that appear in some Arena planning documents originate from the **#Files column** of Multi-SWE-bench Table 1, not the **#Num (validated instances) column**. The actual validated instance counts are:

| Repository | #Files (NOT instance count) | #Num (Validated Instances) | Source |
|---|---|---|---|
| cli/cli | 737 | 397 | Table 1, arXiv 2504.02605v1 |
| grpc/grpc-go | 981 | 16 | Table 1, arXiv 2504.02605v1 |

This correction significantly impacts the evaluation: grpc-go drops from an apparently large task inventory (981) to a critically small one (16), while cli/cli remains the dominant Go contributor despite the reduction from 737 to 397.
