# Teacher Student Management Bugfix Design

## Context

Teacher student management currently has three linked problems:

1. Student detail can fail with `500` because teacher-scoped enrollment checks touch `learningClass` outside an active Hibernate session.
2. The frontend reads the teacher students API with the wrong field names and the wrong pagination shape, so totals, progress, names, and status labels drift from backend truth.
3. Course cards and student management do not consistently communicate what a "student count" means when a learner can belong to multiple classes of the same course.

## Design

### Backend

- Replace lazy teacher-student ownership checks with repository queries that join `learningClass`.
- Reuse the same teacher-scoped enrollment lookup for student detail, export, and status update paths so these flows do not diverge.
- Count course-card students by distinct `studentId` per course instead of raw enrollment rows.
- Keep analytics out of scope for this patch because the current detail page does not depend on the analytics endpoint and proper scoping would require separate query changes.

### Frontend

- Normalize the teacher students API in `student.api.ts` from `ApiResponse<Page<T>>` into flat `data + pagination`.
- Align the management page with backend fields (`name`, `progress`, uppercase enrollment statuses).
- Paginate the top-level `/teacher/students` course list the same way the teacher course management page already does.
- Keep the per-course student table server-paginated, but fix page-size, totals, and filter/status mapping.
- Update the student detail screen to render the normalized status vocabulary instead of the stale `active/inactive/suspended` assumptions.

## UX Notes

- `/teacher/students` stays course-first, but the first screen should no longer dump every course at once.
- Student rows should show the same meaning of status everywhere: active learning, completed, suspended, or other inactive states.
- Course cards and student lists should both talk about unique learners, not raw enrollments.

## Acceptance

- Clicking `Chi tiết` from teacher student management opens the detail page without a server error.
- Teacher student totals and page counts come from backend pagination and match the visible dataset.
- Course cards use distinct learner counts.
- `/teacher/students` top-level list paginates like `/teacher/courses`.
