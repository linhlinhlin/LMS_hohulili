# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` v1.0.0. Mark each gate ✅ pass / ❌ fail / N/A.

| # | Gate (mapped to Principle) | Verdict | Notes |
|---|----------------------------|---------|-------|
| 1 | **I — Clean Architecture/DDD**: Backend changes respect `domain/ → application/ → infrastructure/` boundaries; JPA repos use `*JpaEntity`, not domain models; new write use cases follow `Command*` naming or are added to ArchUnit allowlist with justification. | | |
| 2 | **II — Angular 20 idiom**: New components use signals + OnPush + `inject()` + `input()`/`output()` + native control flow; no `standalone: true` declared; `CommonModule` imported only when pipes/[ngClass] used. | | |
| 3 | **III — Security & RBAC**: Any new endpoint includes `@PreAuthorize` with correct role(s); `ORG_ADMIN` included by default unless system-only; ownership checks via `isAdminRole()`; user input validated at controller boundary; no secrets in source. | | |
| 4 | **IV — Test/architecture gates**: New tests added for new behavior; `mvn test` + `CleanArchitectureTest` + `npm run build` all green; persistence-layer tests use real DB (no JPA mocks). | | |
| 5 | **V — Vietnamese UX**: Any user-facing copy is Vietnamese with full diacritics; teacher-portal copy is jargon-free; error messages are actionable. | | |
| 6 | **VI — Surgical changes**: Diff is scoped to the feature; no speculative abstractions/features; no comments unless WHY is non-obvious; no emojis; existing files preferred over new ones. | | |
| 7 | **VII — Deploy discipline**: Migrations are additive Flyway; no `ddl-auto: update` in prod; no force-push / `--no-verify` / `--force-recreate` in the workflow; runbook references included if touching deploy path. | | |

If any gate is ❌ fail, document the violation in **Complexity Tracking** below with rationale. Persistent failure on a non-negotiable principle (I, II, IV) blocks merge.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
