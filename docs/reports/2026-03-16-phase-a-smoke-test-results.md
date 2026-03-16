# Phase A Deploy + Smoke Test Results

> **Date**: 2026-03-16 | **Commit**: `9d7376c` | **Tester**: Claude Code
> **Environment**: Production (holilihu.online)

---

## Deploy Status

| Component | Status | Detail |
|-----------|--------|--------|
| V91 migration (quiz assessment metadata) | PASS | Backend started without error |
| V92 migration (course_publications + version_modes) | PASS | Backend started without error |
| Backend health | PASS | `actuator/health` → `UP` |
| Frontend build | PASS | Angular build succeeded |
| All containers | PASS | backend(healthy) + frontend(healthy) + caddy(healthy) + db(healthy) |

---

## Phase B: Self-paced Smoke

| Test | Result | Detail |
|------|--------|--------|
| B1. List published courses | PASS | 3 courses returned (mmm FREE, huhu PAID, lll PAID) |
| B2. Course content (chapters+lessons) | PASS | 1 chapter, 1 lesson, 2 sections (TEXT + QUIZ) |
| B3. Course versions endpoint | PASS | Returns `contentVersion: 2`, `versionMode: "LEGACY"`, `publicationId: null` |
| B4. Section quiz access (student) | PASS | HTTP 200, quiz title "1.1:", 1 question |

**Note**: Course `a2120d11` has `publicationId: null` and `versionMode: "LEGACY"` — expected for pre-existing courses. New publications will create records in `course_publications` table.

---

## Phase C: Instructor-led Class Smoke

| Test | Result | Detail |
|------|--------|--------|
| C1. List classes (admin) | BLOCKED — 403 | Admin account seems to be ORG_ADMIN, `/api/v3/classes` returns 403 |
| C1. List classes (teacher) | BLOCKED — 403 | Teacher also gets 403 on `/api/v3/classes` |

**Issue**: Classes endpoint returns 403 for both admin and teacher accounts. Possible causes:
- Endpoint requires different role/permission
- Account `admin@maritime.edu` may be ORG_ADMIN not ADMIN
- Classes endpoint may have changed access rules in this deploy

**Action needed**: Team Codex to verify `/api/v3/classes` access control and confirm test accounts have correct roles.

---

## Phase D: Certificate Smoke

| Test | Result | Detail |
|------|--------|--------|
| D1. Certificate eligibility (student) | BLOCKED — 403 | Endpoint `/api/v3/certificates/eligibility` returns 403 |
| D2. Certificate list (student) | BLOCKED — 403 | Endpoint `/api/v3/certificates` returns 403 |
| D2. Certificate list (teacher) | PASS | Returns empty array `[]` (no certificates issued yet — expected) |

**Issue**: Student account cannot access certificate endpoints. May need enrollment check or different endpoint path.

---

## Phase E: Offline Policy Smoke

| Test | Result | Detail |
|------|--------|--------|
| E1. Section quiz metadata | PASS | `quizType: "ASSESSMENT"`, `allowOffline: false` — policy fields present |
| E2. Sync push (empty operations) | EXPECTED 400 | Validation correctly rejects empty operations |
| E3. Sync push (with operation) | PASS | `processed: ?`, `conflicts: 1` — sync endpoint working |

**Key finding**: Quiz in test lesson has `quizType: ASSESSMENT` and `allowOffline: false` — this means the assessment taxonomy from V91 migration is working correctly. Offline policy enforcement will block this quiz offline (correct behavior per architecture).

---

## Summary

| Phase | Status | Blockers |
|-------|--------|----------|
| **A. Deploy** | PASS | None |
| **B. Self-paced** | PASS | None (LEGACY versionMode expected) |
| **C. Instructor-led** | BLOCKED | 403 on `/api/v3/classes` for all test accounts |
| **D. Certificate** | PARTIALLY BLOCKED | 403 for student; teacher list works (empty) |
| **E. Offline policy** | PASS | quizType + allowOffline fields present and correct |

## Regression Check

| Previous Fix | Status |
|-------------|--------|
| Quiz 403 for FREE courses (P0 bug) | PASS — HTTP 200 |
| Search unaccent (Vietnamese diacritics) | Not retested (API-level) |
| Landing page / courses / contact / auth | Not retested (FE) |

## Recommendations for Team Codex

1. **Classes 403**: Verify `/api/v3/classes` endpoint `@PreAuthorize` — test accounts may lack required role
2. **Certificate 403 (student)**: Check if student needs enrollment or if endpoint path changed
3. **LEGACY courses**: Pre-existing courses have `publicationId: null` — confirm this is handled gracefully in FE stale detection
4. **Publication creation**: No course has a publication yet — need to approve a new course or trigger publication for existing courses to test full flow
5. **Sync conflict UX**: Sync push returns conflicts but FE conflict resolution UI is phase 2 per handoff doc
