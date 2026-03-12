# Authoring and Runtime Status

Date: 2026-03-07
Status: Current implementation snapshot

This document is the current source of truth for the recent platform hardening and teacher authoring work. It summarizes what has already been implemented, what has been verified on the Docker runtime, and what remains in the next wave.

## Scope

This snapshot covers:

- root runtime and Docker/CI/CD hardening
- teacher course creation and course editor flows
- `SELF_PACED` vs `INSTRUCTOR_LED` delivery-mode separation
- quiz and assignment authoring behavior
- recent security and admin fixes that changed behavior
- student course-first learner routing and assessment/runtime boundary

## Major Changes Completed

### 1. Runtime and DevOps baseline

- Root `docker-compose.yml` with `docker-compose.dev.yml` and `docker-compose.prod.yml` is the only supported runtime topology.
- Legacy Compose files under `backend/` were retired.
- Docker services were hardened with health checks, log rotation, `init`, and safer defaults.
- GitHub Actions `ci.yml` and `deploy.yml` were hardened and aligned with the root runtime topology.
- The local dev stack now runs as a single `lms` project with:
  - frontend on `http://localhost:4200`
  - backend on `http://localhost:8088`
  - backend container internal port `8080`

### 2. Course creation and login flow

- Login now respects `returnUrl` and safe internal redirects, so deep-link entry into authoring routes works.
- Course creation no longer fails because of the `courses.category_id` foreign-key mismatch; the migration `V75__align_courses_category_fk_with_course_categories.sql` aligns the database with the frontend category picker.
- Course creation now persists initial pricing correctly. The create-course contract accepts `priceType`, `price`, and `salePrice`, and the backend applies those values during initial draft creation instead of silently dropping them.
- The course-creation stepper remains clickable for preview, but progress and validation now reflect real completion rather than default selections.

### 2.1 Course info editor trust fixes

- The course info editor no longer hydrates nullable numeric fields such as `price`, `salePrice`, and `credits` as `0`. Null values remain visually blank in the UI.
- Intro video, credits, and pricing now round-trip correctly through the editor:
  - create draft with pricing
  - open `/teacher/courses/:id/editor/info`
  - save intro video / credits
  - reload
  - values remain present and correct
- The editor header and the sticky save bar are now driven by the same unsaved/saving/saved state instead of disagreeing about whether the form has pending changes.
- Leaving the `info` tab with unsaved changes now prompts for confirmation instead of silently discarding edits.
- Header actions such as preview and publish are blocked when the current form has unsaved changes.
- The `course-info` screen itself was refactored toward a cleaner Angular structure:
  - inline template moved out to `course-info.component.html`
  - component-specific styling moved to `course-info.component.scss`
  - validation summary is now computed in the component and rendered as a real error-summary block
- Form semantics were improved:
  - title required state now has inline error text plus top-level error summary
  - intro-video URL and pricing inputs now provide clearer hint/error feedback
- Editor shell semantics were improved:
  - the collapsed curriculum sidebar is removed from the DOM on `info` and `settings`
  - hidden sidebar content is no longer exposed in the reading order of the info screen
- Information hierarchy was tightened:
  - the large overview block was reduced to a compact context strip so the screen behaves more like an authoring workspace and less like a summary page
  - category selection now sits closer to title/description in the main metadata flow
  - the right rail is now focused on `Hiá»ƒn thá»‹ & tháº» chá»§ Ä‘á»`, `TrÃ¬nh bÃ y cÃ´ng khai`, and `GiÃ¡ bÃ¡n & tÃ­n chá»‰`

### 2.2 Course settings trust fixes

- The `settings` route now has the same leave-confirmation protection as `info` and `curriculum`.
- The settings header save state now reflects real unsaved changes when `visibility` changes.
- The settings screen was tightened to match actual backend capability:
  - `visibility` remains the only interactive and persisted setting
  - registration, progression, and certificate configuration now appear as roadmap context rather than fake interactive controls
- This removes the previous mismatch where users could toggle controls that looked real but were not actually saved by the backend.

Important data note:

- Existing drafts created before the pricing-create fix may still contain old persisted values. For example, course `6b6802f0-4d4b-43d5-bee2-3a530d18dea3` currently stores:
  - `priceType = FREE`
  - `price = null`
  - `salePrice = null`
  - `introVideoUrl = null`
  This is current database state, not a remaining hydration bug in the editor.

### 3. Delivery mode separation

Current product meaning:

- `SELF_PACED`: course-wide flow, similar to MOOC/Coursera delivery
- `INSTRUCTOR_LED`: class-based flow with teacher-managed classes and class context

Implemented separation:

- `SELF_PACED` cannot use class-management APIs.
- `SELF_PACED` is redirected away from the `classes` editor page.
- The `classes` editor route is now also blocked at the router level for `SELF_PACED`, instead of relying only on component-level redirect logic.
- The `Lop hoc` tab only appears for `INSTRUCTOR_LED`.
- `INSTRUCTOR_LED` continues to use class-based authoring and class context.

### 4. Assignment and quiz authoring

- Quiz question-management calls are being normalized toward real `quizId` usage instead of relying on `lessonId` everywhere.
- Lesson-scoped quiz callers that already know they are holding a `lessonId` now resolve directly through `/api/v3/quizzes/lessons/{lessonId}` instead of first probing `/api/v3/quizzes/{lessonId}` and generating avoidable `404` noise.
- Frontend quiz callers that mutate or navigate to quiz resources now resolve through a generic quiz-reference helper instead of assuming `lessonId` is the resource id.
- Lesson-scoped quiz mutation endpoints were removed from the backend. Remaining lesson-scoped quiz endpoints are now read/discovery helpers only.
- Canonical chapter-anchored quiz creation now lives at `/api/v3/quizzes/chapters/{chapterId}`. The old `/api/v3/quizzes/sections/{sectionId}` route remains only as a legacy alias for the same chapter-anchored flow.
- Compatibility resolution still exists in the API layer so older lesson-scoped links continue to work while the migration finishes.
- `SELF_PACED` now supports lesson-scoped quiz and assignment shells as course-wide activities.
- `SELF_PACED` assignment distribution is constrained to `ALL_STUDENTS`.
- `INSTRUCTOR_LED` continues to support class-scoped assignment and quiz flows.
- Teacher assignment hydration can resolve by `lessonId` and restore the selected lesson correctly.
- Quiz responses now include lesson-derived course context so the editor no longer shows incomplete summary state for `SELF_PACED`.
- Teacher quiz and assignment editors now separate:
  - where the activity lives in the curriculum
  - who currently receives the activity
  This prevents `SELF_PACED` lesson shells from being mislabeled as lesson-only distribution.
- Assignment and quiz editor UI now makes the distinction clearer between:
  - course-owned default content and settings
  - class-specific distribution overlays
- Legacy section-editor handoff no longer pushes teachers into the wrong quiz creation route. It now re-opens the current curriculum section composer instead.

### 4.1 Quiz creation audit

### 4.2 Teacher assessments workspace split

- The teacher assessments hub now uses a context-first route structure instead of grouping screens only by assessment type.
- Canonical routes are now:
  - `/teacher/assessments/courses/overview`
  - `/teacher/assessments/classes/assignments`
  - `/teacher/assessments/classes/quizzes`
  - `/teacher/assessments/classes/quizzes/create`
  - `/teacher/assessments/classes/quizzes/create/:courseId`
  - `/teacher/assessments/classes/quizzes/:quizId/editor`
  - `/teacher/assessments/classes/quizzes/:quizId/essay-grading`
  - `/teacher/assessments/shared/question-bank`
  - `/teacher/assessments/shared/rubrics`
- Product boundary in the hub is now explicit:
  - `Khóa học`: canonical assessment authoring and jump-back into curriculum
  - `Lớp học`: runtime delivery, submissions, grading, and audit for class-scoped and self-paced operational items
  - `Dùng chung`: question bank and rubric library
- The class-runtime assignment and quiz lists no longer flatten every item into one surface.
  - assignment cards are now grouped into `Theo lớp và nhóm học viên`, `Toàn khóa học`, and `Chưa phân phối` when needed
  - quiz cards are now grouped into `Theo lớp`, `Toàn khóa học`, and `Chưa phân phối`
  - route titles were updated to `Vận hành bài tập` and `Vận hành bài kiểm tra` so browser metadata no longer implies that every item is class-only
- Teacher sidebar navigation was updated to match the same mental model:
  - root item label is now `Đánh giá`
  - nested entries are now `Khóa học`, `Lớp học`, and `Dùng chung`
- Mobile teacher navigation now also uses `Đánh giá` instead of the narrower `Bài tập`.
- Assignment and quiz creation screens under the `Lớp học` context now explicitly explain the ownership model:
  - canonical content is still anchored to the course/curriculum
  - delivery, submissions, deadlines, and grading belong to the operational class workspace
- Operational quiz cards now use more honest actions:
  - `Mở editor` explicitly opens the canonical quiz editor
  - `Chấm tự luận` goes straight to essay-grading for runtime review
  - the old generic `Chi tiết` wording was removed because it implied a dedicated runtime detail page that does not yet exist
- Quiz runtime inside the assessments workspace now stays on the honest, stable path:
  - there is no separate quiz runtime detail shell yet
  - `/teacher/assessments/classes/quizzes/:quizId/editor` opens the canonical quiz editor directly
  - `/teacher/assessments/classes/quizzes/:quizId/essay-grading` opens runtime grading directly
  - nested assessments routes now resolve `quizId` correctly inside `QuizEditComponent` and `QuizEssayGradingComponent`
  - when opened from the assessments workspace, the back action on both screens now returns to `/teacher/assessments/classes/quizzes` instead of jumping back into curriculum
- Legacy teacher routes and bookmarks still redirect correctly:
  - `/teacher/assignments`
  - `/teacher/rubrics`
  - `/teacher/assessments/assignments`
  - `/teacher/assessments/quizzes`
  - `/teacher/assessments/rubrics`
  - `/teacher/assessments/question-bank`
- Runtime smoke on Docker confirmed:
  - `/teacher/assessments` redirects to `/teacher/assessments/classes/assignments`
  - old paths redirect into the new structure
  - assignment, quiz, question-bank, and rubric screens render under the correct context shell
  - assignment runtime now separates instructor-led classroom items from self-paced course-wide items in the list itself
  - quiz runtime now surfaces class-scoped items separately from course-wide items, instead of relying only on per-card badges
- Assignment detail/runtime screens were then hardened so they no longer fall back to class-centric language by default:
  - the class-runtime shell now uses neutral `Vận hành` framing instead of labeling every runtime screen as `Lớp học`
  - assignment detail pages surface an explicit runtime scope label such as `Theo lớp • <className>` or `Toàn khóa học`
  - assignment overview now hydrates `distributionType`, `classId`, and `allocatedStudentIds` reactively from assignment detail, so instructor-led classroom items no longer fall back to `ALL_STUDENTS`
  - distribution selector copy now distinguishes `Toàn khóa học`, `Theo lớp`, and selected-student runtime more clearly
  - speed grader empty-state copy is now context-aware for self-paced, class-scoped, and targeted assignments
- Quiz operations under the new assessments shell were then stabilized:
  - the invalid `square-pen` icon usage was removed, leaving clean browser logs on the quizzes list route
  - quiz list still separates `Theo lớp` and `Toàn khóa học` items, but now the list routes open stable screens instead of a half-built runtime detail shell
  - quiz creation under `Lớp học / Vận hành` no longer jumps straight into the old generic course-shell wizard
  - `/teacher/assessments/classes/quizzes/create` now acts as a launcher that selects the course first
  - `/teacher/assessments/classes/quizzes/create/:courseId` then opens the scoped creation flow that can honestly express:
    - self-paced -> `Toàn khóa học`
    - instructor-led -> `Toàn khóa học` or `Lớp học cụ thể`
  - class-scoped quiz editor now shows `Theo lớp` and the concrete class target correctly under `/teacher/assessments/classes/quizzes/:quizId/editor`
  - self-paced quiz editor now shows `Toàn khóa học` and `Toàn bộ học viên đã ghi danh` correctly under the same route family
  - essay grading now opens correctly for both class-scoped and self-paced quizzes inside the assessments workspace and uses the same context-aware back action
  - self-paced quiz creation no longer triggers a failing class-load request, so browser logs remain clean on the new scoped create route
  - assignment creation under `/teacher/assessments/classes/assignments/create` now behaves honestly by context:
    - self-paced courses expose only `ALL_STUDENTS`
    - instructor-led courses expose `ALL_STUDENTS`, `CLASS`, and `SPECIFIC_STUDENTS`
    - the distribution selector opens directly in management mode instead of an "already assigned" summary state
    - self-paced assignment creation no longer requests class data or produces runtime `422` noise
  - quiz essay grading now surfaces runtime context before the grader reviews answers:
    - self-paced quizzes show `Khóa học`, `Toàn khóa học`, and `Toàn bộ học viên đã ghi danh`
    - instructor-led quizzes show `Lớp học`, `Theo lớp`, and the concrete class target
    - the empty-state copy on the grading screen now follows the same runtime scope

There are currently three valid quiz authoring patterns in the product:

- section-level quiz content inside a lecture lesson
  - stored as section/content-block `quizData`
  - edited from the curriculum section composer
- lesson-level quiz shell
  - quiz attached to an existing lesson
  - created through `/api/v3/quizzes/lessons/{lessonId}`
- chapter-anchored quiz lesson
  - creates a new `QUIZ` lesson under a chapter, then creates the quiz shell for that lesson
  - canonical route: `/api/v3/quizzes/chapters/{chapterId}`

For `INSTRUCTOR_LED`, there is also a course-scoped distribution variant:

- class-aware course quiz
  - route: `/api/v3/quizzes/courses/{courseId}`
  - canonical request field: `chapterId`
  - backward-compatible request alias still accepted by backend: `sectionId`

### 4.2 Learner-side assessment boundary

The learner-facing assessment surface is now hardened on both canonical and compatibility routes.

Implemented rules:

- students only see assignments that are both published and visible through the current allocation rules
- students only see quizzes that are both published and visible through the current class/course distribution rules
- generic compatibility routes under `/api/v3/assignments/.../submissions` now enforce the same access rules as `/api/v3/student/assignments/...`
- a student in class A can no longer use assignment or quiz ids from class B in the same instructor-led course
- `SELF_PACED` lesson-scoped quizzes still work through course-enrollment fallback when no class-specific quiz assignment exists
- self-enrollment remains blocked for `INSTRUCTOR_LED` courses

Verified negative path:

- class A student was denied from:
  - `POST /api/v3/assignments/{assignmentId}/submissions`
  - `GET /api/v3/assignments/{assignmentId}/my-submission`
  - `GET /api/v3/submissions/{submissionId}`
  - `GET /api/v3/quizzes/{quizId}`
  - `GET /api/v3/quizzes/{quizId}/questions`
  - `POST /api/v3/quizzes/{quizId}/attempts/start`
  when the same assignment and quiz were temporarily reassigned to a different class in the same course

Verified positive path:

- the same student can still submit, read back the submission, load the quiz, and start an attempt after the assignment and quiz are restored to the student's own class

### 4.3 Student course-first runtime

- The student experience now follows a course-first structure instead of a flat feature-first route map.
- Canonical learner routes are:
  - `/student/courses`
  - `/student/courses/library`
  - `/student/tasks`
  - `/student/results`
  - `/student/learn/course/:courseId`
- Legacy learner routes still redirect cleanly:
  - `/student`
  - `/student/dashboard`
  - `/student/my-courses`
  - `/student/assignments`
  - `/student/grades`
- The student shell no longer mounts AI assistant surfaces during normal learner navigation, reducing blank-screen risk and removing unrelated runtime noise from the learner workspace.
- Learner course detail now uses real enrollment access to determine state:
  - enrolled learners no longer see the incorrect `Đăng ký ngay để bắt đầu học` hero
  - enrolled learners now see their progress and the correct `Bắt đầu học` or `Tiếp tục học` action
- Learner boundary is now reflected honestly in the UI:
  - self-paced course detail shows `Khóa học`
  - instructor-led course detail shows `Lớp học`
  - the cross-course task inbox mixes `Toàn khóa học` and `Lớp: <tên lớp>` where appropriate instead of flattening everything into one audience model
  - `Kết quả` remains a cross-course review surface rather than a class-runtime workspace

### 5. Curriculum editor stability

- The teacher curriculum editor no longer re-hydrates lesson detail in a way that resets quiz forms after selection.
- Assignment editing now exposes the `instructions` field in the UI, matching the backend save flow.
- Moving a lesson to another chapter now preserves the original `lessonId`, `lessonType`, and linked assessment data. The old delete-and-recreate behavior in the sidebar is no longer the intended runtime path.
- Backend lesson updates now honor partial-update semantics for `description`, so simple rename and move operations no longer wipe lesson descriptions when the frontend omits that field.
- Curriculum readiness and sidebar completion counts now treat `QUIZ` and `ASSIGNMENT` lessons as valid lesson content, even when they do not contain lecture sections.
- Section drag-drop in the curriculum panel now follows the same deferred CDK update pattern as the sidebar, reducing reorder instability.
- Optimistic chapter/lesson/section reorder now writes through the local course cache, so users do not bounce back to stale ordering when reopening the editor.
- Discard confirmation in the curriculum editor now restores the canonical lesson/section state instead of only flipping the header back to `saved`.
- Creating a new text section from the lecture composer now initializes the rich-text editor correctly instead of getting stuck on the loading placeholder.
- Section editing now follows one canonical surface in the teacher curriculum editor:
  - selecting an existing section opens the modal editor instead of splitting state across a second full-page section surface
  - closing or saving the modal clears `sectionId` from the URL instead of leaving a stale deep-link behind
  - deep-links that arrive before the current lesson projection contains the section now fetch fresh lesson detail and restore the correct section selection
- The lecture composer was tightened into a denser authoring layout:
  - section actions are grouped in the lecture-content header instead of split across duplicate action bars
  - lecture section rows now show human-readable type labels instead of raw `TEXT`/`VIDEO` strings
  - the duplicate lower quick-action strip is hidden from the runtime UI
  - the section modal uses denser spacing and a smaller default text-editor height, so opening a lecture section no longer pushes the primary fields too far down
  - the lecture section list and lesson-assessment summaries now live in smaller presentational components instead of duplicating large template blocks inside the curriculum page
  - the quiz manager now lives in its own presentational component, and the hidden fallback assignment form has been removed from the curriculum template
  - the lecture section modal now exposes real dialog semantics and supports keyboard dismissal with `Escape`, while preserving the same discard-confirmation flow as explicit close actions
- Deep-link and reload behavior in the teacher editor were stabilized:
  - direct links to `chapterId`, `lessonId`, and legacy section routes now preserve selection
  - reload no longer strips query params and falls back to the first lesson
  - legacy chapter routes now redirect to the curriculum URL with `chapterId`
- The dormant standalone `section-editor-refactored` tree was retired. The old `/teacher/courses/:courseId/sections/:sectionId` URL now acts only as a redirect adapter into the current curriculum editor.
- Section-quiz type changes inside the curriculum section composer now mark the editor as unsaved, so switching between assessment/exam no longer bypasses the save-state guard.
- Several placeholder `?` action buttons and save spinners in the curriculum UI were replaced with real icons/spinners.
- Section composer copy was corrected so section types no longer show misleading labels such as an upgrade-policy title for quiz sections.

### 6. Admin and security fixes

- `ORG_ADMIN` scope was tightened so org admins cannot read or mutate users outside their organization by guessing UUIDs.
- Bulk user import moved from browser-side row-by-row creation to a backend bulk import flow with validation and scoped role handling.
- Teacher/admin search behavior was tightened so lower-privilege roles no longer use admin search paths as a backdoor.

## Current Delivery-Mode Matrix

This table reflects the verified runtime behavior as of 2026-03-07.

| Area | `SELF_PACED` | `INSTRUCTOR_LED` |
|------|--------------|------------------|
| Course creation | Supported | Supported |
| Course info editor | Supported | Supported |
| Curriculum editor | Supported | Supported |
| Quiz shell | Lesson-scoped, course-wide context | Lesson-scoped, class-aware context |
| Assignment shell | Lesson-scoped, course-wide context | Lesson-scoped, class-aware context |
| Assignment distribution | `ALL_STUDENTS` only | Class-aware distribution supported |
| Classes tab | Hidden | Visible |
| Classes route | Redirected to course info | Allowed |
| Classes API | Blocked by business rule | Allowed |
| Legacy section route | Redirects to curriculum by `chapterId` | Redirects to curriculum by `chapterId` |

## Verified on Docker

The following checks were executed against the current local Docker runtime:

- `docker compose --env-file .env.dev.example -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
- backend health: `http://127.0.0.1:8088/actuator/health`
- frontend smoke: `http://127.0.0.1:4200/`
- frontend build: `npm run build`
- backend test suite: `mvn test -B` (`832` tests, `0` failures, `0` errors)
- curriculum readiness smoke on self-paced route now shows `6/8` in the editor header and `2/2` in the curriculum sidebar for a course whose canonical content is one quiz lesson plus one lecture lesson
- move-lesson smoke verified that a self-paced quiz lesson can move to a temporary chapter and back while preserving:
  - the same `lessonId`
  - the same `lessonType = QUIZ`
  - the original quiz title and shell identity

Latest verified results:

- backend tests passed: `832` tests, `0` failures, `0` errors
- frontend production build passed
- Docker runtime rebuilt successfully after the latest quiz and deep-link fixes
- Docker runtime rebuilt successfully after the latest course-info and pricing fixes
- `SELF_PACED` deep-link to quiz remains stable across reload
- `SELF_PACED` lecture deep-link remains stable across reload
- legacy chapter route opens chapter editor rather than jumping to the first lesson
- `INSTRUCTOR_LED` assignment and quiz deep-links still preserve class context
- browser verification passed for course info editor:
  - a new paid course draft loads `priceType = PAID`, `price`, and `salePrice` correctly in `/editor/info`
- browser verification passed for the assessments operational workspace:
  - assignment creation now switches distribution choices correctly when changing between self-paced and instructor-led courses
  - self-paced assignment creation no longer logs a failing class-load request
  - essay grading now shows class-aware context for instructor-led quizzes and course-wide context for self-paced quizzes
- browser verification passed for the remaining assessments context shell routes:
  - `/teacher/assessments/courses/overview`
  - `/teacher/assessments/shared/question-bank`
  - `/teacher/assessments/shared/rubrics`
  - `credits` remains blank when the stored value is `null`
  - `introVideoUrl` persists after save and reload
  - dirty state is visible before save
  - header returns to saved state after save
  - leaving the tab triggers a confirmation dialog and respects dismiss/accept behavior
- browser verification passed for the `editor/info` semantics/layout refactor:
  - the hidden curriculum sidebar no longer appears in the info-screen reading order
  - the compact context strip renders ahead of the form sections without pushing the first editable fields too far down
- browser verification passed for the new assessments quiz creation flow:
  - `/teacher/assessments/classes/quizzes/create` renders the launcher with course selection and operational guidance
  - choosing a course opens `/teacher/assessments/classes/quizzes/create/:courseId`
  - self-paced scoped create shows course-wide-only guidance and no class-fetch console errors
  - instructor-led scoped create exposes both `Toàn bộ khóa học` and `Lớp học cụ thể`
  - canceling from the scoped create screen returns to `/teacher/assessments/classes/quizzes`
  - category selection appears before delivery-mode selection in the main metadata flow
  - invalid save on empty title shows both an error summary and an inline title error
  - invalid save on missing category focuses the correct category control
  - the sticky save bar appears when the form becomes dirty
- browser verification passed for the `editor/settings` trust refactor:
  - changing `visibility` moves the header into `ChÆ°a lÆ°u`
  - attempting to leave the route triggers a confirmation dialog
  - unsupported settings no longer appear as active form controls
- curriculum trust flow now uses the shared confirm dialog instead of `window.confirm`:
  - switching tabs, chapters, lessons, sections, or route-level editors now goes through the same leave/discard dialog pattern
  - discarding from the dialog restores the canonical lesson or section state before marking the header saved again
- curriculum lesson assessment summaries are now explicit about boundary semantics:
  - `Vị trí trong nội dung` remains lesson-scoped
  - `Phạm vi áp dụng` now states the real audience for `SELF_PACED` versus `INSTRUCTOR_LED`
  - `Phân phối hiện hành` now makes it clear when delivery is managed elsewhere instead of inside the lesson editor
- standalone `quiz-edit` and `assignment-editor` now participate in the same trust model:
  - both routes use `canDeactivate`
  - leaving with unsaved changes now uses the shared confirm dialog
  - assignment-editor no longer gets stuck in a perpetual saving state when class or student distribution validation fails
- learner-side class boundary is enforced in runtime:
  - positive path on class A returns `200` for assignment submission, submission detail, and quiz access
  - after temporarily moving the same assignment and quiz to class B in the same course, student runtime returns:
    - assignment submit `403`
    - assignment my-submission `403`
    - submission-by-id `403`
    - quiz detail `403`
    - quiz questions `403`
    - quiz start `422`
  - after restoring class A, quiz access and attempt start return `200` again
- browser E2E passed for:
  - legacy `/teacher/courses/:courseId/sections/:chapterId` redirect into curriculum
  - query-driven lecture section composer handoff
  - `SELF_PACED` chapter-anchored quiz creation and edit
  - `INSTRUCTOR_LED` class-aware quiz creation and edit
- browser smoke passed after the latest curriculum cleanup:
  - the deep-linked quiz editor still opens correctly
  - visible question-mark placeholder buttons are gone from the tested curriculum route
- browser verification passed for the `INSTRUCTOR_LED` lecture route `880194e2-4a22-4b18-92b2-1fbedbbb648c / 6608484a-a320-4201-891f-25be2f18656c / 09fd75b2-6910-4c91-be41-018fc7709cfd`:
  - editing the lesson title marks the header as unsaved
  - discarding from `+ Bài giảng` restores the original lesson title instead of keeping the local draft
  - editing an existing text section prompts on discard and restores the original section title
  - saving an edited text section persists after reload
  - opening a new text section now loads the editor instead of staying on `Đang tải trình soạn thảo...`
- browser verification passed for the modal-first section editor flow:
  - deep-linking to a section now opens the modal editor on both `SELF_PACED` and `INSTRUCTOR_LED` lecture routes
  - closing the section modal removes `sectionId` from the URL instead of leaving a stale deep-link
  - saving a section from the modal persists the change and also clears `sectionId` from the URL
  - the legacy full-page `Section Editor (Level 3)` surface has been removed from `course-curriculum.component.html`; section editing now has a single canonical UI surface
  - instructor-led section deep-link smoke passed after this removal with `sectionId=9730c0fc-a470-4bd5-a78b-3f9512650e06`, and the modal still opened on load
  - opening a new text section through the query-driven composer and discarding changes no longer leaks draft state back into the curriculum page
  - `Escape` now closes the lecture section modal on the instructor-led lecture route after the dialog takes focus
- local browser runtime now disables router view transitions, which removes `::view-transition` overlays that were interfering with repeatable Playwright authoring smoke tests while leaving production behavior unchanged
- self-paced curriculum browser smoke passed again after the latest local-runtime and quiz-resolution changes:
  - lecture deep-link `a7dfa94d-74a0-4118-8e87-ea0aeff3d1aa / d13edad9-198d-4166-866a-d90ee65dc09a / 30bc0bab-3d15-4b5f-8a57-35647e4bc8c6` still renders the lecture composer
  - the self-paced curriculum shell still does not expose a `Lớp học` tab
  - self-paced quiz deep-link `a7dfa94d-74a0-4118-8e87-ea0aeff3d1aa / d13edad9-198d-4166-866a-d90ee65dc09a / 0eec95a0-7473-4862-9f17-c6d57d0207e1` now resolves without an avoidable `GET /api/v3/quizzes/{lessonId}` `404`
  - quiz summary text still states the correct course-wide audience: `Toàn bộ học viên đã ghi danh`
- quiz lesson curriculum shell is now intentionally `builder-first` rather than `question-manager-first`:
  - the in-curriculum quiz surface only keeps lesson title, core quiz settings, boundary summary, and a lightweight question preview
  - inline heavy question workflows were removed from the curriculum route; teachers now jump to the dedicated quiz builder for bank selection, randomization, and detailed question operations
  - this keeps `Curriculum > Nội dung` aligned with course-outline authoring patterns used by major LMS products, where the outline edits the shell and the deep editor manages the activity internals
- browser smoke passed for the instructor-led quiz deep-link `880194e2-4a22-4b18-92b2-1fbedbbb648c / 6608484a-a320-4201-891f-25be2f18656c / 9417a6b7-cd5a-4166-9a0b-6d2edbc02179` after the latest hardening:
  - delaying `GET /api/v3/courses/lessons/:lessonId` no longer overwrites a locally edited quiz title
  - changing the quiz title marks the header as unsaved, and restoring the original title clears the dirty state again without forcing a reload
  - opening `Mở builder bài kiểm tra` while dirty now consistently routes through the shared discard dialog: `Ở lại` preserves the local draft, while `Rời màn này` hands off to `/teacher/quiz/:quizId/edit`
- lecture section quiz authoring now uses a single canonical modal surface instead of splitting quiz setup between the section modal and unrelated parent-level controls:
  - the section modal now exposes quiz-section settings, selected-question preview, and entry points for bank/random selection
  - the quiz-section save action remains blocked until at least one question is selected
  - the supporting bank/random overlays were raised above the section modal (`z-[70]`) so they no longer appear open while the underlying modal intercepts clicks
  - instructor-led lecture smoke passed on `880194e2-4a22-4b18-92b2-1fbedbbb648c / 6608484a-a320-4201-891f-25be2f18656c / 09fd75b2-6910-4c91-be41-018fc7709cfd`: opening `+ Trắc nghiệm` shows the new quiz-section shell, the bank overlay opens, and `Escape` closes the section modal again
- assignment lesson shell in curriculum is now hardened to match the quiz-shell trust model more closely:
  - the in-curriculum assignment form now frames itself as the default lesson shell, while class-specific distribution remains in assignment settings
  - `assignmentMaxScore` is clamped to a minimum of `1` in editor state, and assignment handoff still routes through the shared discard dialog
  - browser smoke passed on a temporary instructor-led assignment lesson created under `880194e2-4a22-4b18-92b2-1fbedbbb648c / 6608484a-a320-4201-891f-25be2f18656c`: the assignment shell rendered correctly, the max-score guardrail was present, and `Mở cài đặt bài tập` respected dirty-state confirmation
- student browser smoke passed after the course-first runtime hardening:
  - `student@maritime.edu / student123` login succeeds and lands on `/student/courses`
  - `/student/courses`
  - `/student/courses/library`
  - `/student/tasks`
  - `/student/results`
  - desktop and mobile `student/courses`
  - one enrolled self-paced course detail
  - one enrolled instructor-led course detail
- student detail verification confirmed:
  - self-paced detail no longer shows the wrong enroll CTA and now shows `0% hoàn thành` + `Bắt đầu học`
  - instructor-led detail no longer shows the wrong enroll CTA and now shows `0% hoàn thành` + `Bắt đầu học`

## Important Design Direction

The current implementation direction is:

- keep lesson authoring shared where it should be shared
- make class-specific behavior explicit rather than implicit
- preserve safe compatibility during migration from lesson-scoped shortcuts to resource-specific identifiers such as `quizId`

This means the system should keep converging toward:

- resource-specific APIs for mutation
- route-driven editor state that survives reload and deep-link entry
- explicit UI labels when an action is course-wide vs class-scoped

## Remaining Work

Next priorities in the teacher authoring area:

- the generic lesson-delete path for temporary `ASSIGNMENT` lessons has now been hardened:
  - lesson cleanup now checks the live schema before issuing native deletes, so it no longer references stale tables such as `quiz_attempt_items` or `stu_lesson_progress`
  - `DELETE /api/v3/courses/lessons/{lessonId}` now resolves `chapterId` from `lessonId` when the request omits it, matching the controller contract
  - runtime verification on Docker confirmed that deleting an assignment lesson now returns `200` and removes both the lesson and its linked assignment root
- monitor the legacy `/sections/:sectionId` redirect path, but keep all authoring work on the current curriculum editor only
- continued decomposition of the `curriculum` monolith into smaller editor surfaces now that section editing is modal-first
- manual browser smoke for the new shared confirm-dialog flow across `info`, `settings`, `curriculum`, `quiz-edit`, and `assignment-editor`
- broader end-to-end verification for `public course detail -> payment -> enrollment`
- continued reduction of compatibility layers that still depend on lesson-scoped quiz discovery endpoints

## Related Documents

- [docs/README.md](/E:/Sach/Sua/LMS_hohulili/docs/README.md)
- [docs/plans/2026-03-03-delivery-mode-enforcement.md](/E:/Sach/Sua/LMS_hohulili/docs/plans/2026-03-03-delivery-mode-enforcement.md)
- [docs/architecture/LESSON_VIEW_ARCHITECTURE.md](/E:/Sach/Sua/LMS_hohulili/docs/architecture/LESSON_VIEW_ARCHITECTURE.md)
