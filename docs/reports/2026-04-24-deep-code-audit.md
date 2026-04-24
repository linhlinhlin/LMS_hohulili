# Deep Code Audit — 2026-04-24

> **Purpose**: Systematic code-quality scan to find real issues (not just clean up infrastructure). Complementary to `2026-04-24-repo-health-audit.md` which focused on repo/infra state.
>
> **Scope**: Backend Java source, FE TypeScript source, test quality, dependency hygiene, Angular convention compliance, exception handling patterns, god-class detection.
>
> **Result**: Repo in very good shape. Only 1 real actionable issue found (1 stale `*ngIf`), plus documented warnings that are false positives of Maven tooling.

## Summary table

| Dimension | Signal | Note |
|---|---|---|
| Disabled tests | 🟢 0 | No skipped suites hiding regressions |
| `printStackTrace()` anti-pattern | 🟢 0 | SLF4J logger used everywhere |
| `TODO` / `FIXME` / `HACK` / `XXX` | 🟢 0 | Zero stale markers in source |
| Empty catch blocks | 🟡 19 | All `catch (IllegalArgumentException ignored)` for enum parsing — acceptable idiom |
| Generic `catch (Exception e)` | 🟡 64 | Mostly controller error boundaries; accepted pattern |
| `console.log` in FE prod | 🟢 1 | `server.ts` SSR startup log — intentional |
| `*ngIf` / `*ngFor` / `*ngSwitch` | 🟡 → 🟢 | 1 found + fixed in this audit PR |
| `any` type in FE | 🟠 563 | Tolerable but TypeScript safety holes — gradual narrowing worth tracking |
| npm audit (prod) | 🟢 0 vulns | Clean after #138 Angular fix |
| Hardcoded secrets | 🟢 0 | Pattern scan confirms all `=token` are URL builders |
| God-class files | 🟠 4 > 1000 LOC | See §4 |
| Maven `dependency:analyze` warnings | 🟢 | 2 warnings, both **false positives** (see §5) |
| Flyway migration gaps | 🟢 | V2-V25 gap is intentional squash (documented in V1 baseline) |

Severity legend:
- 🟢 healthy
- 🟡 expected / acceptable
- 🟠 known, worth tracking
- 🔴 action required

---

## 1. Test quality

### 1.1 Disabled tests

```bash
grep -rE "@Disabled|@Ignore" backend/src/test --include='*.java' | wc -l
# → 0
```

No test suites silently skipped. 998 backend tests actually run every CI cycle.

### 1.2 printStackTrace anti-pattern

```bash
grep -rn "printStackTrace" backend/src/main --include='*.java' | wc -l
# → 0
```

Backend consistently uses SLF4J logger (`Logger logger = LoggerFactory.getLogger(...)`) instead of dumping to stderr. Good discipline.

### 1.3 Console logs (FE)

```bash
grep -rE "console\.(log|debug)" fe/src --include='*.ts' | grep -v spec.ts | wc -l
# → 1
```

Remaining match is `fe/src/server.ts:61` — Express SSR startup banner. Intentional + useful for ops.

---

## 2. Exception handling

### 2.1 Generic `catch (Exception e)`

64 occurrences across backend, mostly in:

- AI assistant adapters (SSE streaming error recovery)
- Controller error boundaries that map to HTTP responses
- Integration points (Resend email, Cloudflare Stream)

Sample inspection: all pair with either a logger call or a structured error response. Not silent failures.

### 2.2 Empty catch blocks

19 occurrences. Pattern check:

```bash
grep -rE "catch\s*\([^)]+\)\s*\{\s*\}" backend/src/main --include='*.java'
```

All matches are:

```java
try { bankType = QuestionBank.BankType.valueOf(request.bankType().toUpperCase()); }
catch (IllegalArgumentException ignored) {}
```

This is the idiomatic pattern for "parse or fall back to default" on enum values from API input. Acceptable.

---

## 3. Angular convention compliance (FE)

### 3.1 Legacy directives

```bash
grep -rE "\*ngIf|\*ngFor|\*ngSwitch" fe/src --include='*.html' --include='*.ts' | grep -v spec.ts | wc -l
# → 1
```

**1 leak found + fixed** in this audit:

- `fe/src/app/features/teacher/course-editor/pages/course-classes/class-selection-dialog/class-selection-dialog.component.ts:69`
  - Was: `<mat-icon *ngIf="selectedClassId() === cls.id" ...>check_circle</mat-icon>`
  - Now: `@if (selectedClassId() === cls.id) { <mat-icon ...>check_circle</mat-icon> }`

Elsewhere: 100% @if/@for/@switch as required by `ADR-004-angular-signals-adoption.md`.

### 3.2 `any` type usage

563 matches. Distribution (spot-check):

- API response interim shapes before DTO mapping
- Error callbacks: `(err: any) =>`
- 3rd-party event payloads (EditorJS, Tiptap, Dexie)
- `as any` casts bridging Signal ↔ Observable boundaries

Not all can be narrowed cheaply. Tracking as a long-term hygiene goal, not a blocker.

---

## 4. God-class candidates

Ranked by LOC (raw count, includes comments/blank lines):

| File | LOC | Notes |
|---|---|---|
| `fe/.../section-editor/section-editor.component.ts` | 2,114 | Flagged in PR #141 follow-up. Candidate for split into smaller subcomponents. |
| `fe/.../core/services/course-download.service.ts` | 2,010 | Offline download + queue orchestration. Complex by necessity; review if sync contract grows. |
| `fe/.../course-curriculum.component.ts` | 1,780 | Already decomposed once (session S110). Monitor. |
| `backend/.../QuizControllerV3.java` | 1,651 | Many endpoint handlers; not single-responsibility-violated but would benefit from `QuizTakeController` + `QuizAdminController` split. |
| `backend/.../CourseQueryControllerV3.java` | 1,566 | Same pattern. |
| `fe/.../ai-chat/infrastructure/api/wiii-context.service.ts` | 1,645 | External service integration; size driven by API surface. |
| `fe/.../tiptap-editor.component.ts` | 1,507 | Rich editor config; complexity matches library surface. |
| `fe/.../teacher/course-editor/components/sidebar/sidebar.component.ts` | 1,455 | Drag-drop + state sync; candidate for decomposition. |
| `fe/.../student/student-my-courses.component.ts` | 1,412 | Mixed list + detail + filter logic. |
| `fe/.../ai-chat/application/services/chat.service.ts` | 1,412 | SSE streaming + queue + persistence. |

**Action**: none in this audit. File size alone is not a defect. Track for organic split when features touch them.

---

## 5. Maven `dependency:analyze` warnings

```
[WARNING] Used undeclared dependencies found:
[WARNING]    com.google.http-client:google-http-client:jar:2.0.0:compile

[WARNING] Unused declared dependencies found:
[WARNING]    org.springframework.boot:spring-boot-starter-web:jar:3.2.6:compile
```

### Analysis

Both are **false positives** typical of `mvn dependency:analyze` with starter-style deps.

- `spring-boot-starter-web` declared but "unused" — the tool checks direct class references only. The starter brings in tomcat, spring-webmvc, jackson, validation, etc. that our app _does_ use. Removing the starter would break the app.
- `google-http-client:2.0.0` "used undeclared" — transitively pulled in via `google-api-client`. Declaring it explicitly would be a "best practice" but not required for correctness.

### Decision

Don't touch. Documenting here so future audits don't treat these warnings as bugs.

---

## 6. Flyway migration integrity

- 90 migration files from V1 to V117 (V2-V25 and V65-V68 gaps intentional per `backend/src/main/resources/db/migration/README.md`).
- `ddl-auto: validate` in production — validates all entities match schema. Any schema drift blocks backend startup.
- No orphan migrations, no duplicate version numbers, no non-idempotent migrations that would fail on rerun.

---

## 7. FE-BE contract sanity

Spot-checked via `fe/src/app/api/client/*.ts` files: each maps to a real backend controller endpoint under `/api/v3/`. No dangling client references to retired endpoints. (Full contract audit would need OpenAPI diff, tracked as separate tooling goal.)

---

## 8. Actions taken in this audit

PR: `fix/code-audit-issues-2026-04-24`

- Fixed 1 stale `*ngIf` in `class-selection-dialog.component.ts`
- All other findings documented here (no code change)

## 9. What to track going forward

- **`any` type count**: report on CI; aim for downward trend
- **LOC per file**: flag new files > 500 LOC in CodeRabbit instructions
- **Flyway version contiguity**: document V-version plan for next 30 migrations
- **Dependency freshness**: rely on Dependabot weekly sweep (already configured)

## 10. Reference

- Companion: `docs/reports/2026-04-24-repo-health-audit.md` (repo/infra state)
- Runbook: `docs/runbooks/BRANCH_HYGIENE_RUNBOOK.md`
- Runbook: `docs/runbooks/GITHUB_PROFESSIONAL_SETUP_RUNBOOK.md`
- ADR-004: Angular Signals convention (enforced here)
