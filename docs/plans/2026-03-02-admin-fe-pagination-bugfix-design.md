# Admin FE Pagination Bugfix Design

> Date: 2026-03-02 | Session: S118 | Priority: P1

## Problem

`teacher-management.component.ts` and `student-management.component.ts` call `adminService.getUsers()` with wrong pagination parameters:

- **Wrong param name**: `size` instead of `limit` (BE `UserControllerV3` expects `limit`, defaults to 10)
- **Wrong page base**: `page: 0` instead of `page: 1` (BE uses 1-based pagination)

Result: Both pages only load 10 users instead of all teachers/students.

## Root Cause

S116 changed these files to pass `role` param but used Spring Data convention (`page/size` 0-based) instead of the project's established convention (`page/limit` 1-based).

Other callers (`user-management.state.ts`, `admin-user-management.component.ts`) already use correct `page/limit` convention.

## Fix

### File 1: `teacher-management.component.ts:92`
```typescript
// BEFORE
this.adminService.getUsers({ page: 0, size: 200, role: 'TEACHER' })
// AFTER
this.adminService.getUsers({ page: 1, limit: 200, role: 'TEACHER' })
```

### File 2: `student-management.component.ts:90`
```typescript
// BEFORE
this.adminService.getUsers({ page: 0, size: 200, role: 'STUDENT' })
// AFTER
this.adminService.getUsers({ page: 1, limit: 200, role: 'STUDENT' })
```

## Scope

- 2 files, 1 line each
- Zero risk — matches existing convention used by 3+ other callers
- No BE changes needed

## Audit Summary (False Positives Eliminated)

| Original Bug | Verdict |
|---|---|
| P1: `size` vs `limit` | **Fix** |
| P1: `page: 0` vs 1-based | **Fix** (same line) |
| P2: Mock chart data | **Not a bug** — no BE daily breakdown API |
| P2: `rejectComment` not signal | **Not a bug** — `[(ngModel)]` needs plain property |
| P2: Unnecessary CommonModule | **Not a bug** — both use `| date`, `| slice`, `[ngClass]` |
