# Phase B Execution Report Template

> Date: YYYY-MM-DD  
> Tester: Claude Code  
> Environment: Production | Staging | Local  
> Commit / Deploy batch: `<commit>`

## 1. Executive summary

- Overall result: `PASS | PARTIAL | FAIL`
- Scope tested:
  - self-paced refresh
  - instructor-led pinned class
  - practice quiz offline
  - offline progress sync
  - sync conflict
  - certificate exam gating
- Main blockers:
  - blocker 1
  - blocker 2

## 2. Preconditions

- Phase A final verification reviewed: `YES | NO`
- Production health checked: `YES | NO`
- Test data ready:
  - self-paced course: `YES | NO`
  - instructor-led course + class: `YES | NO`
  - practice quiz: `YES | NO`
  - certificate exam: `YES | NO`
  - conflict scenario: `YES | NO`

## 3. Result matrix

| Sub-phase | Result | Short detail |
|---|---|---|
| B1. Self-paced publication refresh | `PASS / PARTIAL / FAIL / BLOCKED` |  |
| B2. Instructor-led pinned class | `PASS / PARTIAL / FAIL / BLOCKED` |  |
| B3. Practice quiz offline | `PASS / PARTIAL / FAIL / BLOCKED` |  |
| B4. Offline progress sync | `PASS / PARTIAL / FAIL / BLOCKED` |  |
| B5. Sync conflict | `PASS / PARTIAL / FAIL / BLOCKED` |  |
| B6. Certificate exam gating | `PASS / PARTIAL / FAIL / BLOCKED` |  |
| B7. Regression pass ngan | `PASS / PARTIAL / FAIL / BLOCKED` |  |

## 4. Detailed findings

### B1. Self-paced publication refresh

- Result:
- Evidence:
  - courseId:
  - publicationId old:
  - publicationId new:
  - contentVersion old/new:
  - screenshot:
- What happened:
- Assessment:
- Action needed from Codex:

### B2. Instructor-led pinned class

- Result:
- Evidence:
  - courseId:
  - classId:
  - publicationId pinned:
  - publicationId adopted:
  - screenshot:
- What happened:
- Assessment:
- Action needed from Codex:

### B3. Practice quiz offline

- Result:
- Evidence:
  - quizId:
  - quizType:
  - allowOffline:
  - queue before/after:
  - screenshot:
- What happened:
- Assessment:
- Action needed from Codex:

### B4. Offline progress sync

- Result:
- Evidence:
  - lessonId:
  - section/video id:
  - queue before/after:
  - server state:
  - screenshot:
- What happened:
- Assessment:
- Action needed from Codex:

### B5. Sync conflict

- Result:
- Evidence:
  - courseId:
  - entityType:
  - entityId:
  - publicationId local/server:
  - conflict payload:
  - screenshot:
- What happened:
- Assessment:
- Action needed from Codex:

### B6. Certificate exam gating

- Result:
- Evidence:
  - enrollmentId:
  - courseId:
  - exam quiz id:
  - countsTowardCertificate:
  - certificate issue response:
  - verify/download response:
  - screenshot:
- What happened:
- Assessment:
- Action needed from Codex:

### B7. Regression pass ngan

- Result:
- Checklist:
  - FREE course section quiz still 200:
  - canonical student endpoints still 200:
  - ASSESSMENT/EXAM still online-only:
  - legacy course still handled gracefully:
- Action needed from Codex:

## 5. Raw failing requests

Chi dien phan nay neu co loi that.

### Failure 1

- Request URL:
- Method:
- Request payload:
- Response status:
- Response headers:
- Response body raw:
- Console error first line:

### Failure 2

- Request URL:
- Method:
- Request payload:
- Response status:
- Response headers:
- Response body raw:
- Console error first line:

## 6. Decision

- Safe to continue to next rollout step: `YES | NO`
- Safe to call Phase B complete: `YES | NO`
- Recommended next move:
  - option 1
  - option 2

## 7. References

- `docs/runbooks/PHASE_B_PUBLICATION_PWA_CHECKLIST.md`
- `docs/runbooks/PWA_OFFLINE_RUNBOOK.md`
- `docs/runbooks/PUBLICATION_REFRESH_RUNBOOK.md`
- `docs/runbooks/SYNC_CONFLICT_RUNBOOK.md`
- `docs/archive/2026-Q1/reports/2026-03-16-phase-a-final-verification.md`
