# Student Course-First Experience

## Purpose

Define the canonical student-side information architecture after the teacher-side split between `Khóa học`, `Lớp học`, and `Dùng chung`.

The student experience must not mirror the teacher workspace. Learners should navigate by learning intent:

- what I am learning
- what I need to do next
- what results and feedback I already received

Class context should appear only when a course runs in `INSTRUCTOR_LED` mode.

## Product Boundary

### Canonical student structure

- `Khóa học của tôi`
  - primary landing area
  - course-first hub
  - continue learning, recent progress, enrolled-course list
- `Bài cần làm`
  - cross-course operational inbox
  - currently assignment-first
  - quizzes remain launched from course learning flow until a dedicated quiz inbox is justified
- `Kết quả`
  - cross-course results and certificates
  - review surface, not operational inbox
- `Học trong khóa`
  - canonical learning shell under `/student/learn/course/:courseId`

### What students should not see

- no top-level `Dùng chung`
- no teacher-style runtime split between `Khóa học` and `Lớp học`
- no class-management vocabulary on self-paced flows

## Why this model

The codebase already treats lessons as canonical course-owned content, while classes are delivery overlays. Student IA should follow that same product truth:

- `SELF_PACED`: students experience a course, not a class shell
- `INSTRUCTOR_LED`: students still learn through the course, but with class-aware deadlines, grading, and operational context

This aligns with common LMS patterns:

- Canvas keeps course/modules as the main learner navigation surface, while assignments and grades are complementary surfaces:
  - https://community.canvaslms.com/t5/Student-Guide/tkb-p/student
- Open edX learner navigation remains course-centric, with outline and progress as the primary structure:
  - https://docs.openedx.org/en/latest/learners/
- Moodle learner flows also center around enrolled courses, then assignments/grades as supporting views:
  - https://docs.moodle.org/

## Route Map

### Canonical routes

- `/student`
  - redirect to `/student/courses`
- `/student/courses`
  - student learning hub
- `/student/courses/library`
  - full enrolled-course list
- `/student/courses/:id`
  - course detail and course-specific entry point
- `/student/tasks`
  - assignment inbox across courses
- `/student/tasks/:id/work`
  - assignment work screen
- `/student/results`
  - grades and certificates
- `/student/learn/course/:courseId`
- `/student/learn/course/:courseId/lesson/:lessonId`

### Compatibility redirects

- `/student/dashboard` -> `/student/courses`
- `/student/my-courses` -> `/student/courses/library`
- `/student/course/:id` -> `/student/courses/:id`
- `/student/assignments` -> `/student/tasks`
- `/student/assignments/:id/work` -> `/student/tasks/:id/work`
- `/student/grades` -> `/student/results`

## Ownership Matrix

### `Khóa học của tôi`

Owns:

- continue learning
- in-progress vs completed course grouping
- course progress
- course delivery badge (`Khóa học` / `Lớp học`)
- jump into canonical learning shell

Does not own:

- grading operations
- shared assets

### `Bài cần làm`

Owns:

- assignment inbox across enrolled courses
- due date and urgency
- submission state
- class overlay when assignment is class-scoped

Current rule:

- this inbox is assignment-first
- quizzes are still entered from course learning because current student quiz APIs are attempt-oriented, not inbox-oriented

### `Kết quả`

Owns:

- per-course grade summary
- assessment outcomes
- certificates
- class overlay where needed for instructor-led results

### `Học trong khóa`

Owns:

- lesson navigation
- course outline
- quiz launch and assignment launch in lesson context
- self-paced vs instructor-led context hints

## UI Rules

### Global

- use a compact, high-trust workspace tone
- prioritize scanability over hero/dashboard theatrics
- top-level student nav should reflect `Khóa học của tôi`, `Bài cần làm`, `Kết quả`
- keep `Khám phá`, `Tin nhắn`, `Lưu trữ ngoại tuyến`, `Thanh toán` as secondary utilities

### Self-paced

- never expose class-management language
- show audience as course-wide when needed
- use `Khóa học`, `Toàn khóa học`, `Toàn bộ học viên đã ghi danh`

### Instructor-led

- show class context only on operational or results surfaces
- use `Lớp học`, `Theo lớp`, `<tên lớp>` only when the current item is actually class-scoped

## Implementation Slices

1. Route and shell normalization
2. Student navigation normalization
3. Task inbox honesty and class/course context
4. Results page honesty and class/course context
5. Course hub and course detail consistency
6. Browser verification for both `SELF_PACED` and `INSTRUCTOR_LED`

## Acceptance Criteria

- a student understands the app within a few seconds:
  - what I am learning
  - what I need to do next
  - where to review results
- self-paced flows do not leak class jargon
- instructor-led flows show class context only where it matters
- legacy URLs still resolve cleanly
- task inbox and results page do not contradict the course/class boundary

## Current Runtime Snapshot

As verified on the local Docker runtime on 2026-03-11:

- canonical student routes are active:
  - `/student/courses`
  - `/student/courses/library`
  - `/student/tasks`
  - `/student/results`
- legacy redirects still land on the canonical route family:
  - `/student`
  - `/student/dashboard`
  - `/student/my-courses`
  - `/student/assignments`
  - `/student/grades`
- the student shell no longer mounts the AI assistant surfaces during normal learner navigation, reducing blank-screen risk and removing an unrelated source of runtime noise from learner pages
- course detail now derives enrolled-state from learner progress access:
  - enrolled learners no longer see the incorrect `Đăng ký ngay để bắt đầu học` CTA
  - enrolled learners now see progress + `Bắt đầu học` / `Tiếp tục học` instead
- learner boundary has been verified on real pages:
  - self-paced course detail shows the `Khóa học` badge and does not surface class-only vocabulary
  - instructor-led course detail shows the `Lớp học` badge
  - `Bài cần làm` mixes `Toàn khóa học` and `Lớp: <tên lớp>` honestly in the same inbox
  - `Kết quả` remains a cross-course review surface rather than a class-runtime workspace
