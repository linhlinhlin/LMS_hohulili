# Course vs Class Lesson Boundary

Date: 2026-03-07
Status: Proposed architecture direction based on current code audit

## Why this document exists

The project now supports two delivery modes:

- `SELF_PACED`: `Khóa học`
- `INSTRUCTOR_LED`: `Lớp học`

The critical product question is not only "which mode enables which screen", but also "which parts of a lesson belong to the course itself, and which parts belong to a class/run built on top of that course".

This document answers that based on the current codebase and recent runtime verification.

## Current code signals

### 1. The course already owns delivery mode

`Course` is the aggregate that defines the mode split:

- `SELF_PACED`: online course, no class management
- `INSTRUCTOR_LED`: class-based course with teacher-led flows

See:

- [Course.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/course_authoring/domain/model/Course.java#L136)

### 2. A lesson is currently course-owned, not class-owned

The authoring model for chapters, lessons, and content blocks is course-centric. Content block management verifies ownership by resolving the course from the lesson, not by resolving a class from the lesson.

See:

- [ManageContentBlockUseCaseV3.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/course_authoring/application/usecase/ManageContentBlockUseCaseV3.java#L108)

### 3. Student progress is course-level

Student progress and lesson completion are resolved by `studentId + courseId`, even though enrollment is backed by a class under the hood. This is a strong signal that learning content should remain course-owned.

See:

- [StudentEnrollmentControllerV3.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/StudentEnrollmentControllerV3.java#L245)

### 4. `SELF_PACED` still uses a hidden default class as infrastructure

The current schema requires enrollments to point to a class, so `SELF_PACED` self-enrollment auto-creates a hidden `DEFAULT` class. This is an infrastructure workaround, not a product feature.

That means:

- a self-paced course should not expose class concepts in the UI
- "class" remains an internal transport/detail for enrollment integrity in self-paced mode

See:

- [SelfEnrollUseCase.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/application/usecase/SelfEnrollUseCase.java#L20)

### 5. Class management is explicitly instructor-led only

Backend and frontend now both enforce that class management belongs only to `INSTRUCTOR_LED`.

See:

- [ClassControllerV3.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/learning_delivery/infrastructure/web/ClassControllerV3.java#L169)
- [course-classes.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/teacher/course-editor/pages/course-classes/course-classes.component.ts#L70)
- [course-editor-layout.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.ts#L61)

### 6. Quiz and assignment shells are lesson-owned, but distribution is mode-dependent

Current implementation already points toward the right split:

- quiz shell is anchored to a lesson
- assignment shell is anchored to a lesson
- `SELF_PACED` uses course-wide distribution
- `INSTRUCTOR_LED` may add class-aware distribution

See:

- [QuizControllerV3.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/infrastructure/web/QuizControllerV3.java#L116)
- [QuizControllerV3.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/infrastructure/web/QuizControllerV3.java#L612)
- [AssignmentControllerV3.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/infrastructure/web/AssignmentControllerV3.java#L348)
- [CreateAssignmentUseCaseV3.java](/E:/Sach/Sua/LMS_hohulili/backend/src/main/java/com/example/lms/assessment/application/usecase/CreateAssignmentUseCaseV3.java#L18)
- [course-curriculum.component.ts](/E:/Sach/Sua/LMS_hohulili/fe/src/app/features/teacher/course-editor/pages/course-curriculum/course-curriculum.component.ts#L924)

## Core architecture decision

The clean boundary should be:

- `Course` owns the canonical lesson structure and lesson content
- `Class` owns delivery overlays on top of that content

In other words:

- a lesson should not be duplicated per class
- a class should not redefine the lesson body
- a class may redefine how that lesson is assigned, scheduled, released, and graded

This matches both the current code direction and the most scalable model for future work.

## What belongs to `Khóa học`

These features should remain course-owned in both delivery modes.

### Canonical learning structure

- chapters
- lessons
- lesson order
- section/content-block order
- lesson content body: video, text, file, attachments

### Canonical assessment shells

- quiz shell attached to a lesson
- quiz title and question set
- assignment shell attached to a lesson
- assignment prompt, instructions, grading rubric defaults, max score defaults

### Product and catalog metadata

- title, description, category, pricing, thumbnail, intro
- publish/approval state
- discoverability and payment rules

### Course-wide learning semantics

- progress model
- completion rules
- certificates or completion badges if added later
- lesson deep-link identity

## What belongs to `Lớp học`

These features should exist only for `INSTRUCTOR_LED`.

### Roster and delivery logistics

- class roster
- teacher assignment to class
- enrollment cap and availability
- semester, start date, end date
- attendance or class meeting records
- live session links and calendar if added later

### Delivery overlays for assessments

- assign this quiz to class A but not class B
- due date for a specific class
- lock date for a specific class
- release window for a specific class
- gradebook and class-level reporting

### Learner access rules follow the delivery overlay

This is the runtime rule that matters most for security:

- the course owns the lesson and the assessment shell
- the class overlay decides whether a given student may actually see or attempt that assessment

That means learner-facing checks must follow the current distribution target, not just raw course enrollment.

Current verified behavior:

- `SELF_PACED`
  - published assignment and quiz access is gated by active course enrollment
  - no class-specific distribution is exposed in product UX
- `INSTRUCTOR_LED` + `ALL_STUDENTS`
  - any actively enrolled student in the course may access the activity
- `INSTRUCTOR_LED` + `CLASS`
  - only students enrolled in the target class may access the activity
- `INSTRUCTOR_LED` + `SPECIFIC_STUDENTS`
  - only explicitly allocated students may access the activity

This rule now applies to:

- student assignment list/detail/submit flows
- student quiz detail/questions/start-attempt flows
- compatibility student submission routes that still exist for older frontend callers

### Communication and teaching features

- announcements per class
- class-specific reminders
- teacher-managed moderation or discussion groups

## Shared lesson, different delivery overlay

This is the most important rule for future changes:

- the lesson itself is shared
- the class decides how that lesson is delivered

Examples:

- The same lesson video belongs to the course in both modes.
- The same assignment prompt belongs to the course in both modes.
- For `INSTRUCTOR_LED`, the due date and target audience may differ by class.
- For `SELF_PACED`, the same lesson activity applies to everyone in the course.

## Quiz creation boundary

One source of confusion in the current codebase is that "quiz" can currently mean different authoring shapes.

These shapes are not equivalent and should stay distinct:

- section-level quiz content inside a lecture lesson
  - this is a content block inside the canonical lesson tree
  - it belongs to the course layer
- lesson-level quiz shell for an existing lesson
  - this is still course-owned content
- chapter-anchored quiz lesson creation
  - this creates a new `QUIZ` lesson under a chapter, then attaches the quiz shell to that lesson
  - this is also course-owned content
- class-aware quiz distribution
  - this does not create a new lesson body for the class
  - it applies a delivery overlay to the shared quiz content

The dangerous mistake is to treat a chapter anchor, a lesson content section, and a class distribution target as if they were the same kind of "section". They are not.

Current runtime audit confirms the contract has now been normalized:

- `/api/v3/quizzes/courses/{courseId}` now uses a canonical request field named `chapterId`
- the backend still accepts the legacy alias `sectionId` for backward compatibility while callers are being cleaned up
- this keeps chapter anchors distinct from lesson content sections and class distribution targets

The older `/api/v3/quizzes/sections/{sectionId}` route is now only a legacy alias for chapter-anchored quiz creation. The canonical route is `/api/v3/quizzes/chapters/{chapterId}`.

## Why cloning lessons per class is the biggest mistake

Cloning lessons per class looks convenient at first, but it breaks the model in almost every important dimension.

### 1. It duplicates canonical content

If class A and class B each receive their own copied lesson tree, every later edit becomes a fan-out problem:

- fix one typo in the lesson body
- update one video URL
- add one missing section
- correct one quiz question

Every edit now needs synchronization across copies. In practice, those copies drift.

### 2. It mixes content ownership with delivery ownership

The lesson body is course content. Class-specific concerns are delivery concerns.

If class-specific dates, release windows, or roster targeting are stored by copying the lesson instead of overlaying delivery settings, the system can no longer answer a simple question cleanly:

- what is the canonical lesson?
- what is only a class-specific override?

That ambiguity spreads into APIs, UI copy, reporting, and future migrations.

### 3. It conflicts with the current codebase model

Today the project already treats:

- lessons and sections as course-owned
- progress as course-level
- class as a delivery structure

Cloning lessons per class would push the implementation against its own current invariants and create more compatibility code everywhere else.

### 4. It leaks infrastructure details into the product model

`SELF_PACED` already keeps a hidden default class only because the schema still needs a class-backed enrollment row.

If lessons are cloned per class, that hidden infrastructure class starts to become a fake product concept. That is backwards: infrastructure should adapt to the product model, not redefine it.

### 5. It makes analytics and grading harder, not easier

Once lessons are cloned, reports must answer:

- is this the same lesson across classes or a different lesson record?
- should completion aggregate by original lesson or by cloned lesson?
- how should question statistics roll up across cloned quizzes?

This creates needless fragmentation in analytics, gradebook, and learner progress history.

### 6. It makes future UX worse

Teachers usually think:

- "I want to update the lesson once"
- "I want lớp A and lớp B to receive it differently"

They do not naturally think:

- "I want two separate copies of the lesson and I will remember to keep them aligned forever"

So cloned lessons force the product away from the teacher's mental model.

## The safer alternative

The better rule is:

- keep one canonical lesson tree at the course layer
- add delivery overlays at the class layer

Examples of overlays:

- assign the same assignment only to class A
- give class B a later due date
- release the same quiz to one class earlier than another
- keep one shared lesson body, one shared quiz shell, but different targets and schedules

## Recommended future feature matrix

| Capability | `Khóa học` | `Lớp học` |
|------------|------------|-----------|
| Chapter / lesson / section authoring | Owns it | Reads it |
| Lesson content editing | Owns it | Never duplicates it |
| Quiz question bank and quiz shell | Owns it | Can assign/schedule it |
| Assignment prompt and rubric defaults | Owns it | Can assign/schedule/grade it |
| Release schedule | Optional course-wide default | Can override per class |
| Due dates | Optional course-wide default | Can override per class |
| Enrollment | Self-enroll or product-level entry | Roster-level membership |
| Progress tracking | Course-wide | Aggregates by class, but does not redefine lesson identity |
| Gradebook | Not needed for pure self-paced baseline | Owns it |
| Attendance / live sessions | No | Owns it |

## What should not happen

Avoid these patterns:

- creating a separate lesson copy for each class
- storing class-specific dates directly on the lesson if multiple classes may exist
- exposing hidden default classes in self-paced UX
- letting self-paced flows call class APIs
- keeping mutation APIs keyed by `lessonId` when a real resource id such as `quizId` already exists

## Current project gaps

The codebase is moving in the right direction, but these areas are still transitional:

- quiz management still keeps compatibility endpoints by `lessonId`
- section editor and reorder flows still need full verification across both modes
- UI wording still does not make the course-vs-class overlay distinction explicit enough
- assignment and quiz editing still need a clearer model for "course default" versus "class override"

## Recommended next implementation steps

1. Keep `lesson` as the canonical content container for both modes.
2. Introduce explicit class-delivery overlays for dates, allocation, and grading rather than mutating lesson semantics.
3. Continue normalizing quiz authoring APIs toward `quizId`.
4. Add explicit UI labels:
   - `Nội dung khóa học`
   - `Phân phối theo lớp`
   - `Mặc định toàn khóa học`
5. Verify section editing and reorder with the same boundary in mind.

## External reference points

These references support the direction above:

- Open edX documentation distinguishes instructor-paced scheduling from self-paced learning schedules and keeps pacing at the course-run layer: https://docs.openedx.org/en/latest/educators/how-tos/course_development/set_course_pacing.html
- Open edX course pacing reference describes instructor-paced dates versus self-paced suggested due dates: https://docs.openedx.org/en/open-release-sumac.master/educators/references/setting_course_pacing.html
- Canvas uses sections/classes and differentiated assignments on top of shared course content: https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-assign-an-assignment-to-an-individual-student/ta-p/1191
- Canvas course settings expose sections as enrollment-management and delivery structure inside a course: https://community.canvaslms.com/t5/Instructor-Guide/How-do-I-use-course-settings/ta-p/1267
