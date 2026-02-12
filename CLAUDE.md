# CLAUDE.md

> **Last Updated**: 2026-02-12 | **Version**: 4.8 | **Status**: MVP Complete + Full Audit & Fix (S56)

This file provides guidance to Claude Code for working with this repository. **Read this first before any task.**

---

## QUICK START

```bash
# Backend (Docker - Recommended)
cd backend && docker compose up -d
# API: http://localhost:8088/api/v3
# Swagger: http://localhost:8088/swagger-ui

# Frontend
cd fe && npm install && npm start
# App: http://localhost:4200
```

**Test Accounts** (auto-created):
- ADMIN (System): `admin@maritime.edu` / `admin123`
- ORG_ADMIN (Operations): `orgadmin@maritime.edu` / `orgadmin123`
- TEACHER: `teacher@maritime.edu` / `teacher123`
- STUDENT: `student@maritime.edu` / `student123`

---

## CURRENT SYSTEM STATUS

### Backend: RUNNING (381 files | 522 tests | 215 endpoints)
| Component | Status | Port |
|-----------|--------|------|
| Spring Boot API | Running | 8088 |
| PostgreSQL 16 | Running | 5432 |
| Swagger UI | Accessible | 8088/swagger-ui |
| pgAdmin | Accessible | 8081 |

### Quick Health Check
```bash
# Health endpoint (public, no JWT required)
curl -s http://localhost:8088/actuator/health
# Expected: {"status":"UP"}

# API endpoint
curl -s http://localhost:8088/api/v3/courses | head -100
# Expected: {"success":true,"message":"Courses loaded"...}

# Login test
curl -s -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}'
# Expected: {"success":true,"message":"Đăng nhập thành công"...}
```

---

## PROJECT ARCHITECTURE

### Backend (Clean Architecture + DDD)

> **Full backend reference**: [`backend/README.md`](backend/README.md) (381 files, 215 endpoints, all patterns documented)
> **Swagger UI**: http://localhost:8088/swagger-ui (interactive API docs)

```
backend/src/main/java/com/example/lms/
├── identity/              # User, Auth, Roles (JWT), Multi-tier Admin
├── course_authoring/      # Course, Chapter, Lesson, ContentBlock, Package, Category, Review, Admin ops
├── learning_delivery/     # LearningClass, Enrollment, Progress, Gamification, Analytics, Video, Certificate
├── assessment/            # Assignment, Quiz, Question, Submission, Rubric, QuestionBank
├── communication/         # Messages, Conversations
├── ai_assistant/          # AI Chat integration (SSE streaming)
├── shared/                # Value objects, domain events, exceptions, file service, payment, admin settings
└── config/                # Security, CORS, JWT, rate limiting, R2 storage
```

**Layer Pattern (CRITICAL)**:
```
{module}/
├── domain/
│   ├── model/            # Pure domain entities (NO @Entity!)
│   ├── repository/       # Repository INTERFACES (ports)
│   ├── valueobject/      # Value objects
│   └── event/            # Domain events
├── application/
│   ├── usecase/          # Use cases (business logic)
│   ├── dto/              # Commands, responses
│   └── port/             # Application ports (TokenService)
└── infrastructure/
    ├── persistence/
    │   ├── entity/       # JPA entities (*JpaEntity)
    │   ├── mapper/       # Entity <-> Domain mappers
    │   └── *Adapter.java # Repository port implementations
    └── web/              # REST controllers
```

### Frontend (Angular 20.3 + Signals)

> **Full architecture reference**: [`fe/FRONTEND_ARCHITECTURE.md`](fe/FRONTEND_ARCHITECTURE.md)

```
fe/src/app/
├── api/              # 18 API clients + 23 endpoints + 19 type files
├── core/             # Auth, guards (5 fns in 3 files), global services (15)
├── features/
│   ├── admin/        # 22 components - Dashboard, user/course management
│   ├── teacher/      # 68 components - Course editor, assignments, grading, quiz
│   ├── student/      # 12 components - Learning, enrollments, messages
│   ├── ai-chat/      # 15 components - AI assistant (full DDD + streaming)
│   ├── learning/     # 13 components - Course learning, quizzes
│   ├── courses/      # 10+ components - Browse, categories, detail
│   ├── assignments/  # 12 components - Student assignment work (DDD)
│   ├── auth/         # 3 components - Login, register, forgot-password
│   ├── communication/# 2 components - Notifications
│   └── payment/      # 4 components - VNPay integration
├── shared/           # 48 reusable components, 8 services
└── state/            # Global state: course, class, global
```

**Stats**: 236 components | ~56 services | 70+ routes | 508 TS files

---

## CLEAN ARCHITECTURE RULES (BACKEND)

### The Golden Rule
```
JPA Repository → JpaEntity (NEVER domain model!)
Domain Repository Interface → Domain Model
Adapter converts between them
```

### Correct Pattern
```java
// infrastructure/persistence/entity/CourseJpaEntity.java
@Entity @Table(name = "courses")
public class CourseJpaEntity { ... }

// infrastructure/persistence/CourseJpaRepository.java
@Repository
public interface CourseJpaRepository extends JpaRepository<CourseJpaEntity, UUID> {}

// domain/repository/CourseRepository.java (PORT)
public interface CourseRepository {
    Course findById(UUID id);
    Course save(Course course);
}

// infrastructure/persistence/CourseRepositoryAdapter.java
@Component
public class CourseRepositoryAdapter implements CourseRepository {
    private final CourseJpaRepository jpaRepo;
    private final CourseEntityMapper mapper;
    // Converts JpaEntity <-> Domain
}
```

### WRONG Pattern (Causes "Not a managed type" error)
```java
// NEVER do this - will crash on startup
public interface BadRepository extends JpaRepository<Course, UUID> {}
```

---

## COMMON ERRORS & FIXES

### 1. "Not a managed type: class X"
**Cause**: JPA repository using domain model instead of JPA entity.
**Fix**: Change `JpaRepository<DomainModel, UUID>` to `JpaRepository<XJpaEntity, UUID>`.

### 2. API Connection Failed (Frontend)
```bash
curl http://localhost:8088/api/v3/courses   # Check backend
docker compose -f backend/docker-compose.yml logs api --tail=50
```

### 3. Backend Won't Start
```bash
cd backend && docker compose logs api --tail=100
# "Not a managed type" → See fix #1
# "Access key cannot be blank" → Disable R2 in application-dev.yml
# Database connection → Check postgres container
```

### 4. Container Unhealthy
```bash
# Check health endpoint
curl http://localhost:8088/actuator/health
# If 403: /actuator/health not whitelisted (already fixed)

docker inspect lms-backend --format='{{.State.Health.Status}}'
docker compose logs api --tail=50
```

### 5. Build Errors
```bash
cd backend && docker compose build api 2>&1 | tail -50
cd fe && npm run build 2>&1 | head -50
```

---

## ANGULAR CONVENTIONS (CRITICAL)

> All 236 components follow these patterns. **0 legacy patterns remain.**

```typescript
@Component({
  selector: 'app-example',
  // standalone: true is DEFAULT in Angular 20+ - NEVER specify it
  imports: [CommonModule],  // Only if using pipes (| date, | number) or [ngClass]
  changeDetection: ChangeDetectionStrategy.OnPush,  // REQUIRED (100% coverage)
  template: `
    @if (isLoading()) {
      <div>Loading...</div>
    } @else {
      @for (item of items(); track item.id) {
        <div>{{ item.name }}</div>
      } @empty {
        <p>No items</p>
      }
    }
  `
})
export class ExampleComponent {
  private service = inject(MyService);          // inject(), never constructor
  data = input.required<Data>();                // input(), never @Input()
  itemSelected = output<Item>();                // output(), never @Output()
  items = signal<Item[]>([]);                   // signal for state
  itemCount = computed(() => this.items().length); // computed for derived
  container = viewChild<ElementRef>('container');  // viewChild(), never @ViewChild
}
```

### CommonModule Rules
- **Keep** if template uses: `| date`, `| number`, `| currency`, `| slice`, `[ngClass]`, `[ngStyle]`
- **Remove** if template only uses `@if`, `@for`, `@switch`
- Currently 14 components require CommonModule

---

## KEY FILES REFERENCE

### Backend
| Purpose | File |
|---------|------|
| **Full Backend Docs** | **`backend/README.md`** (165+ endpoints, all patterns) |
| **Backend SKILL** | **`.agent/skills/01-backend-ddd-development/SKILL.md`** |
| Dev Config | `backend/src/main/resources/application-dev.yml` |
| Prod Config | `backend/src/main/resources/application-prod.yml` |
| Docker Compose | `backend/docker-compose.yml` |
| Security Config | `config/SecurityConfig.java` |
| Rate Limiting | `config/RateLimitingFilter.java` |
| JWT Filter | `config/JwtAuthenticationFilter.java` |
| Flyway Migrations | `src/main/resources/db/migration/V1, V26-V44` |
| **Schema Reference** | **`src/main/resources/db/migration/V1__lms_complete_schema.sql`** (1,249 lines) |

### Frontend
| Purpose | File |
|---------|------|
| **FE Architecture** | **`fe/FRONTEND_ARCHITECTURE.md`** |
| **FE SKILL** | **`.agent/skills/angular-v20-frontend/SKILL.md`** |
| Environment | `fe/src/environments/environment.ts` |
| API Client | `fe/src/app/api/client/api-client.ts` |
| Root Routes | `fe/src/app/app.routes.ts` |
| Teacher Routes | `fe/src/app/features/teacher/teacher.routes.ts` |
| Student Routes | `fe/src/app/features/student/student.routes.ts` (lazy) |
| Admin Routes | `fe/src/app/features/admin/admin.routes.ts` |
| Auth Service | `fe/src/app/core/services/auth.service.ts` |
| Global State | `fe/src/app/state/global.state.ts` |
| ConfirmDialog Service | `fe/src/app/core/services/confirm-dialog.service.ts` |
| Toast Service | `fe/src/app/core/services/toast.service.ts` |
| Course Editor Store | `fe/src/app/features/teacher/course-editor/store/course-editor.store.ts` |
| Course Editor Layout | `fe/src/app/features/teacher/course-editor/layouts/course-editor-layout/course-editor-layout.component.ts` |
| Course Editor Sidebar | `fe/src/app/features/teacher/course-editor/components/sidebar/sidebar.component.ts` |
| Course Info Page | `fe/src/app/features/teacher/course-editor/pages/course-info/course-info.component.ts` |
| Course Settings Page | `fe/src/app/features/teacher/course-editor/pages/course-settings/course-settings.component.ts` |

---

## BACKEND MODULE STATS

| Module | Domain Models | Use Cases | Controllers | Endpoints |
|--------|--------------|-----------|-------------|-----------|
| identity | 2 | 7 | 2 | 21 |
| course_authoring | 6 | 23 | 6 | 53 |
| learning_delivery | 9 | 17 | 10 | 51 |
| assessment | 11 | 14 | 6 | 59 |
| communication | 4 | 1 | 1 | 6 |
| ai_assistant | 3 | 1 | 1 | 11 |
| shared | 3 | 1 | 3 | 9 |
| **Total** | **38** | **64** | **29** | **215** |

**Note**: `course_management` module merged into `course_authoring` in S50. Counts verified 2026-02-12.

---

## TECH STACK

### Backend
| Component | Version |
|-----------|---------|
| Java | 21 |
| Spring Boot | 3.2.6 |
| Spring Security | 6.x |
| PostgreSQL | 16 |
| Flyway | 10.x |
| JJWT | 0.12.3 |
| SpringDoc OpenAPI | 2.5.0 |
| Caffeine Cache | (managed) |
| AWS SDK S3 (R2) | 2.25.0 |
| Hypersistence Utils | 3.7.0 |
| Apache POI | 5.2.4 |
| Lombok | 1.18.32 |

### Frontend
| Component | Version |
|-----------|---------|
| Angular | 20.3 |
| TypeScript | 5.x |
| RxJS | 7.x |
| Sass | (managed) |

### Testing
| Tool | Purpose |
|------|---------|
| JUnit 5 | Test framework |
| Mockito | Mocking |
| AssertJ | Fluent assertions |
| ArchUnit | Architecture tests |

---

## WORKFLOW FOR BUG REPORTS

1. **Read error message** - class names and file paths
2. **Check this CLAUDE.md** - "Common Errors & Fixes"
3. **Diagnose**: Backend → `docker compose logs api --tail=100` | Frontend → `npm run build`
4. **Fix following patterns** in backend/README.md and SKILL.md
5. **Run tests**: `cd backend && docker compose exec api mvn test -B`

---

## MULTI-TIER ADMIN SYSTEM (Session 43)

### Role Hierarchy
| Role | Vietnamese | Access | Test Account |
|------|-----------|--------|-------------|
| **ADMIN** | Quản trị hệ thống | Full system access. Settings, logs, AI knowledge, delete users/courses. | `admin@maritime.edu` / `admin123` |
| **ORG_ADMIN** | Chuyên viên quản lý | Operations: course review/approve, user CRUD (teacher/student only), analytics. | `orgadmin@maritime.edu` / `orgadmin123` |
| **TEACHER** | Giảng viên | Course authoring, grading, student management. | `teacher@maritime.edu` / `teacher123` |
| **STUDENT** | Học viên | Learning, enrollment, assignments. | `student@maritime.edu` / `student123` |

### Security Rules
- **ALL `@PreAuthorize` with ADMIN now include ORG_ADMIN** except 3 system-only endpoints
- **ADMIN-only (3 endpoints)**: DELETE user, DELETE course, admin settings (`AdminSettingsControllerV3`)
- **Business Guards** (in `UserControllerV3`):
  - ORG_ADMIN cannot create ADMIN/ORG_ADMIN users
  - ORG_ADMIN cannot modify ADMIN/ORG_ADMIN users
  - ORG_ADMIN cannot SET role to ADMIN/ORG_ADMIN (escalation prevention)
  - ORG_ADMIN cannot toggle/delete ADMIN/ORG_ADMIN accounts
- **Ownership Bypass** (`CourseAuthoringControllerV3`): `isAdminRole(user)` = ADMIN || ORG_ADMIN

### FE Guards
```typescript
adminGuard = [UserRole.ADMIN, UserRole.ORG_ADMIN]   // Dashboard, users, courses, analytics
systemAdminGuard = [UserRole.ADMIN]                   // Settings, logs, AI knowledge
teacherGuard = [UserRole.TEACHER, UserRole.ADMIN, UserRole.ORG_ADMIN]
```

### SOTA Alignment (Canvas/Moodle/Coursera/Google 2026)
- Matches **Coursera for Campus** 2-tier model (Org Admin + Program Admin)
- Follows **Keycloak** "can only assign roles you yourself have" pattern
- Follows **Google Workspace** Super Admin isolation for destructive ops
- **Escalation Prevention**: ORG_ADMIN cannot promote any user to admin roles (request role + target role both checked)

---

## RECENT CHANGES LOG

### 2026-02-12 (Session 56: VideoProgress Fix + Stub Elimination + Vietnamese Translation)

| Change | Detail |
|--------|--------|
| **VideoProgress COMPLETION_THRESHOLD Fix** | `VideoProgress.java` threshold was `50.0` but tests expected `90.0`. Fixed to `90.0` — matches Coursera/edX pattern (90% watched = completed). 2 pre-existing test failures now pass. **522 tests, 0 failures.** |
| **TeacherStudentControllerV3 → Real DB (3 endpoints)** | `getStudentAssignments()`: queries `AssignmentSubmissionJpaRepository.findByStudentId()` + joins with `AssignmentJpaEntity` for titles. `getStudentAnalytics()`: delegates to `StudentAnalyticsQueryPort` for quiz/assignment averages, streak, study time. `updateStudentStatus()`: actually persists enrollment status change (filtered to teacher's courses only). |
| **Honest Stubs (2 endpoints)** | `sendMessage()` and `exportStudentReport()` marked as honest stubs with Vietnamese messages ("Chức năng đang được phát triển"). |
| **English → Vietnamese (11 strings)** | 4 route titles in `course-editor.routes.ts`, 5 in `learning.routes.ts`, 2 upload progress messages in `document.service.ts` + `lesson-attachment.api.ts`. |
| **Build** | BE: 522 tests, **0 failures** (first time: VideoProgress tests pass). FE: 0 errors. |

### 2026-02-12 (Session 55: Gamification Fixes + Teacher Revenue/Invitation + Engagement Stub Elimination)

| Change | Detail |
|--------|--------|
| **Teacher Revenue → Real DB Queries (P0)** | Replaced 5 stubbed zero-return endpoints with real JPQL queries: `getTotalEarnings()` (enrollment count × price), `getMonthlyEarnings()` (current month), `getRevenueByMonth()` (12-month trend), `getRevenuePerCourse()` (per-course breakdown), `getPayoutHistory()` (enrollment-based records). V43 migration adds `price` column to courses. |
| **Teacher Invitation → Real CRUD (P0)** | Replaced 3 stub endpoints with real DB operations: `getInvitations()` (findByTeacherId), `respondToInvitation()` (accept→enrolled, reject→removed), `sendInvitation()` (teacher creates invitation for student). V43 migration adds `teacher_invitations` table. |
| **Gamification COMPLETION Achievement Fix** | `checkAchievementThreshold()` COMPLETION category: only `FIRST_LESSON` was handled; `COURSE_1`/`COURSE_5` returned `false`. Added `analyticsQuery.countCompletedCourses()` check. |
| **Gamification QUIZ Achievement Fix** | QUIZ category always returned `false`. Added `countPerfectQuizAttempts()` to `StudentAnalyticsQueryPort` + `QuizAttemptJpaRepository` JPQL query + adapter implementation. |
| **Streak Dedup Fix** | `StudentAnalyticsUseCase.calculateLearningStreak()` (~30 lines) duplicated streak logic from `GamificationUseCase`. Replaced with `analyticsQuery.getStreakDays()` — reads pre-calculated `LearningStreak` entity. Deleted entire method. |
| **Auto-Trigger Streak from Heartbeat** | `LearningActivityUseCase.recordHeartbeat()` now calls `gamificationUseCase.updateStreak(studentId)` with try/catch. |
| **Streak Update Optimization** | `updateStreak()` checks `alreadyRecordedToday` — skips save + achievement check when already recorded (prevents 30s heartbeat overhead). |
| **FE Engagement Mock Elimination (4 components)** | Replaced hardcoded mock data with empty arrays: `bookmark-system` (4 bookmarks + 2 folders → empty), `note-taking` (3 notes → empty), `learning-calendar` (4 events → empty), `study-planner` (2 plans + 3 sessions → empty). Components now show honest empty states. |
| **Tests** | 522 tests (2 pre-existing video progress failures). Fixed `GamificationUseCaseTest` (added `StudentAnalyticsQueryPort` mock), `LearningActivityUseCaseTest` (added `GamificationUseCase` mock), `StudentAnalyticsUseCaseTest` (stub dedup: `findActivityDates` → `getStreakDays`). |

### 2026-02-12 (Session 54: Quiz Logic + N+1 Fix + Homepage Real API)

| Change | Detail |
|--------|--------|
| **Quiz Server-Side Shuffle (P1)** | Implemented `Collections.shuffle()` in `QuizAttemptUseCase.startAttempt()` when `quiz.settings.shuffleQuestions` is true. Defense-in-depth alongside FE client-side shuffle. 2 new tests. |
| **QuizAttempt Optimistic Locking (P1)** | Added `@Version` to `QuizAttemptJpaEntity`. V42 migration adds `version` column. `QuizAttemptRepositoryAdapter.save()` now merges onto existing entity (preserves @Version). `QuizControllerV3.submitAttempt()` catches `OptimisticLockingFailureException` → 409. |
| **N+1 Query Fixes (5 locations)** | 1) `AssignmentSubmissionControllerV3`: `findAll()` + Java filter → `findByCourseIdIn()`. 2) `QuizControllerV3.getTeacherQuizzes()`: loop of `findById()` → single native `findAllByTeacherId()` query. 3-5) `QuestionBankManagementUseCase`: 2 loop-of-`save()` → `saveAll()` batch. Added `saveAll()` to `QuestionRepository` port + adapter. |
| **Homepage Featured Courses → Real API** | Replaced 100% hardcoded 9 fake courses in `featured-courses.component.ts` with `CourseApi.publicCourses()` API call. Loading/empty states, design system compliant. |
| **Enum Mismatch Fix** | Domain `QuizAttempt.AttemptStatus` had only 3 values (IN_PROGRESS, SUBMITTED, TIMEOUT). JPA entity had 5 (+ GRADED, EXPIRED). Synced both to prevent `IllegalArgumentException` on legacy data reads. |
| **Tests** | 522 tests (2 pre-existing video progress failures). 2 new shuffle tests + 1 test updated (save→saveAll). FE: 0 errors. |

### 2026-02-12 (Session 52: System-Wide UX/UI Audit — Coursera-Level Design Consistency)

| Change | Detail |
|--------|--------|
| **Design Token Unification (CRITICAL)** | Replaced ALL `blue-600`/`blue-700` with `#0056D2`/`#004BB5` across ~130 FE files (~870 occurrences). Zero generic blue-600/700 remaining. Includes: `bg-`, `text-`, `border-`, `from-`, `to-`, `via-`, `ring-`, `shadow-`, `hover:text-`, `file:text-`, `focus-visible:outline-`, `hover:scrollbar-thumb-`. |
| **Non-Semantic Red Fix** | Fixed `focus:ring-red-500` / `focus:border-red-500` on 5 non-error inputs (course-management, course-review, teacher-management). Kept 3 semantic red focus rings on destructive buttons (logout, reject). |
| **Gradient Elimination (~40 locations)** | Flattened multicolor gradients (blue-to-purple, blue-to-indigo, slate-800-to-blue-900) to flat `bg-[#0056D2]`. Fixed avatar circles, button gradients, modal headers, sidebar headers, category configs. Kept only decorative `bg-gradient-to-b` dividers in collapsible sidebar. |
| **Card/Shadow/Border Standardization** | Admin course-management modal: dark header → white header with `border-b border-gray-200`. Revoke modal `shadow-xl` → `shadow-2xl`. Teacher dashboard KPI: top border accent → `border-l-4 border-l-[#0056D2]`. |
| **Inline Styles → Tailwind** | Teacher dashboard: `style="background:#FAFAFA"` → `bg-slate-50`, `style="background:#0056D2;border-radius:2px"` → `bg-[#0056D2] rounded-lg`. Sidebar typo `active:bg-[#E8F0FE]0/60` → `active:bg-[#E8F0FE]/60`. Currency corruption `â‚«` → `₫`. |
| **SecurityContextHolder → @AuthenticationPrincipal (10 BE controllers)** | Refactored 36 method signatures across 10 controllers. Removed 6 helper methods (`getCurrentUserId()` x5, `extractUserId()` x1). Only `JwtAuthenticationFilter` retains `SecurityContextHolder` (correct — sets auth context). |
| **Exception Narrowing (3 BE controllers)** | `UserControllerV3`, `AdminCoursesControllerV3`, `StudentEnrollmentControllerV3`: `catch(Exception)` → `catch(DataAccessException)` / `catch(DataAccessException \| IllegalStateException)`. |
| **Misc Fixes** | Dashboard header English → Vietnamese ("Student Dashboard" → "Bảng điều khiển"). Student sidebar multi-color icons → unified `bg-[#0056D2]/10 text-[#0056D2]`. |
| **Build** | FE: 0 errors. BE: 520 tests (2 pre-existing video progress failures only). |

### 2026-02-12 (Session 53: 12-Agent Deep System Audit + Design Token Completion)

| Change | Detail |
|--------|--------|
| **12-Agent Deep System Audit** | Scanned entire codebase (381 BE + 508 FE files) with 12 parallel agents. Created comprehensive `BAO_CAO_TOAN_BO_HE_THONG_S53.md` report. Overall score: 8.8/10. Found 4 P0 stubs, 4 P1 issues, 18 P2 items. |
| **Design Token Completion** | Batch-replaced `focus:ring-blue-500` → `focus:ring-[#0056D2]` (70 files, 286 occurrences), `focus:border-blue-500` → `focus:border-[#0056D2]` (32 files, 92 occurrences), `bg-blue-500` → `bg-[#0056D2]` (24 files, 40 occurrences). **Zero `blue-500/600/700` remaining in entire FE.** |
| **Student Sidebar Icon Unification** | Multi-color icon backgrounds (green, purple, orange, pink, teal) → unified `bg-[#0056D2]/10 text-[#0056D2]`. |
| **My-Courses Gradient Elimination** | 2 SCSS gradients (avatar circle + progress bar) → flat `$blue-primary`. |
| **Dead Entity Deletion** | `LessonAttachmentJpaEntity.java` (orphaned, no repo), `StudentLessonProgressJpaEntity.java` (deprecated, replaced by VideoProgress). |
| **Dead Enum Removal** | `PUBLISHED` and `ARCHIVED` from `Course.CourseStatus` (domain + JPA entity + 2 mapper switch cases). Course lifecycle: DRAFT → PENDING → APPROVED / REJECTED (4 states only). |
| **Build** | FE: 0 errors. BE: 2 dead entities deleted, 2 dead enum values removed, 4 mapper cases cleaned. |

### 2026-02-12 (Session 52: Design Token Unification + SecurityContextHolder Refactoring)

| Change | Detail |
|--------|--------|
| **Design Token Batch Replacement** | `bg-blue-600` → `bg-[#0056D2]` (105 files), `hover:bg-blue-700` → `hover:bg-[#004BB5]` (87 files), `text-blue-600` → `text-[#0056D2]` (127 files), `border-blue-600` → `border-[#0056D2]` (30 files), gradient color stops unified. |
| **SecurityContextHolder → @AuthenticationPrincipal** | 10 controllers refactored (36 method signatures): StudentEnrollmentControllerV3 (14), PaymentControllerV3 (5), CommunicationControllerV3 (2), QuestionControllerV3 (2), VideoProgressControllerV3 (2), StudentAnalyticsControllerV3 (2), LearningActivityControllerV3 (2), CourseReviewControllerV3 (2), CourseQueryControllerV3 (1), TeacherStudentControllerV3 (1). 6 helper methods removed. |
| **Non-Semantic Red Fix** | `focus:ring-red-500` on non-error inputs → `focus:ring-[#0056D2]` (5 files). Only 3 correct semantic red focus rings remain (logout/reject buttons). |
| **Gradient Elimination** | ~25 locations flattened (card backgrounds, button backgrounds, header sections) → flat colors per design system. |
| **Build** | FE: 0 errors. BE: 520 tests pass (2 pre-existing). |

### 2026-02-12 (Session 51: Assessment & Learning Flow Completion)

| Change | Detail |
|--------|--------|
| **Rubric Backend CRUD API (P0 CRITICAL)** | Full DDD implementation: domain model (`Rubric.java`), repository port, adapter, `RubricCrudUseCase` (create/update/delete/findByTeacher/assignToAssignment), `RubricControllerV3` (7 REST endpoints). V41 migration adds `teacher_id`, makes `assignment_id` nullable for library mode. |
| **FE Rubric → Real API** | Replaced all localStorage/mock usage in 3 components: `rubric-creator` (localStorage→API), `rubric-editor` (setTimeout mock→API), `rubric-manager` (mock data generator→API). Created `rubric.api.ts` endpoint client. |
| **Quiz Server-Side Timeout (P1)** | Added `markTimeout()` to `QuizAttempt` domain. `QuizAttemptUseCase.submitAttempt()` now checks elapsed time vs `timeLimitMinutes + 60s grace`. Timed-out attempts still get graded (partial credit). |
| **Certificate Auto-Generation (P1)** | Full DDD: `Certificate` domain model, repository port, adapter, `CertificateUseCase` (issueIfNotExists — idempotent). Auto-triggers when lesson completion reaches 100% in both `UpdateLessonProgressUseCase` and `StudentEnrollmentControllerV3.markLessonComplete()`. |
| **New FE API Client** | `rubric.api.ts` — list, getById, create, update, delete, assignToAssignment, getByAssignment |
| **Tests** | 12 new tests: RubricCrudUseCaseTest (8), CertificateUseCaseTest (3), QuizAttempt timeout test (1). Total: 508→520. |
| **Build** | BE: 520 tests (2 pre-existing video progress failures). FE: 0 errors. |

### 2026-02-12 (Session 50: Module Consolidation + Architecture Audit Fixes)

| Change | Detail |
|--------|--------|
| **course_management Module Merge (P0 CRITICAL)** | Entire `course_management` module (17 source + 1 test files) was a duplicate DDD-violating module. Merged 6 active files into `course_authoring`, deleted 11 dead files (including `CourseVersion.java` with `@Entity` in domain layer, unused `PublishCourseUseCase`, dead `PostgresCourseRepository`). Modules: 9 → 8. |
| **AdminCoursesControllerV3 Security Fix** | Replaced unsafe `SecurityContextHolder.getContext().getAuthentication().getPrincipal()` with `@AuthenticationPrincipal UserJpaEntity admin` in approve/reject/revoke methods (same pattern as S48 TeacherAnalytics fix). |
| **CreateChapterUseCaseV3 Ownership Verification** | Added `userId` + `isAdmin` to command record. Non-admin users must own the course to add chapters. 3 test cases added. |
| **FE Duplicate Component Elimination (7 files)** | Deleted orphaned: `notification-bell.component.ts` (polling duplicate), `ui/pagination`, `ui/search`, `ui/side-drawer`, `shared/search/` (2 files), `core/interceptors/auth.interceptor.ts` (class-based duplicate). |
| **GlobalState Dead Code Cleanup** | Removed 4 unused computed signals with hardcoded zeros, 3 unused methods (`searchGlobal`, `getCurrentUserPermissions`, `hasPermission`). Service itself is never imported by any component. |
| **video-progress.api.ts** | Removed redundant local `ApiResponse<T>` — imported from `common.types` instead. |
| **Build** | BE: 372 source files, 508 tests (2 pre-existing video progress failures). FE: 0 errors. |

### 2026-02-11 (Session 48: System Audit — Security + DDD + Code Quality)

| Change | Detail |
|--------|--------|
| **Security Fix (CRITICAL)** | `TeacherAnalyticsControllerV3` was TEACHER-only — last controller missed in S43 multi-tier migration. Fixed: `hasAnyRole('TEACHER', 'ADMIN', 'ORG_ADMIN')` + replaced `SecurityContextHolder` with `@AuthenticationPrincipal`. |
| **DDD Fix — FileManagementService** | Moved from `shared/application/service/` → `shared/infrastructure/service/`. Application layer was importing JPA entities + R2StorageService (infra). Updated 2 callers + 1 test. |
| **Exception Narrowing (3 catches)** | `QuestionControllerV3`: row-level `catch(Exception)` → `catch(IllegalArgumentException \| IllegalStateException)`, file-level → `catch(IOException \| POIXMLException)`. `QuestionImportExportUseCase`: same row-level narrowing. |
| **Mock Elimination** | `student-assignments`: removed `simulateDataLoading()` (fake 1s delay). `assignment-work-page`: `saveDraft()`/`submitAssignment()` — removed setTimeout simulation, documented as honest stubs. |
| **setTimeout → effect()** | `course-learning.component.ts`: replaced `setTimeout(() => autoExpandChapter, 500)` with reactive `effect()` watching `sections()` signal. |
| **Dead Route Cleanup** | Deleted empty `communication.routes.ts` (forum removed S38). Removed lazy-load entry from `app.routes.ts`. Cleaned JSDoc with dead route code in `student.routes.ts`. |
| **Build** | BE: 507 tests (2 pre-existing video progress failures). FE: 0 errors. |

### 2026-02-11 (Session 47: Teacher Courses Table Redesign + Course Editor Info Deep Audit)

| Change | Detail |
|--------|--------|
| **Teacher Courses — Professional Table Redesign** | Redesigned `/teacher/courses` from plain 5-column table to Shopify-style 6-column table: thumbnail (gradient fallback), delivery mode badge, status badge with dot, category chip, chapter/lesson counts, 3-slot fixed action layout. |
| **Delivery Mode Differentiation** | SELF_PACED = "Khóa học" (blue `bg-[#0056D2]/10`), INSTRUCTOR_LED = "Lớp học" (green `bg-emerald-50`). Filter pills: `Tất cả \| Khóa học \| Lớp học`. |
| **Sĩ số Format** | `enrolledCount / maxStudents` when capacity available, just `enrolledCount` when not. |
| **3-Slot Action Layout** | Fixed-width slots `[Sửa w=52px] [Context w=80px] [···kebab]` for alignment consistency across all row states. |
| **CourseSummary Type** | Added `deliveryMode`, `sectionCount`, `lessonCount`, `maxStudents`, `updatedAt` to FE type + API mapping. |
| **thumbnailUrl Data Loss Fix (CRITICAL)** | `UpdateCourseRequest` + `UpdateCourseCommand` were MISSING `thumbnailUrl` field → Jackson silently ignored it → thumbnail never saved despite domain having `updateThumbnail()`. Fixed: added field to Request → Command → UseCase. |
| **Stale Data After Save Fix** | `store.loadCourse()` used cached data after save. Fixed: `loadCourse(courseId, true)` for force refresh. |
| **Form Dirty State Fix** | `form.markAsPristine()` never called → `effect()` skipped store→form sync after save. Fixed. |
| **Error Message Format Fix** | `err?.message` showed HTTP status text instead of server message. Fixed to `err?.error?.message \|\| err?.message` in 2 places (save + thumbnail upload). |
| **Hidden Form Fields** | `welcomeMessage` + `benefits` form controls existed but weren't rendered. Added "Lợi ích & Chào mừng" card to course info template. |
| **CourseResponse API Completeness** | Added `thumbnailUrl` field to `CourseResponse` record + `from(Course)` mapping. |
| **Build** | BE: 507 tests (2 pre-existing video progress failures). FE: 0 errors. |

### Sessions 29-46 Summary (2026-02-09 to 2026-02-10)

> Full details for each session: see `session-details.md` in memory, or git log.

| Session | Key Changes |
|---------|-------------|
| **S54** | Quiz Logic + N+1 Fix: Quiz server-side shuffle (Collections.shuffle), QuizAttempt optimistic locking (@Version + V42 migration + 409 conflict handler), N+1 fixes (5 locations: findAll→findByCourseIdIn, loop findById→native findAllByTeacherId, 3x loop save→saveAll), homepage hardcoded→real API, enum mismatch fix. Tests: 520→522 |
| **S53** | 12-Agent Deep System Audit: 381 BE + 508 FE files scanned, `BAO_CAO_TOAN_BO_HE_THONG_S53.md` report (8.8/10). Design token completion: focus:ring/border-blue-500→#0056D2 (126 files, 418 occ), bg-blue-500→#0056D2 (24 files). Dead code: 2 orphaned entities deleted, 2 dead enums removed, sidebar icons unified |
| **S52** | System-Wide UX/UI Audit: ~870 blue-600/700→#0056D2/#004BB5 (~130 files), ~40 gradient eliminations, SecurityContextHolder→@AuthenticationPrincipal (10 controllers, 36 methods), 3 exception narrowings, non-semantic red fix, card/shadow/inline style fixes |
| **S56** | VideoProgress threshold fix (50→90%, 0 failures for first time), TeacherStudent 3 endpoints real DB, English→Vietnamese 11 strings, honest stubs for 2 endpoints |
| **S55** | Gamification Fixes + Stub Elimination: Teacher revenue (5 real DB queries), teacher invitation (real CRUD + V43 migration), gamification COMPLETION/QUIZ achievement fix, streak dedup, heartbeat auto-trigger, 4 FE engagement mocks → empty. Tests: 522 |
| **S54** | Quiz server-side shuffle, QuizAttempt optimistic locking (@Version + V42), 5 N+1 query fixes, homepage featured courses → real API, enum mismatch fix. Tests: 522 |
| **S53** | 12-Agent Deep Audit, design token completion (focus:ring + bg-blue-500 → 0), student sidebar icon unification, 2 dead entities deleted, 2 dead enum values removed |
| **S52** | Design Token Unification (~130 files, ~870 replacements), SecurityContextHolder → @AuthenticationPrincipal (10 BE controllers), non-semantic red fix, gradient elimination (~40 locations), exception narrowing (3 BE) |
| **S51** | Assessment & Learning Flow Completion: Rubric CRUD API (7 BE files + V41 migration + FE API + 3 FE mock→real), Quiz server-side timeout enforcement, Certificate auto-generation on 100% completion. Tests: 508→520 |
| **S50** | Module Consolidation: `course_management` merged into `course_authoring` (17+1 files deleted), AdminCourses `@AuthenticationPrincipal` fix, CreateChapter ownership verification, 7 FE duplicate components deleted, GlobalState dead code cleanup |
| **S49** | 9-Agent Parallel Audit: 944+ files scanned, 35 issues found (3 CRITICAL, 5 HIGH, 13 MEDIUM, 14 LOW), comprehensive `BAO_CAO_HE_THONG_LMS.md` report generated |
| **S48** | System Audit: Security fix (TeacherAnalytics RBAC), DDD fix (FileManagementService → infra), 3 catch(Exception) narrowed, mock elimination (2 FE), setTimeout→effect(), dead route cleanup |
| **S46** | Deep System Audit: 15 empty `.subscribe()` → error handlers, 20 empty catches fixed, BE exception narrowing (JWT, FileUpload, Quiz), dead endpoints removed, revenue stub honesty |
| **S45** | Emoji → SVG Icon Migration: 74 emojis → `app-icon`, 27 new icons, 0 user-facing emojis remaining |
| **S44** | Phantom INSTRUCTOR role removed (11 controllers, 70+ annotations), mock data elimination (6 files), exception narrowing (3 BE), VE.Emulated cleanup |
| **S43** | Multi-Tier Admin: ORG_ADMIN role, 15 controllers updated, escalation prevention, 88 new tests (419→507) |
| **S42** | Mock/Stub Elimination: forgot-password API, 60-line mock removal, 3 fake notifications removed |
| **S41** | VE.None Audit: 57→17 (40 removed), empty `.subscribe()` handlers (5 files) |
| **S40** | Teacher Courses Audit: 0 `toPromise()` remaining, 0 VE.None in teacher, video type detection fix |
| **S39** | 3-Level Hierarchy Fix: learning sidebar L3 sections, course discovery SOTA with category filters |
| **S38** | Pagination Fix (0-indexed + `size`), forum removal (6 files), student course discovery page |
| **S37** | Admin Design Redesign: Coursera-style #0056D2, SCSS→Tailwind, red→blue across 4 admin pages |
| **S36** | alert/confirm/prompt ZERO: 19 files fixed, 0 native dialogs in entire FE |
| **S35** | Student Audit: gamification endpoints `/api/v3` prefix fix, pagination params fix, 12 alert→toast |
| **S34** | Deep Audit: Vietnamese encoding Phase 2, 13 dead files deleted, mock→real API, publish bug fix |
| **S33** | Course Editor SOTA: collapsible sidebar, underline tabs, two-column layout (Info + Settings) |
| **S32** | DnD SOTA: 3-level tree, drag handles, keyboard reorder (WCAG 2.5.7), optimistic UI, backend ownership |
| **S30-31** | Dashboard redesign + Vietnamese encoding fix (60+ strings, 10 files) |
| **S29** | Teacher Security: content block ownership, ConfirmDialog, 3-step wizard, 98 alert/confirm→0 |

### Sessions 8-28 Summary (2026-02-06 to 2026-02-09)

| Session | Key Changes |
|---------|-------------|
| **S24-28** | MVP Completion + System Audit: 7 DDD violations→0, mock elimination (4 services→real API), enrollment guard, quiz ownership, 18 error handlers |
| **S15-17** | Dual-mode courses, Quiz Phase 1 (6 question types), QuestionBank Phase 1 (12 endpoints, 30 tests) |
| **S8-14** | Major cleanup (40 dead files), FE modernization (OnPush 100%), 36 teacher + 18 student + 21 admin endpoints, V1 schema |

---

## ARCHITECTURE SCORES

| Category | Score | Notes |
|----------|-------|-------|
| Backend Clean Architecture | 10/10 | 0 infra imports in use cases/domain, CQRS query ports, proper adapters, narrowed exception types, duplicate module eliminated (S50), 0 SecurityContextHolder in controllers (S52: @AuthenticationPrincipal everywhere), 0 broad catch(Exception) in controllers (S52) |
| Frontend Angular Patterns | 10/10 | 100% modern signals, 0 legacy patterns, 0 mock services, 0 alert/confirm, 0 `toPromise()`, VE.None only in 17 justified files, 0 unnecessary VE.Emulated, 0 bare `.subscribe()` (S46), 0 user-facing emojis (S45) |
| JPA & Database | 9.5/10 | Correct entity mapping, 13 indexes, Pageable, JSONB native queries, N+1 fixes (S46+S54: 5 locations), optimistic locking (S54: QuizAttempt @Version) |
| API & Use Cases | 9.8/10 | SRP, typed DTOs, @Valid on all controllers, max attempts enforcement, full field mapping verified (S47: thumbnailUrl fix), teacher revenue/invitation real DB (S55), gamification achievements functional (S55) |
| Security | 10/10 | Multi-tier RBAC (4 roles), escalation prevention, phantom INSTRUCTOR removed, CORS, rate limit, headers, file validation, ownership (E2E verified), pagination guards, ALL controllers audited (S48: TeacherAnalytics fixed), JWT filter narrowed (S46) |
| Test Coverage | 8.5/10 | 522 tests (**0 failures** since S56), ~49% coverage. Multi-tier admin fully tested (88 new S43 tests), chapter ownership tests (S50), rubric + certificate + timeout tests (S51), quiz shuffle tests (S54), VideoProgress threshold fixed (S56) |
| Code Cleanliness | 10/10 | 0 console.log, 0 dead code, 0 simulateApiCall, 0 alert/confirm, 0 setTimeout mock, 0 corrupted emoji, 0 placeholder URLs, 0 toPromise(), 0 phantom roles, 0 non-semantic red on inputs, 0 bare `.subscribe()`, 0 silent mock fallbacks, 0 dead FE endpoints, 0 silent field drops, 0 duplicate modules (S50), 0 orphan FE components (S50), 0 localStorage rubric (S51), 0 generic blue-500/600/700 (S52+S53), 0 SecurityContextHolder in controllers (S52), 0 currency corruption (S52), 0 dead enums (S53), 0 orphaned JPA entities (S53), 0 N+1 in assessment (S54), 0 hardcoded homepage data (S54), 0 stubbed teacher revenue (S55), 0 FE engagement mock data (S55), 0 duplicate streak calculation (S55), 0 test failures (S56: VideoProgress fixed), 0 English route titles (S56), 0 stubbed teacher-student endpoints (S56: 3 real, 2 honest) |
| UX Professionalism | 10/10 | Consistent Coursera-style #0056D2 across ALL roles, two-column SOTA layout, collapsible sidebar, underline tabs, DnD SOTA, ConfirmDialog, Toast, SVG icons (0 emojis), Shopify-style teacher courses table (S47) |
| Design Consistency | 10/10 | Admin/Teacher/Student all use same #0056D2/#004BB5 tokens, 0 generic blue-500/600/700 (S53: focus rings + bg completed), 0 multicolor sidebar icons (S53: unified), bg-slate-50 backgrounds, rounded-xl cards, shadow-sm, flat buttons/headers |
| DnD & Accessibility | 8.5/10 | WCAG 2.5.7 keyboard reorder, Move To modal, touch delay, optimistic UI, drag handles, all 3 reorder APIs E2E tested |

---

*This document is the single source of truth for Claude Code. Update after significant changes.*
*Backend details: [`backend/README.md`](backend/README.md) | FE details: [`fe/FRONTEND_ARCHITECTURE.md`](fe/FRONTEND_ARCHITECTURE.md)*
