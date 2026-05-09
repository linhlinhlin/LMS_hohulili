<!--
SYNC IMPACT REPORT
==================
Version change: TEMPLATE → 1.0.0 (initial ratification)
Modified principles: N/A (first version — replaced 5 template placeholders with 7 concrete principles)
Added sections:
  - Core Principles (I–VII)
  - Tech Stack & Architectural Constraints
  - Quality Gates & Development Workflow
  - Governance
Removed sections: None (template placeholders replaced)
Templates requiring updates:
  ⚠ pending  .specify/templates/plan-template.md  → "Constitution Check" gate is empty placeholder; needs concrete checklist mapped to Principles I–VII
  ⚠ pending  .specify/templates/spec-template.md  → no constitution-driven mandatory sections added (current template covers user stories, requirements, success criteria — sufficient for v1.0)
  ⚠ pending  .specify/templates/tasks-template.md → may add task categories for ArchUnit/lint/test gates per Principle IV
Follow-up TODOs:
  - When /speckit-plan is first run, populate Constitution Check gate with binary checks against Principles I–VII
  - Consider creating .specify/templates/checklists/architecture-compliance.md aligned with Principle I
==================
-->

# LMS Maritime (holilihu.online) Constitution

> Single source of truth for engineering governance on the Maritime LMS project. Every spec, plan, and PR MUST satisfy the principles below. This file SUPERSEDES individual preferences and ad-hoc conventions.

## Core Principles

### I. Clean Architecture + Domain-Driven Design (Backend) — NON-NEGOTIABLE

The backend MUST enforce strict layer separation:

- Layer order: `domain/` → `application/` → `infrastructure/`. Inner layers MUST NOT import outer layers.
- JPA repositories MUST extend `JpaRepository<XJpaEntity, UUID>` — never `JpaRepository<DomainModel, UUID>`. Violating this triggers Hibernate "Not a managed type" startup failure.
- Domain models in `domain/model/` MUST be pure POJOs: zero `@Entity`, zero JPA annotations, zero framework imports beyond Java standard library + Lombok.
- Repository ports MUST be declared as interfaces in `domain/repository/`. Concrete implementations live as `*Adapter` classes in `infrastructure/persistence/` and convert via dedicated `*Mapper` classes.
- ArchUnit (`CleanArchitectureTest`) is the enforcement boundary. The test suite MUST stay green on every PR.
- Use case naming convention: `Get*UseCase` for read-only paths (allowed direct JPA access via ArchUnit allowlist); `Command*UseCase` / verb-named use cases for writes (MUST go through repository ports). Bypassing the convention requires adding the class to `APPROVED_LEGACY_COMMAND_USE_CASES_WITH_INFRA_DEBT` with explicit justification in the PR.

**Rationale**: This project has shipped 295+ endpoints and 806 tests on this layering. Departures cause cascading "Not a managed type" outages and erode test reliability. The cost of strict adherence is small; the cost of drift is a production restart loop.

### II. Angular 20 Modern Patterns (Frontend) — NON-NEGOTIABLE

Every Angular component, directive, and service MUST conform to the v20 idiom:

- State: `signal()`, `computed()`, `effect()` only. NgRx and other external state libraries are prohibited.
- Change detection: `ChangeDetectionStrategy.OnPush` is mandatory on every component (currently 100% coverage — no regressions allowed).
- Dependency injection: `inject()` function only. Constructor injection is prohibited in new code.
- Inputs/outputs/models: `input()`, `input.required()`, `output()`, `model()` only. Decorator forms `@Input()`, `@Output()` are prohibited.
- View queries: `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()` only. `@ViewChild`, `@ContentChild` are prohibited.
- Control flow: native `@if`, `@for`, `@switch` only. Structural directives `*ngIf`, `*ngFor`, `*ngSwitch` are prohibited.
- `standalone: true` MUST NOT be specified — it is the default in Angular 20+ and explicit declaration is dead code.
- `CommonModule` MUST be imported only when the template uses pipes (`| date`, `| number`, `| currency`, `| slice`, `| async`) or `[ngClass]` / `[ngStyle]`. Otherwise it MUST be omitted to keep bundles minimal.

**Rationale**: 215+ components have been migrated to this idiom with zero legacy patterns remaining. Mixed paradigms increase cognitive load, defeat OnPush optimization, and break tree-shaking.

### III. Security & Multi-tier Authorization

- Authentication MUST use JWT (JJWT 0.12.3) issued by the identity module.
- Authorization roles form a strict hierarchy: `ADMIN` > `ORG_ADMIN` > `TEACHER` > `STUDENT`.
- `@PreAuthorize` annotations MUST include `ORG_ADMIN` wherever `ADMIN` appears, EXCEPT for the three system-only endpoints: `DELETE` user, `DELETE` course, admin settings mutation.
- Business guards MUST prevent `ORG_ADMIN` from creating, modifying, or promoting users to `ADMIN` or `ORG_ADMIN` roles.
- Ownership bypass logic MUST use `isAdminRole(user)` which evaluates `ADMIN || ORG_ADMIN` — never inline role checks.
- All user input MUST be validated at the controller boundary (Bean Validation `@Valid` + custom validators). Domain layer MAY assume valid input.
- Secrets MUST live in environment variables loaded from `.env` (dev) or `.env.prod` (production). Hardcoded secrets, API keys, or credentials in source code or configuration files are prohibited.
- CORS, CSP, and rate limiting are configured centrally in `config/SecurityConfig.java` — feature code MUST NOT relax these globally.

**Rationale**: Past incidents from missing `ORG_ADMIN` on shared endpoints triggered cascading 403s for the operations team. Centralized role rules + a single ownership helper keep authorization debuggable.

### IV. Test & Architecture Gates — NON-NEGOTIABLE

- Backend test suite (`mvn test`) MUST pass 806 of 806 (or current count + new tests for the feature). Failing or skipped tests block merge.
- ArchUnit suite (`CleanArchitectureTest`) MUST stay green. New principle-violating classes require explicit allowlist entries with justification.
- JPA persistence paths MUST be tested against a real PostgreSQL instance (Testcontainers or shared dev DB). Mocking `JpaRepository` is prohibited for persistence-layer tests because mocks have masked production migration failures historically.
- Frontend MUST pass `cd fe && npm run build` (production type check + esbuild) before merge. Type errors block merge.
- Quiz, payment, and identity modules MUST add an integration test for any new endpoint or state transition.

**Rationale**: A blanket "tests must pass" rule is too soft; this project has lost a quarter to mocked tests passing while real Flyway migrations failed in production. Real-DB integration is the only reliable gate.

### V. Vietnamese UX & Audience-Appropriate Language

- All user-facing copy MUST be in Vietnamese with full diacritics ("có dấu"). Plain ASCII Vietnamese is prohibited in production UI.
- Teacher portal copy MUST avoid technical jargon (no "endpoint", "webhook", "DTO", "JWT" exposed to teachers). Write for the maritime educator persona.
- Student portal copy MUST be clear, encouraging, and free of intimidating technical terms.
- Error messages presented to users MUST be actionable (state what to do next), never raw stack traces or backend exception names.
- Admin / system-internal logs MAY use English technical terms.
- Any new copy MUST be reviewed for Vietnamese diacritics correctness before merge.

**Rationale**: The product targets Vietnamese maritime educators and cadets; ASCII Vietnamese reads as broken/unprofessional. Jargon in teacher UI generates support tickets that this small team cannot afford.

### VI. Code Quality Discipline (karpathy-guidelines)

- Changes MUST be surgical: every modified line MUST trace directly to the user request or the bug being fixed.
- Speculative abstractions, "future flexibility" features, and configurability that wasn't requested are prohibited.
- Error handling for impossible scenarios is prohibited. Validate at boundaries; trust internal calls.
- Comments are prohibited unless the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a known bug). Comments that describe WHAT the code does are prohibited.
- Emojis in code, UI text, commit messages, or PR descriptions are prohibited unless the user explicitly requests them.
- Existing style MUST be matched even when the author would personally write it differently.
- Editing existing files is preferred over creating new files. New files require justification (genuinely new module, no reasonable host file exists).

**Rationale**: This codebase has 470+ TS files and 440+ Java files; speculative additions compound rapidly. Karpathy's discipline keeps cognitive surface area bounded and PR review tractable.

### VII. Deploy & Operations Discipline

- Production deploys MUST use `./deploy.sh` or the full `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build` invocation. Bare `docker compose up` is prohibited (causes Postgres password mismatch and backend boot loop).
- Frontend rebuilds on the production VM (currently 4 GB GCP e2 instance) MUST be preceded by `docker system prune -f` to prevent OOM (exit 137).
- Production VM is currently paused (faculty-level milestone, 2026-04-24). Resumption MUST follow `docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md` step-by-step.
- CI/CD (GitHub Actions) builds and pushes images to GHCR on every merge to `main`. The deploy job is gated by the `DEPLOY_ENABLED` repo variable; flipping it to `true` is a deliberate operational action, not a routine merge.
- Force-push to `main`, `--no-verify` commits, and `--force-recreate` Docker rebuilds on the live VM are prohibited without explicit user approval.
- Database migrations MUST be additive Flyway migrations (V1, V2, … sequential). Production runs `ddl-auto: none` — schema changes MUST go through Flyway, never auto-DDL.

**Rationale**: This project has burned multiple hours on auth-mismatch boot loops, OOM-killed builds, and accidental `--force-recreate`. Codifying the recovery procedure prevents repeating the lesson.

## Tech Stack & Architectural Constraints

The following technology choices are PINNED at the constitution level. Changing any of them is a MAJOR version amendment and requires written justification.

**Backend**
- Java 21, Spring Boot 3.2.6, Spring Security 6.x
- PostgreSQL 16 + Flyway 10.x (migrations V1–V74+)
- JJWT 0.12.3, SpringDoc OpenAPI 2.5.0
- AWS SDK S3 v2.25.0 (Cloudflare R2 via S3-compatible API)
- Lombok 1.18.32

**Frontend**
- Angular 20.3, TypeScript 5.x, RxJS 7.x (used for async only — state is signals)
- Sass for styles
- Dexie.js 4.x for IndexedDB (PWA offline)
- Shaka Player 5.x for adaptive video

**Testing**
- JUnit 5, Mockito (allowed for unit-level only — NOT for JPA), AssertJ, ArchUnit

**Deploy & Runtime**
- Docker multi-stage (Node.js 20-alpine for SSR, nginx as reverse proxy on the same image)
- Caddy auto-HTTPS for `holilihu.online`
- GCP Compute Engine (e2-standard-2, region `asia-southeast1-c`)
- Angular SSR via `outputMode: "server"`, Node.js port 4000 + nginx port 80

**Persistence Conventions**
- IndexedDB tables MUST be isolated per user via `[userId+...]` compound keys. Cross-user leaks are a data-integrity bug.
- Cache API stores video binaries via service worker route `/offline-video/{lessonId}`. Range requests are mandatory (no whole-file load into RAM).

## Quality Gates & Development Workflow

Every pull request MUST pass the following gates before merge. These gates are operational expressions of Principles I–VII.

| Gate | Command / Check | Enforces |
|---|---|---|
| Backend test | `mvn test` → 806/806 (+ new tests) green | Principle IV |
| Architecture | `mvn test -Dtest=CleanArchitectureTest` green | Principles I + IV |
| Frontend type check | `cd fe && npm run build` succeeds | Principle II + IV |
| Lint | ESLint + Prettier pass; backend Checkstyle/Spotless pass if configured | Principle VI |
| Vietnamese diacritics | Manual review of any new user-facing copy | Principle V |
| Mobile responsive | Manual smoke on 375 px viewport for new UI | Principle II (UX quality) |
| Security review | `/security-review` slash command for any auth, payment, or input-validation change | Principle III |
| Spec-kit alignment | If feature was developed via spec-kit, `/speckit-analyze` MUST be green | Principle VI |

**Branch & Commit Workflow**
- Feature branches MUST be created via `/speckit-git-feature` (sequential numbering: `001-feature-name`).
- Commits MUST follow the existing project style (Conventional-style optional, but consistent within the branch).
- PRs MUST link to `spec.md` and `plan.md` when developed via spec-kit. Direct fixes (no spec) MUST state in the description why spec-kit was skipped (typically: bug fix < 1 file or trivial polish).

**Self-Review Discipline**
- Authors MUST self-review every PR before requesting review. Self-review covers: diff scope (no orphan changes), error/edge cases for the touched code, and a re-read of the constitution principles relevant to the change.
- Code review by another contributor MAY be waived for trivial changes (typo, copy fix) — but the self-review MUST still be performed.

## Governance

This constitution SUPERSEDES `CLAUDE.md`, individual SKILL files, ad-hoc PR feedback, and any other prior convention. When this document and another source conflict, this document wins.

**Amendment Procedure**
1. Propose the amendment in a PR that touches ONLY `.specify/memory/constitution.md`.
2. Include a Sync Impact Report (HTML comment at top of file) describing version bump, added/modified/removed sections, and downstream templates affected.
3. Apply the propagation checklist: update `.specify/templates/plan-template.md` Constitution Check, update `.specify/templates/spec-template.md` if mandatory sections change, update `.specify/templates/tasks-template.md` if new task categories appear.
4. Get explicit approval from the project owner before merge.
5. Run `/speckit-git-commit` (or manual commit) with message `docs(constitution): amend to vX.Y.Z — <one-line summary>`.

**Versioning Policy** (Semantic Versioning applied to governance)
- **MAJOR**: Backward-incompatible removal or redefinition of a principle (e.g., dropping ArchUnit enforcement, switching frontend framework).
- **MINOR**: New principle added, or material expansion of guidance within an existing principle.
- **PATCH**: Wording clarifications, typo fixes, link updates, non-semantic refinements.

When the bump type is ambiguous, the higher of the candidate bumps MUST be used.

**Compliance Review**
- Every PR reviewer MUST verify constitution compliance. The reviewer is empowered to block merges that violate any non-negotiable principle (I, II, IV).
- Quarterly: the project owner MUST audit the constitution for staleness against actual practice. If practice has drifted from the document, either the document is amended or practice is corrected — drift is not allowed to persist silently.
- Complexity MUST be justified. The Plan template's "Complexity Tracking" section is the place to record any deliberate violation with rationale.

**Runtime Guidance**
- For day-to-day implementation guidance (file paths, conventions, gotchas), refer to `CLAUDE.md` at the repository root.
- For PWA / offline-specific guidance, refer to `docs/PWA_OFFLINE_RESEARCH.md`.
- For frontend gotcha catalog, refer to `docs/reference/FRONTEND_GOTCHAS.md`.
- These runtime guidance documents are subordinate to this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-09 | **Last Amended**: 2026-05-09
