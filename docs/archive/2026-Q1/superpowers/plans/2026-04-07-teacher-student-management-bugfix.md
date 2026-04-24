# Teacher Student Management Bugfix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix incorrect teacher student counts, restore student detail, and make teacher student management pagination consistent.

**Architecture:** Patch the backend first so teacher-scoped student queries all use join-based enrollment lookups and distinct learner counts. Then normalize the frontend teacher-student API contract and reuse the course-management pagination pattern on the teacher student screen.

**Tech Stack:** Spring Boot, Spring Data JPA, Angular 20, RxJS, Signals

---

### Task 1: Lock teacher-scoped enrollment queries

**Files:**
- Modify: `backend/src/main/java/com/example/lms/learning_delivery/infrastructure/persistence/JpaEnrollmentRepository.java`
- Modify: `backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/TeacherStudentControllerV3.java`
- Modify: `backend/src/main/java/com/example/lms/course_authoring/infrastructure/web/TeacherCoursesControllerV3.java`

- [ ] Add repository queries for teacher-scoped student existence and teacher-scoped student enrollments with `JOIN FETCH`.
- [ ] Update teacher student detail verification to use the new repository methods instead of touching lazy `learningClass`.
- [ ] Reuse the same scoped enrollment lookup in export and status update paths.
- [ ] Change teacher course learner counts to count distinct students per course.

### Task 2: Normalize teacher student frontend data flow

**Files:**
- Modify: `fe/src/app/api/client/student.api.ts`
- Modify: `fe/src/app/api/types/common.types.ts`

- [ ] Convert `getTeacherStudents()` to unwrap `ApiResponse<Page<StudentSummary>>` correctly.
- [ ] Fix request params so UI page size reaches backend as `size`.
- [ ] Normalize backend statuses into a typed frontend vocabulary that matches real enrollment states.

### Task 3: Repair teacher student UI behavior

**Files:**
- Modify: `fe/src/app/features/teacher/students/student-management.component.ts`
- Modify: `fe/src/app/features/teacher/students/student-detail.component.ts`

- [ ] Replace stale field mapping (`fullName`, `progressPercentage`) with normalized student summary data.
- [ ] Add client-side pagination for the top-level `/teacher/students` course list using the same footer interaction as `/teacher/courses`.
- [ ] Keep per-course student table paginated, but wire totals, page-size, and status badges to the normalized data.
- [ ] Update the detail page status text/badges to accept the corrected backend values.

### Task 4: Verify locally

**Files:**
- Test: `backend` controller path `/api/v3/teacher/students`
- Test: `backend` controller path `/api/v3/teacher/students/{studentId}`
- Test: `fe/src/app/features/teacher/students/student-management.component.ts`

- [ ] Rebuild or restart the affected local services if needed.
- [ ] Confirm teacher login can list students with correct totals and page counts.
- [ ] Confirm teacher can open one student detail page successfully.
- [ ] Run a focused frontend build or other available verification for touched files.
