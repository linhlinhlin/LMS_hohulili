# Teacher Assessments Context Split

Last updated: 2026-03-11

## Purpose

Define a clear information architecture for `teacher/assessments` that separates:

- course-owned assessment authoring
- class/delivery-owned assessment operations
- shared reusable assets

This is required because the previous hub grouped screens by assessment type (`assignments`, `quizzes`, `rubrics`, `question bank`), while the actual teacher workflows are split by context:

- `Khóa học`: canonical quiz/assignment shells inside curriculum
- `Lớp học`: delivery, submissions, grading, audit, due dates, allocation
- `Dùng chung`: reusable question and rubric assets

## Decision

Use a context-first workspace with three top-level areas:

1. `Khóa học`
2. `Lớp học`
3. `Dùng chung`

The default landing for `/teacher/assessments` is `Lớp học`, because it matches the daily operational intent of teachers.

## Why This Boundary Is Correct

### Course owns canonical content

The course remains the source of truth for:

- quiz shells in curriculum
- assignment prompts in curriculum
- chapter/lesson placement
- default assessment settings for self-paced delivery

This matches the current LMS boundary already documented in:

- `architecture/COURSE_VS_CLASS_LESSON_BOUNDARY.md`

### Class owns delivery overlays

The class layer owns:

- who receives the assessment
- due dates and availability windows
- submissions
- grading
- audit logs
- speed grader workflows

This follows patterns used by major LMS products:

- Open edX separates course pacing and course-run behavior for self-paced vs instructor-paced courses.
- Canvas supports assigning items to everyone, sections, or specific students, and operational grading lives with the assignment runtime rather than the canonical content source.
- Moodle treats question banks as reusable assets rather than mixing them into every quiz runtime surface.

Reference material:

- Open edX: https://docs.openedx.org/en/latest/educators/how-tos/course_development/set_course_pacing.html
- Canvas: https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-assign-an-assignment-to-everyone-individual-students/ta-p/1191
- Canvas: https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-add-or-edit-details-in-an-assignment/ta-p/971
- Moodle: https://docs.moodle.org/en/Question_bank

## Important Clarification

`Lớp học` in this workspace should be interpreted as the runtime delivery workspace, not "only instructor-led records".

That means:

- instructor-led items appear as `Theo lớp`
- self-paced items may still appear here as `Toàn khóa học`
- items that still live in curriculum but are not yet distributed should remain visible as `Chưa phân phối`, rather than being silently mixed into class-running lists

This preserves a single operational workspace for delivery, submissions, and grading, while still making the scope explicit.

That also means detail pages inside the runtime workspace must stay context-aware:

- self-paced items should be framed as `Toàn khóa học`
- instructor-led class items should be framed as `Theo lớp`
- targeted items should be framed as `Theo học viên` or `Theo nhóm học viên`

The runtime shell itself should therefore use neutral operational wording such as `Vận hành`, while the detail page identifies the exact scope of the current item.

## Workspace Structure

### 1. Khóa học

Use this area to answer:

- assessment shell belongs to which course?
- where in curriculum is it anchored?
- how do I jump back into course authoring?

This area should not pretend to be a grading workspace.

Primary actions:

- open course list
- open course editor
- open curriculum
- review authoring guidance for quiz/assignment shells

### 2. Lớp học

Use this area to answer:

- what has been assigned?
- who has submitted?
- what needs grading?
- what is running for a class vs for all enrolled students?

Primary screens:

- assignment list
- quiz list
- submissions
- speed grader
- audit log

### 3. Dùng chung

Use this area for reusable assets only.

Primary screens:

- question bank
- rubric library

Future candidates:

- assignment templates
- feedback snippet library
- grading schemes

## Route Map

Canonical routes:

- `/teacher/assessments` -> redirect to `/teacher/assessments/classes/assignments`
- `/teacher/assessments/courses/overview`
- `/teacher/assessments/classes/assignments`
- `/teacher/assessments/classes/assignments/create`
- `/teacher/assessments/classes/assignments/:id/*`
- `/teacher/assessments/classes/quizzes`
- `/teacher/assessments/classes/quizzes/create`
- `/teacher/assessments/classes/quizzes/create/:courseId`
- `/teacher/assessments/classes/quizzes/:quizId/editor`
- `/teacher/assessments/classes/quizzes/:quizId/essay-grading`
- `/teacher/assessments/shared/question-bank`
- `/teacher/assessments/shared/rubrics`
- `/teacher/assessments/shared/rubrics/create`
- `/teacher/assessments/shared/rubrics/edit/:rubricId`

Backward-compatible redirects should remain for:

- `/teacher/assessments/assignments`
- `/teacher/assessments/quizzes`
- `/teacher/assessments/rubrics`
- `/teacher/assessments/question-bank`
- legacy `/teacher/assignments`
- legacy `/teacher/grading/*`

## Copy and Labeling Rules

Use labels that explain context explicitly:

- `Khóa học`
- `Lớp học`
- `Dùng chung`
- `Toàn khóa học`
- `Theo lớp`
- `Theo học viên`

Avoid labels that blur content placement and delivery scope, for example:

- `Theo bài học` when the UI is actually describing assignment audience
- `Quản lý quiz` without telling the teacher whether it is course authoring or class delivery

## Current Migration Rules

### Keep

- existing backend contracts
- existing assignment detail pages
- existing speed grader and submission views
- existing question bank and rubric APIs

### Change

- route hierarchy
- shell/navigation
- page copy
- context badges and hints
- redirects to correct contexts

### Do Not Do

- clone assessment content per class
- move question bank into class runtime
- present rubric library as if it were class-specific runtime by default
- redesign the whole teacher shell just for this change

## Acceptance Criteria

The workspace is acceptable when:

1. A teacher can immediately tell whether they are in `Khóa học`, `Lớp học`, or `Dùng chung`.
2. `Question Bank` and `Rubric Library` are visibly shared assets.
3. Assignment and quiz lists clearly indicate whether each item is `Theo lớp` or `Toàn khóa học`.
4. Items that are not yet distributed to a class are surfaced as `Chưa phân phối`, not mislabeled as active classroom work.
5. Course authoring flows point teachers back to curriculum/editor instead of pretending to be grading screens.
6. Legacy links continue to resolve through redirects during the migration window.
7. Assignment overview, submissions, and grading screens clearly identify whether the current runtime item is `Toàn khóa học`, `Theo lớp`, or `Theo học viên`.

## Current Quiz Runtime Rule

The `Lớp học` workspace for quizzes currently uses two explicit actions:

- `Mở editor`
- `Chấm tự luận`

This is intentional.

At the moment, the canonical runtime routes are:

- `/teacher/assessments/classes/quizzes/:quizId/editor`
- `/teacher/assessments/classes/quizzes/:quizId/essay-grading`

There is not yet a dedicated quiz runtime detail shell parallel to assignment overview/submissions.
Until that surface exists and is trustworthy, the workspace should stay honest:

- open the canonical quiz editor for content and settings
- open essay grading directly for runtime grading work

Do not introduce a generic `Chi tiết` action for quizzes unless there is a real operational detail workspace behind it.

## Current Quiz Creation Rule In The Operational Workspace

Quiz creation under the operational workspace is now a two-step flow:

1. `/teacher/assessments/classes/quizzes/create`
   - choose the course first
   - establish the correct delivery context before showing quiz settings
2. `/teacher/assessments/classes/quizzes/create/:courseId`
   - choose the chapter anchor in curriculum
   - choose runtime scope
   - `SELF_PACED`: always course-wide
   - `INSTRUCTOR_LED`: course-wide or class-specific

This avoids the previous mismatch where the `Lớp học` workspace pointed to a generic course-shell quiz wizard that did not express runtime scope honestly.

Important behavior:

- self-paced quiz creation does not request class data
- instructor-led quiz creation loads class choices only after the course is known to support class delivery
- canceling from the scoped create screen returns to `/teacher/assessments/classes/quizzes`
