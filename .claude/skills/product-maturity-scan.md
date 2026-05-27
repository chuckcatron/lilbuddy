---
name: product-maturity-scan
description: Scan repos to auto-populate a Product Maturity CSV (26 dimensions, any product)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# /product-maturity-scan Skill

Scan source repos and auto-populate a Product Maturity CSV with 26 dimensions across Monitoring & Alerting, Logging & Observability, Security & Compliance, Workflow Automation, Test Quality, Environment & Infrastructure, and Architecture Documentation.

## Usage

```
/product-maturity-scan <csv_path> <repo1> <repo2> ...
/product-maturity-scan --init <csv_path>
```

- If no arguments provided, ask the user for the CSV path and repo list.
- `--init` mode creates an empty template CSV with the standard 2-row header.

## Instructions

### Mode: `--init`

If the user passes `--init <csv_path>`, create a new CSV file at that path with exactly these two header rows and no data rows. Use the Write tool to create it.

**Row 1 — Category headers** (merged cells represented by empty strings between category boundaries):

```
Source,Monitoring & Alerting,,,"Logging & Observability",,,,Security & Compliance,,,,,Workflow Automation,Test Quality,,,,Environment & Infrastructure,,,"Architecture Documentation",,,,
```

**Row 2 — Dimension headers:**

```
Source,MA.2 Canary alert minutes,MA.3 Health check / auto-restart,MA.4 Auto-scaling,LO.1 Internal logging,LO.2 External logging,LO.3 Log level control,LO.4 Trace / correlation ID,SC.1 MFA,SC.2 External auth,SC.3 Public endpoint auth,SC.4 Private endpoint auth,SC.7 Snyk,WA.2 CI/CD pipeline,TQ.2 Test coverage %,TQ.3 Behavioral / e2e tests,TQ.4 Load tests,TQ.5 Tests in CI,EI.2 Non-prod environment,EI.4 Current tech stack,EI.4 detail,AD.1 Architecture diagram,AD.2 Ingress / egress documented,AD.3 External API docs,AD.4 Ingress data docs,AD.5 Internal API docs,AD.6 Egress data docs
```

Print confirmation and exit. The user can then run the scan mode to populate it.

---

### Mode: Scan

Process repos **sequentially** (one at a time) for clean output.

For each repo path provided:

#### Step A — Detect Source Metadata

1. **Read manifest files** to identify the tech stack:
   - `package.json` — Node/TS/JS projects (extract name, dependencies, scripts, engines)
   - `pom.xml` — Java/Maven projects (extract groupId, artifactId, parent spring-boot version, java.version, dependencies)
   - `build.sbt` — Scala/SBT projects
   - `requirements.txt` / `setup.py` / `pyproject.toml` — Python projects
   - `composer.json` — PHP projects

2. **Classify source type** using these rules (first match wins):
   - `infra` — has `cdk.json` AND no application source code (no `src/main`, no `app/` routes, no handler code beyond CDK constructs)
   - `library` — no `main`/`start` script, published as a package (has `"publishConfig"` or is consumed as a dependency by other repos, or `pom.xml` with `<packaging>jar</packaging>` and no Spring Boot parent)
   - `lambda` — handler exports (`exports.handler`, `module.exports.handler`), SAM template (`template.yaml` with `AWS::Serverless`), or CDK Lambda constructs in infra code with handler source in same repo
   - `edge` — serial/GPIO imports (`serial`, `RPi.GPIO`, `pyserial`), dpkg packaging (`debian/` dir), or runs on physical hardware
   - `script` — cron jobs, CLI scripts, one-off data processing (Flask + scheduled tasks, standalone Python scripts with no web framework beyond simple endpoints)
   - `app` — default for anything else (web apps, APIs, microservices)

3. **Determine exposure:**
   - `external` — has public-facing endpoints or UI (serves to end-users/customers outside the org)
   - `internal` — serves only internal consumers (other services, internal tools)
   - `both` — serves both

4. **Determine deployment pattern:**
   - Check for: `Dockerfile`, `Dockerrun.aws.json`, `.ebextensions/`, `buildspec.yml`, CDK ECS/Lambda/EB constructs, `serverless.yml`, `template.yaml` (SAM), `appspec.yml`
   - Classify: `ecs-fargate`, `elastic-beanstalk`, `lambda`, `s3-cloudfront`, `emr`, `manual`, `none`

5. **Build tech string** — e.g., `"Java 17, Spring Boot 3.5"`, `"NestJS 11, TS 5.9, Node 22"`, `"Python 3, Flask, boto3"`

#### Step B — Scan 26 Dimensions

For each dimension, search the repo for evidence. Record value, confidence level, and evidence (file path or specific finding).

**IMPORTANT:** Use Glob and Grep tools for detection. Do NOT shell out to `find` or `grep` via Bash.

##### MA.2 — Canary Alert Minutes

- **Detection:** Cannot auto-detect (requires external monitoring config)
- **Action:** Leave blank, flag as MANUAL

##### MA.3 — Health Check / Auto-Restart

- **Search for:**
  - `spring-boot-starter-actuator` in `pom.xml` → health endpoint exists
  - Grep for `/health` endpoint definitions
  - `HealthCheckPath` or `healthCheck` in CDK/infra files
  - `.ebextensions/` health config files
  - ECS `healthCheck` container definition in CDK
- **Value mapping:**
  - EB or ECS with health check configured → `auto-restart`
  - CloudWatch alarm on health → `page`
  - Health endpoint exists but no auto-restart/paging → `y`
  - None found → `n`
- **Confidence:** HIGH

##### MA.4 — Auto-Scaling

- **Search for:**
  - `autoScaleTaskCount`, `ScalableTarget`, `scalingPolicy` in CDK/infra files
  - EB auto-scaling config in `.ebextensions/`
  - Lambda reserved/provisioned concurrency settings
  - `AutoScalingGroup` in CloudFormation/CDK
- **Value mapping:**
  - Auto-scaling config found → `auto-scale`
  - None → `n`
- **Confidence:** HIGH

##### LO.1 — Internal Logging

- **Search for:**
  - CloudWatch SDK deps (`@aws-sdk/client-cloudwatch-logs`, `aws-sdk`, `boto3`)
  - Logging frameworks: `log4j`, `logback`, `slf4j` in pom.xml; `winston`, `pino`, `@nestjs/common Logger` in package.json
  - `logback.xml`, `logback-spring.xml`, `log4j2.xml` config files
  - Python `logging` module usage
- **Value mapping:**
  - Logging framework found → `y`
  - Edge device or external-only frontend with no server logging → `na`
  - None → `n`
- **Confidence:** HIGH

##### LO.2 — External Logging (Client-Side Error Tracking)

- **Search for:**
  - Sentry SDK (`@sentry/browser`, `@sentry/node`, `sentry-sdk`)
  - Error logger client (custom error-logger service calls)
  - `window.onerror`, `window.addEventListener('error'`
  - Datadog RUM, LogRocket, Bugsnag
- **Value mapping:**
  - Client error tracking found → `y`
  - Internal-only service (no browser/client) → `na`
  - None → `n`
- **Confidence:** MEDIUM

##### LO.3 — Log Level Control

- **Search for:**
  - `log4j2.xml` / `logback.xml` with environment variable references (`${LOG_LEVEL}`, `${logging.level}`) → `deployment`
  - Spring Actuator `/loggers` endpoint or runtime config API → `runtime`
  - NestJS LogLevel configuration with env var → `deployment`
  - Hardcoded log levels only → `n`
- **Value mapping:**
  - Runtime changeable → `runtime`
  - Changeable per deployment/env → `deployment`
  - Library or infra → `na`
  - None / hardcoded → `n`
- **Confidence:** MEDIUM

##### LO.4 — Trace / Correlation ID

- **Search for:**
  - `X-Request-Id`, `x-request-id`, `correlationId`, `traceId`, `requestId` in code
  - `TracingModule`, `@opentelemetry` packages
  - Spring Cloud Sleuth / Micrometer Tracing deps (`spring-cloud-starter-sleuth`, `micrometer-tracing`)
  - MDC (Mapped Diagnostic Context) usage in Java
- **Value mapping:**
  - Trace/correlation ID propagation found → `y`
  - None → `n`
- **Confidence:** HIGH

##### SC.1 — MFA

- **Detection:** Cannot reliably auto-detect (lives in IDP configuration, not source code)
- **Action:** Leave blank, flag as MANUAL

##### SC.2 — External Auth (Auth for External Users)

- **Search for** (only if exposure includes `external`):
  - Cognito integration, SAML config, OAuth2 client config
  - Login pages, auth redirects
  - Auth guards on external-facing routes
- **Value mapping:**
  - External auth found → `y`
  - No external exposure → `na`
  - External but no auth found → `n`
- **Confidence:** MEDIUM

##### SC.3 — Public Endpoint Auth

- **Search for:**
  - `@EnableWebSecurity`, `SecurityFilterChain`, `WebSecurityConfigurerAdapter` in Java
  - `@UseGuards(AuthGuard)`, `@UseGuards(JwtAuthGuard)` in NestJS
  - JWT validation middleware on public routes
  - `VerdantSecuredController` base class usage
- **Value mapping:**
  - Auth on public endpoints → `y`
  - No public endpoints → `na`
  - Public endpoints without auth → `n`
- **Confidence:** MEDIUM

##### SC.4 — Private Endpoint Auth

- **Search for:**
  - Auth middleware/guards on internal API endpoints
  - Service-to-service auth (API keys, IAM roles, mTLS)
  - Lambda authorizers in API Gateway config
- **Value mapping:**
  - Auth on private endpoints → `y`
  - Lambda/infra with no endpoints → `na`
  - Private endpoints without auth → `n`
- **Confidence:** MEDIUM

##### SC.7 — Snyk

- **Search for:**
  - `.snyk` file in repo root
  - `snyk` in CI config (`buildspec.yml`, `.github/workflows/`, etc.)
  - `snyk` in `package.json` scripts
  - `.snyk` policy file
- **Value mapping:**
  - Any Snyk integration found → `y`
  - None → `n`
- **Confidence:** HIGH

##### WA.2 — CI/CD Pipeline

- **Search for:**
  - `buildspec.yml` (CodeBuild)
  - `.github/workflows/*.yml` (GitHub Actions)
  - `Jenkinsfile`
  - `.gitlab-ci.yml`
  - `azure-pipelines.yml`
  - `Dockerfile` + deployment config (EB, ECS)
  - `appspec.yml` (CodeDeploy)
- **Value mapping:**
  - CI/CD config found → `y`
  - None → `n`
- **Confidence:** HIGH

##### TQ.2 — Test Coverage %

- **Search for:**
  - `coverageThreshold` in `jest.config.*` or `package.json` jest config — extract the number
  - `jacoco-maven-plugin` in `pom.xml` with `<minimum>` — extract the number
  - `maven.test.skip=true` or `skipTests` → `0` (tests disabled)
  - `pytest-cov` config in `setup.cfg` / `pyproject.toml`
- **Value mapping:**
  - Threshold number found → that number (e.g., `80`)
  - Tests exist but no threshold → `?` (flag for manual)
  - Tests disabled → `0`
  - No tests at all → `0`
- **Confidence:** MEDIUM

##### TQ.3 — Behavioral / E2E Tests

- **Search for:**
  - `e2e`/`integration`/`acceptance` test directories
  - Cucumber `.feature` files
  - Playwright, Cypress, Puppeteer configs (`playwright.config.*`, `cypress.config.*`)
  - `test:e2e` or `test:integration` scripts in package.json
  - Spring `@SpringBootTest` with `@AutoConfigureMockMvc` (integration tests)
- **Value mapping:**
  - E2E/integration tests found → `y`
  - None → `n`
- **Confidence:** HIGH

##### TQ.4 — Load Tests

- **Search for:**
  - k6 scripts (`*.k6.js`, `k6` in deps)
  - Artillery configs (`artillery.yml`, `artillery` in deps)
  - Locust files (`locustfile.py`)
  - JMeter files (`*.jmx`)
  - Gatling files
- **Value mapping:**
  - Load test config found → `y`
  - None → `n`
- **Confidence:** HIGH

##### TQ.5 — Tests in CI

- **Search for:**
  - Test commands in CI config files: `npm test`, `npm run test`, `mvn test`, `mvn verify`, `pytest`, `sbt test`
  - **Negative check:** `maven.test.skip=true`, `skipTests=true` in CI config or pom.xml profiles → means tests NOT in CI
  - Pre-commit hooks that run tests (counts if CI also runs them)
- **Value mapping:**
  - Test commands in CI → `y`
  - Tests exist but not in CI → `n`
  - No tests at all → `n`
- **Confidence:** HIGH (when CI config is present)

##### EI.2 — Non-Prod Environment

- **Search for:**
  - `application-qa.properties`, `application-qa.yml`, `application-dev.properties`
  - `docker-compose-qa.*`, `docker-compose.dev.*`
  - CDK with non-prod stage/stack (e.g., `QA`, `staging`, `dev` in stack names)
  - `.env.qa`, `.env.dev`, `.env.staging` (or `.env.example` with env refs)
  - EB environment configs for non-prod
- **Value mapping:**
  - Non-prod config found → `y`
  - None → `n`
- **Confidence:** HIGH

##### EI.4 — Current Tech Stack

- **Evaluate detected versions against "current" thresholds:**
  - Java: 17+ is current, 21+ is leading edge
  - Node: 22+ is current, 20 is acceptable
  - Spring Boot: 3.x+ is current
  - TypeScript: 5.x+ is current
  - NestJS: 10+ is current
  - Python: 3.10+ is current
  - PHP: 8.2+ is current
  - Scala: 2.13+ or 3.x is current
  - React: 18+ is current
  - Next.js: 14+ is current
- **Value mapping:**
  - All major deps at current versions → `y`
  - Any major dep significantly behind → `n`
- **Confidence:** HIGH

##### EI.4 detail — Tech String

- **Action:** Auto-build from detected dependency versions
- **Format:** Comma-separated, most significant first. E.g.: `"Java 17, Spring Boot 3.5"`, `"NestJS 11, TS 5.9, Node 22"`, `"Python 3, Flask, boto3"`
- **Confidence:** HIGH

##### AD.1 — Architecture Diagram

- **Detection:** Cannot auto-detect from code
- **Action:** Leave blank, flag as MANUAL

##### AD.2 — Ingress/Egress Documented

- **Search for:**
  - HTTP endpoint definitions (`@GetMapping`, `@PostMapping`, `@Controller`, `@Get()`, `@Post()`)
  - Kinesis consumer/producer code
  - WebSocket server/client setup
  - TCP/socket listeners
  - Queue consumers/producers (SQS, SNS, EventBridge)
- **Value mapping:**
  - Multiple ingress/egress points with documentation → `y`
  - Ingress/egress exists but undocumented → `n`
  - No ingress/egress (library, script) → `na`
- **Confidence:** MEDIUM (presence detectable, documentation quality is subjective)

##### AD.3 — External API Docs

- **Search for:**
  - `springdoc-openapi` / `springfox-swagger` deps in pom.xml
  - `@nestjs/swagger` in package.json
  - OpenAPI/Swagger spec files (`openapi.yml`, `swagger.json`, `api-docs.*`)
  - `/v3/api-docs`, `/swagger-ui` endpoint config
- **Value mapping:**
  - API docs tooling for external API → `y`
  - No external API → `na`
  - External API but no docs → `n`
- **Confidence:** HIGH

##### AD.4 — Ingress Data Docs

- **Search for:**
  - AsyncAPI spec files
  - Documented input schemas (JSON Schema, Avro, Protobuf)
  - README sections describing input data format
- **Value mapping:**
  - Input data documentation found → `y`
  - No data ingestion → `na`
  - Data ingestion but no docs → `n`
- **Confidence:** LOW

##### AD.5 — Internal API Docs

- **Search for:**
  - Same swagger/openapi checks as AD.3 but for internal-facing APIs
  - Postman collections, API markdown docs
- **Value mapping:**
  - Internal API docs found → `y`
  - No internal API → `na`
  - Internal API but no docs → `n`
- **Confidence:** MEDIUM

##### AD.6 — Egress Data Docs

- **Search for:**
  - AsyncAPI specs for outbound data
  - Kinesis producer schemas documented
  - Event/message format documentation
- **Value mapping:**
  - Egress data documentation found → `y`
  - No data egress → `na`
  - Data egress but no docs → `n`
- **Confidence:** LOW

#### Step C — Apply N/A Rules by Source Type

After scanning, override specific dimensions to `na` based on source type. These overrides take precedence over scan results.

| Source Type | Dimensions set to `na`                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `library`   | LO.1, LO.2, LO.3, LO.4, SC.1, SC.2, SC.3, SC.4, MA.2, MA.3, MA.4, EI.2, AD.2, AD.3, AD.4, AD.5, AD.6, TQ.3, TQ.4 |
| `infra`     | LO.1, LO.2, LO.3, LO.4, SC.1, SC.2, SC.3, SC.4, MA.2, MA.3, MA.4, AD.2, AD.3, AD.4, AD.5, AD.6                   |
| `script`    | LO.2, SC.1, SC.2, SC.3, SC.4, MA.2, MA.3, MA.4, AD.2, AD.3, AD.4, AD.5, AD.6, TQ.3, TQ.4                         |
| `edge`      | LO.1 (`na`), SC.1 (`na`), SC.3 (`na`), SC.4 (`na`)                                                               |

When a dimension is overridden to `na`, set confidence to `HIGH` and evidence to `"N/A by source type: {type}"`.

#### Step D — Print Per-Source Report

After scanning each repo, print a formatted report:

```
=== {source-name} ({tech-string}) ===
Type: {type} | Exposure: {exposure} | Deployed: {deployment-pattern}

Dimension | Value        | Confidence | Evidence
----------|-------------|------------|-------------------------------------------
MA.2      |             | MANUAL     | Requires external monitoring check
MA.3      | auto-restart | HIGH      | .ebextensions/healthcheck.config
MA.4      | n           | HIGH       | No auto-scaling config found
LO.1      | y           | HIGH       | logback-spring.xml + slf4j deps
LO.2      | na          | HIGH       | Internal-only service
LO.3      | deployment  | MEDIUM     | logback-spring.xml with ${LOG_LEVEL}
LO.4      | y           | HIGH       | X-Request-Id header in RequestFilter.java
SC.1      |             | MANUAL     | Requires IDP configuration check
SC.2      | na          | HIGH       | No external exposure
SC.3      | y           | MEDIUM     | VerdantSecuredController on all endpoints
SC.4      | y           | MEDIUM     | JWT validation on internal routes
SC.7      | n           | HIGH       | No .snyk file or snyk in CI
WA.2      | y           | HIGH       | buildspec.yml found
TQ.2      |             | MEDIUM     | Tests exist but no coverage threshold
TQ.3      | n           | HIGH       | No e2e/integration test directory
TQ.4      | n           | HIGH       | No load test files found
TQ.5      | y           | HIGH       | mvn test in buildspec.yml
EI.2      | y           | HIGH       | application-qa.properties found
EI.4      | n           | HIGH       | Java 11 (current: 17+), SB 2.5 (current: 3.x+)
EI.4 det  | Java 11, SB 2.5 | HIGH  | pom.xml
AD.1      |             | MANUAL     | Requires architecture diagram review
AD.2      | n           | MEDIUM     | 15 endpoints found, no ingress/egress docs
AD.3      | y           | HIGH       | springdoc-openapi in pom.xml
AD.4      | na          | HIGH       | No data ingestion
AD.5      | n           | MEDIUM     | Internal API exists, no docs
AD.6      | na          | HIGH       | No data egress
```

#### Step E — Write CSV

After ALL repos are scanned:

1. **Read existing CSV** using Bash `cat` — preserve the 2-row header exactly as-is
2. **For each scanned source:**
   - Find existing row by matching source name in column A (case-insensitive)
   - If row exists: update cells where auto-detection produced a value
   - If row does not exist: append a new row
3. **Skip MANUAL-flagged cells** — do NOT overwrite existing values with blank. If the cell already has a value and the scan result is MANUAL, keep the existing value.
4. **Write the updated CSV** back to the same path using the Write tool
5. **Print summary:**

```
=== Product Maturity Scan Complete ===
Sources scanned: X
Cells updated: Y
Cells flagged for manual review: Z (MA.2, SC.1, AD.1)
CSV written to: {csv_path}
```

### Column Order Reference

The CSV columns are always in this order (27 columns):

```
Source, MA.2, MA.3, MA.4, LO.1, LO.2, LO.3, LO.4,
SC.1, SC.2, SC.3, SC.4, SC.7, WA.2,
TQ.2, TQ.3, TQ.4, TQ.5, EI.2, EI.4, EI.4 detail,
AD.1, AD.2, AD.3, AD.4, AD.5, AD.6
```

Column indices (0-based): Source=0, MA.2=1, MA.3=2, MA.4=3, LO.1=4, LO.2=5, LO.3=6, LO.4=7, SC.1=8, SC.2=9, SC.3=10, SC.4=11, SC.7=12, WA.2=13, TQ.2=14, TQ.3=15, TQ.4=16, TQ.5=17, EI.2=18, EI.4=19, EI.4_detail=20, AD.1=21, AD.2=22, AD.3=23, AD.4=24, AD.5=25, AD.6=26

### Valid Cell Values

| Value           | Meaning                                    |
| --------------- | ------------------------------------------ |
| `y`             | Yes, present/compliant                     |
| `n`             | No, not present/not compliant              |
| `na`            | Not applicable for this source type        |
| `auto-restart`  | Health check with automatic restart (MA.3) |
| `auto-scale`    | Auto-scaling configured (MA.4)             |
| `page`          | Health check with paging/alerting (MA.3)   |
| `runtime`       | Changeable at runtime (LO.3)               |
| `deployment`    | Changeable per deployment (LO.3)           |
| `{number}`      | Coverage percentage (TQ.2)                 |
| `{tech string}` | Technology description (EI.4 detail)       |
| _(blank)_       | Not yet assessed / requires manual review  |

### Error Handling

- If a repo path doesn't exist or isn't accessible, print a warning and skip it
- If the CSV doesn't exist and `--init` wasn't used, ask the user if they want to create it
- If a manifest file can't be parsed, note it in evidence and continue with reduced confidence
- If the CSV has unexpected column count, warn the user and abort rather than corrupting data

### CSV Read/Write

When reading CSV files, use Bash to read the raw content:

```bash
cat "<csv_path>"
```

When writing CSV files, use the Write tool. Be careful to:

- Preserve the exact 2-row header (copy byte-for-byte)
- Quote cells that contain commas, quotes, or newlines
- Escape double quotes by doubling them (`""`)
- End each row with a newline
- Do NOT add a trailing newline after the last row unless the original had one
