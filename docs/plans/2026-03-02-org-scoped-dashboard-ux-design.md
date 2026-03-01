# ORG_ADMIN Org-Scoped Dashboard + Admin UX Polish — Design

> **Date**: 2026-03-02 | **Session**: S117 | **Status**: Approved

## Goal

Make ORG_ADMIN dashboard show only their organization's data (not system-wide), and add UX improvements: bulk approve/reject, CSV export, advanced filters.

## Architecture

Same endpoints, BE auto-scopes by role (Canvas/Moodle pattern). FE unchanged for dashboard — response shape identical. New FE features for bulk actions, export, filters.

## Part A: BE — Org-Scoped Analytics

**File**: `AdminCoursesControllerV3.java` → `getCourseAnalytics()`

Add `@AuthenticationPrincipal UserJpaEntity currentUser`. If `isOrgAdmin(currentUser)`:
- Get org members via `findByOrganizationId(orgId)`
- Split by role → teacher IDs, student IDs, admin count
- Course counts: filter by `teacherIdIn(teacherIds)` per status
- Revenue: sum payments for org courses only
- Enrollments: count for org courses only

New JPA queries:
- `CourseRepository`: `countByStatusAndTeacherIdIn(status, Set<UUID>)`
- `PaymentTransactionJpaRepository`: `sumRevenueByTeacherIds(Set<UUID>)` + monthly variant
- `EnrollmentRepository`: `countByCourseIdIn(List<UUID>)`

Response shape unchanged — FE needs zero changes for this.

## Part B: BE — Org-Scoped User List

**File**: `UserControllerV3.java` → `getUsers()`

Add `@AuthenticationPrincipal`. If ORG_ADMIN → filter users to same `organizationId`.

New JPA queries:
- `findByOrganizationIdAndRole(UUID, UserRole, Pageable)`
- `searchByOrganizationIdAndKeyword(UUID, String, Pageable)`

## Part C: BE + FE — Bulk Approve/Reject

**BE**: New endpoints in `AdminCoursesControllerV3`:
- `PATCH /api/v3/admin/courses/bulk-approve` — `{ courseIds: UUID[], comment: String }`
- `PATCH /api/v3/admin/courses/bulk-reject` — `{ courseIds: UUID[], reason: String }`
- Sequential processing, collect errors, return summary
- ORG_ADMIN: verify each course's teacher is in their org

**FE** (`course-management.component.ts`):
- `selectedCourses` signal (Set<string>)
- Checkbox column + select-all header
- Bulk action toolbar (appears when selection > 0)
- "Duyệt (X)" / "Từ chối (X)" buttons with ConfirmDialog
- Toast: "Đã duyệt X/Y khóa học"

## Part D: FE — CSV Export

Pure FE — no BE changes.

**Utility**: `exportToCsv(headers, rows, filename)` in shared utils.
- BOM prefix for Excel UTF-8 compatibility
- `Blob` + `URL.createObjectURL` + click download

**User list**: "Xuất CSV" button → `users_YYYY-MM-DD.csv`
- Columns: Email, Họ tên, Vai trò, Trạng thái, Ngày tạo

**Course list**: "Xuất CSV" button → `courses_YYYY-MM-DD.csv`
- Columns: Mã, Tên, Giảng viên, Trạng thái, Học viên, Ngày tạo

## Part E: BE + FE — Advanced Filters

**Course Management**:
- Category filter: dropdown from `GET /api/v3/categories`
- Date range: fromDate / toDate inputs
- BE: add optional `@RequestParam categoryId, fromDate, toDate` to `getAllCourses()`
- New JPA: `findByStatusAndCategoryIdAndCreatedAtBetween(...)` (or dynamic query)

**User Management**:
- Organization filter: dropdown (ADMIN only)
- Date range: fromDate / toDate for user creation date
- BE: add optional `@RequestParam organizationId, fromDate, toDate` to `getUsers()`

## Files Summary

### Backend Modified (4 files)
| File | Changes |
|------|---------|
| `AdminCoursesControllerV3.java` | Org-scoped analytics, bulk endpoints, date/category params |
| `UserControllerV3.java` | Org-scoped user list, date/org filter params |
| `CourseRepository.java` | New count/filter queries |
| `PaymentTransactionJpaRepository.java` | Revenue by teacher IDs |

### Frontend New (1 file)
| File | Purpose |
|------|---------|
| `fe/src/app/shared/utils/csv-export.ts` | `exportToCsv()` utility |

### Frontend Modified (4 files)
| File | Changes |
|------|---------|
| `course-management.component.ts` | Bulk select, bulk actions, CSV export, category/date filters |
| `users-table.component.ts` | CSV export button |
| `user-management.state.ts` | Date/org filter signals |
| `admin.service.ts` | Bulk approve/reject methods, filter params |

## Implementation Order

1. BE: Org-scoped analytics (Part A)
2. BE: Org-scoped user list (Part B)
3. BE: Bulk approve/reject endpoints (Part C-BE)
4. BE: Advanced filter params (Part E-BE)
5. Build verification: `docker compose build api`
6. FE: CSV export utility (Part D)
7. FE: Bulk actions UI (Part C-FE)
8. FE: Advanced filters UI (Part E-FE)
9. Build verification: `npx ng build`
