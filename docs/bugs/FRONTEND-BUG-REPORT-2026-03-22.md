# Frontend Bug Report & Design Consistency Audit

> **Date**: 2026-03-22 | **Branch**: `chore/ui-consistency`
> **Auditor**: Claude Code + Expert Review (9/10)
> **Status**: Design consistency COMPLETE. Codex logic hardening applied for progress, payments, certificates, offline sync, notifications, and messaging recoverability.

---

## PART 1: DESIGN INCONSISTENCIES (166+ instances)

### Color Palette Violations

**Rule (Expert-Adjusted)**:
- Semantic colors (amber=warning, red=error, green=success): **GIỮ**, chuẩn hóa class names
- Non-semantic indigo/cyan: **ĐỔI** sang brand `#0056D2`

#### ALL DONE (Claude Code đã fix toàn bộ):
- [x] `admin-dashboard.component.html` — indigo icon → brand blue
- [x] `student-management.component.html` — 15+ indigo → brand blue
- [x] `teacher-management.html` — indigo links → brand blue
- [x] `course-management.component.html` — indigo focus ring + amber decorative card → brand blue
- [x] `contact.component.html` — cyan AI section → brand blue
- [x] `assignment-work.component.html` — indigo gradient → brand blue
- [x] `lesson-content.component.html` — indigo assignment section → brand blue
- [x] `student-analytics.component.html` — indigo gradient + cyan metric → brand blue
- [x] `notification-bell.component.html` — indigo message type → brand blue
- [x] `course-learning.component.html` — indigo gradient → brand blue
- [x] `home-simple.component.ts` — 7 cyan instances (Wiii AI section) → brand blue
- [x] `mega-menu.component.ts` — cyan button → brand blue
- [x] `student-profile.component.ts` — indigo gradient → brand blue
- [x] `certificate-view.component.ts` — indigo gradient → brand blue
- [x] `course-instructor.service.ts` — indigo badge → brand blue
- [x] `rubric-editor.component.ts` — indigo card → brand blue
- [x] `assignment-audit-log.component.ts` — indigo status → brand blue
- [x] `quiz-result.component.ts` — indigo gradient → brand blue
- [x] `parallax-background.component.ts` — indigo/cyan decorative → brand blue
- [x] `content-type.constant.ts` — indigo SCORM type → brand blue

**Verification**: `grep -r "indigo\|cyan" fe/src/app --include="*.ts" --include="*.html"` = **0 results**

**Semantic amber (warning/pending/offline)**: GIỮ nguyên theo expert rule. Verified in:
  - admin-dashboard (pending card) ✓
  - system-settings (sandbox badge, security warning) ✓
  - login (offline banner) ✓
  - course-learning (paywall, stale offline) ✓
  - student-quiz (offline mode) ✓
  - student-storage (recovery card) ✓

#### No remaining color issues for Team Codex.

**HIGH — Non-semantic indigo → brand blue**:
```
File: teacher-management.html
  - indigo-700, indigo-50, indigo-100 → #0056D2 equivalents
  Pattern: replace_all indigo-600 → bg-[#0056D2], indigo-50 → bg-[#0056D2]/5, etc.

File: course-management.component.html
  - focus:ring-indigo-500 → focus:ring-[#0056D2]
  - amber decorative cards (line 548-558) → check if semantic warning or decorative
    If decorative: → bg-[#0056D2]/5
    If semantic (showing enrollment count): → KEEP amber, it's a "metric" card

File: admin-user-management.component.html
  - Check for any indigo/cyan instances
```

**MEDIUM — Cyan AI section**:
```
File: contact/contact.component.html
  - Lines 100-110: cyan-500, cyan-600, cyan-50, cyan-700
  - Replace: bg-cyan-500/10 → bg-[#0056D2]/10, text-cyan-600 → text-[#0056D2]
  - Rationale: Wiii AI is sub-brand, uses primary blue in LMS context
```

**LOW — Semantic amber (keep but verify)**:
```
Files to VERIFY (not change blindly):
  - admin-dashboard.component.html lines 69-84: "Chờ duyệt" card → KEEP (semantic pending)
  - auth/login.component.html: offline banner → KEEP (semantic warning)
  - learning/course-learning.component.html: paywall banner → KEEP (semantic warning)
  - student/quiz/student-quiz-taking.component.html: quiz timer → KEEP (semantic)
  - admin/system-settings.component.html: status badge → check context
```

### Border Radius Inconsistency (40+ instances)

**Rule**: Cards = `rounded-xl`, Inputs = `rounded-lg`, Buttons = `rounded-lg`

```
Affected files (batch find-replace):
  - courses/courses.component.html: rounded-md → rounded-lg for inputs
  - contact/contact.component.html: rounded-lg inputs (OK for inputs)
  - admin pages: check all card containers have rounded-xl
```

---

## PART 2: CODE BUGS

### HIGH Priority

| # | Bug | File | Line | Fix |
|---|-----|------|------|-----|
| 1 | `.subscribe()` delete without error handler | `course-classes.component.ts` | 224 | DONE (Codex): `catchError()` + toast feedback |
| 2 | Silent error swallow `{ error: () => {} }` | `course-instructor.service.ts` | 134, 161 | DONE (Codex): refresh warning path instead of silent swallow |
| 3 | 107 files use `.subscribe()` — many without error handling | Multiple | — | Audit each; use `takeUntilDestroyed()` + `catchError()` |

### MEDIUM Priority

| # | Bug | File | Fix |
|---|-----|------|-----|
| 4 | `console.log/warn/error` in production | `lms-offline.db.ts`, `storage-manager.service.ts`, `webmcp.service.ts`, `offline-sync.service.ts`, `sw-update.service.ts`, `pwa-repair.service.ts`, `course-download.service.ts` (12+ files) | PARTIAL (Codex): removed low-value noise in `storage-manager` + `webmcp`; keep offline/PWA diagnostics until logger exists |
| 5 | Missing `aria-label` on buttons | `speed-grader.component.ts:28-31`, `adaptive-video-player.component.ts:71-74`, `video-upload.component.ts` | DONE (Codex): labels added; upload zone now keyboard-accessible |
| 6 | 19 files with `addEventListener` — verify cleanup | Layout components, wiii-context, heartbeat-tracker | PARTIAL (Codex): hardened `network-status`, `pwa`, `sw-update`, `global.state`; AI-chat listener audit still pending |

### LOW Priority (Code Quality)

| # | Issue | Count | Files | Fix |
|---|-------|-------|-------|-----|
| 7 | `standalone: true` redundant (Angular 20 default) | 6 files | `speed-grader`, `rubric-creator`, `assignment-audit-log`, `assignment-rubric`, `rubric-editor`, `legacy-section-editor-redirect` | Remove `standalone: true` |
| 8 | Constructor injection instead of `inject()` | 25 files | Teacher grading/assignment components | Migrate to `inject()` |
| 9 | Fixed px widths (responsive risk) | 3 files | `course-users.component.html`, `public-header.component.html`, `course-detail.component.html` | Use Tailwind responsive classes |

---

## PART 3: SOTA UX IMPROVEMENTS (Roadmap)

Based on Angular 21 + LMS UX trends March 2026:

| # | Improvement | Effort | Priority |
|---|-------------|--------|----------|
| 1 | `@defer` blocks for heavy components (curriculum editor, charts) | 0.5 day | High |
| 2 | Virtual scroll (CDK) for admin user/course lists | 1 day | Medium |
| 3 | Card hover lift micro-interactions | 0.5 day | Medium |
| 4 | WCAG 2.5.7: drag-drop alternatives for curriculum editor | 1 day | Medium |
| 5 | Dark mode prep: extract hardcoded colors to CSS vars | 2-3 days | Low |

---

## EXECUTION NOTES

- Claude Code works on `chore/ui-consistency` branch (design fixes only)
- Team Codex works on separate branch for code bugs (after design branch merged)
- **File separation**: Claude touches `.html` only, Codex touches `.ts` only (avoid merge conflicts)
- Verify after each batch: `npx tsc --noEmit`

---

*Report generated from 3 parallel audits: Design consistency (166 findings), SOTA research (10 areas), Bug scan (35+ issues)*

### Codex Validation Notes

- Additional real-data audit fixes completed:
  - `student-quiz-taking.component.ts`: online submit no longer shows results/completion when backend submit fails.
  - `assignment-work.component.ts`: file-upload failures no longer allow an effectively empty submission; partial file loss now warns the learner.
  - `student-grades.component.ts`: certificate load failures no longer fail silently.
  - `certificate-view.component.ts` + `student-profile.component.ts`: verification-token routes are separated from authenticated PDF-download ids.
  - `messaging.service.ts`: conversation/message fetches no longer collapse into fake empty-state success; unread-count parsing now matches backend `data.unreadCount`, and `markAsRead()` rolls back on failure.
- `notification.service.ts`: polling now checks `/api/v3/gamification/notifications/unread-count` and parses backend `data.count`; optimistic read/delete actions now roll back on failure.
- `offline-sync.service.ts`: sync conflicts for `progress` / `videoProgress` now propagate into local Dexie progress records as `syncStatus='conflict'`, `retryFailed()` skips conflict items, and `clearFailed()` no longer deletes conflict rows by accident.
- `student-storage-management.component.ts` + `.html`: offline storage screen now shows conflict-specific status, conflict count, and a dedicated recovery CTA instead of lumping conflicts into generic failed sync items.
- `offline.interceptor.ts`: offline video progress now has local fallback for `track`, `resume`, and `can-proceed`, using queued watched ranges so offline learners do not lose threshold/resume behavior while waiting for reconnect.
- `notification-bell.component.ts` + `.html`: bell dropdown now surfaces API refresh failures, preserves the last known notification list, and offers an explicit retry action.
- `message-input.component.ts`: message drafts are preserved across send failures; retry uses the current draft first and only clears content after server-confirmed success.
- `conversation-view.component.ts` + `messages-tab.component.ts`: composer is now offline-aware, shows a reconnect hint, and returns a specific recoverable error instead of pretending the message is gone.
- `cd fe && npx tsc --noEmit` passed after the Codex patch set.
- Targeted backend truth checks passed: `QuizAttemptUseCaseTest`, `AssignmentControllerV3CreateFlowTest`, `CertificateUseCaseTest`, `StudentEnrollmentControllerV3Test`.
- Local API smoke confirmed real-data response shapes on `/api/v3/student/grades`, `/api/v3/student/assignments/{id}`, `/api/v3/student/assignments/{id}/submission`, `/api/v3/student/certificates`, `/api/v3/messages/unread-count`, `/api/v3/messages/conversations`, `/api/v3/gamification/notifications`, and `/api/v3/gamification/notifications/unread-count`.
- `cd fe && npm run build` now passes after the combined team fixes, so the current FE worktree is buildable again.
