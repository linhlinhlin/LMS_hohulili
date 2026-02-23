# CLAUDE.md

> **Last Updated**: 2026-02-23 | **Version**: 6.2 | **Status**: MVP Complete + Email/VNPay/Password Reset (S63)

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

### Backend: RUNNING (397 files | 550 tests | 219 endpoints)
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

> **Full backend reference**: [`backend/README.md`](backend/README.md) (397 files, 219 endpoints, all patterns documented)
> **Swagger UI**: http://localhost:8088/swagger-ui (interactive API docs)

```
backend/src/main/java/com/example/lms/
├── identity/              # User, Auth, Roles (JWT), Multi-tier Admin
├── course_authoring/      # Course, Chapter, Lesson, ContentBlock, Package, Category, Review, Admin ops
├── learning_delivery/     # LearningClass, Enrollment, Progress, Gamification, Analytics, Video, Certificate
├── assessment/            # Assignment, Quiz, Question, Submission, Rubric, QuestionBank
├── communication/         # Messages, Conversations
├── ai_assistant/          # AI Chat integration (SSE streaming)
├── shared/                # Value objects, domain events, exceptions, file service, payment, email, VNPay, admin settings
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
│   ├── auth/         # 4 components - Login, register, forgot-password, reset-password
│   ├── communication/# 2 components - Notifications
│   └── payment/      # 4 components - VNPay integration
├── shared/           # 48 reusable components, 8 services
└── state/            # Global state: course, class, global
```

**Stats**: 237 components | ~56 services | 70+ routes | 510 TS files

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
| Flyway Migrations | `src/main/resources/db/migration/V1, V26-V47` |
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

### Email / Payment / Password Reset
| Purpose | File |
|---------|------|
| Email Port | `shared/application/port/EmailServicePort.java` |
| SMTP Adapter (dev) | `shared/infrastructure/email/SmtpEmailAdapter.java` |
| Resend Adapter (prod) | `shared/infrastructure/email/ResendEmailAdapter.java` |
| Email Templates | `shared/infrastructure/email/EmailTemplates.java` |
| Password Reset Token | `identity/infrastructure/persistence/entity/PasswordResetTokenJpaEntity.java` |
| Request Reset UC | `identity/application/usecase/RequestPasswordResetUseCase.java` |
| Reset Password UC | `identity/application/usecase/ResetPasswordUseCase.java` |
| VNPay Config | `shared/infrastructure/vnpay/VnPayConfig.java` |
| VNPay Gateway | `shared/infrastructure/vnpay/VnPayGatewayAdapter.java` |
| Payment Gateway Port | `shared/application/port/PaymentGatewayPort.java` |
| FE Reset Password | `fe/src/app/features/auth/reset-password/reset-password.component.ts` |

### PWA / Offline
| Purpose | File |
|---------|------|
| Offline DB Schema | `fe/src/app/core/db/lms-offline.db.ts` |
| Network Status | `fe/src/app/core/services/network-status.service.ts` |
| Offline Sync | `fe/src/app/core/services/offline-sync.service.ts` |
| Course Download | `fe/src/app/core/services/course-download.service.ts` |
| SW Update | `fe/src/app/core/services/sw-update.service.ts` |
| Storage Manager | `fe/src/app/core/services/storage-manager.service.ts` |
| Offline Interceptor | `fe/src/app/api/interceptors/offline.interceptor.ts` |
| NGSW Config | `fe/ngsw-config.json` |
| Offline Fallback | `fe/src/app/shared/components/offline-fallback/offline-fallback.component.ts` |
| Companion SW | `fe/src/sw.js` (sync + push only, no fetch) |
| BE Sync UseCase | `backend/.../shared/application/usecase/SyncUseCase.java` |
| BE Sync Controller | `backend/.../shared/infrastructure/web/SyncControllerV3.java` |

---

## BACKEND MODULE STATS

| Module | Domain Models | Use Cases | Controllers | Endpoints |
|--------|--------------|-----------|-------------|-----------|
| identity | 2 | 9 | 2 | 22 |
| course_authoring | 6 | 23 | 6 | 53 |
| learning_delivery | 9 | 17 | 10 | 51 |
| assessment | 11 | 14 | 6 | 59 |
| communication | 4 | 1 | 1 | 6 |
| ai_assistant | 3 | 1 | 1 | 11 |
| shared | 3 | 1 | 3 | 12 |
| **Total** | **38** | **66** | **29** | **219** |

**Note**: `course_management` module merged into `course_authoring` in S50. Counts verified 2026-02-23.

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
| Spring Boot Mail | 3.2.x |
| Resend Java SDK | 3.1.0 |
| Lombok | 1.18.32 |

### Frontend
| Component | Version |
|-----------|---------|
| Angular | 20.3 |
| TypeScript | 5.x |
| RxJS | 7.x |
| Sass | (managed) |
| Dexie.js | 4.x |
| Shaka Player | 5.x |

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

### Session 63 (2026-02-23): VNPay Payment + Email Service + Password Reset

**4 phases** | BE 550 tests, 0 failures | FE: 0 errors | 16 new BE files + 1 new FE component

**Phase 1 - Email Infrastructure:**
- `EmailServicePort` interface (4 methods: passwordReset, welcome, enrollmentConfirmation, paymentReceipt)
- `SmtpEmailAdapter` (@Profile("dev"), JavaMailSender, Gmail SMTP with App Password)
- `ResendEmailAdapter` (@Profile("prod"), Resend Java SDK 3.1.0)
- `EmailTemplates` (4 Vietnamese HTML templates, #0056D2 design tokens, responsive inline CSS)
- Gmail SMTP verified working (welcome + password reset emails sent successfully)

**Phase 2 - Password Reset (OWASP-compliant):**
- `V46__password_reset_tokens.sql` migration (token_hash SHA-256, expires_at, used_at)
- `RequestPasswordResetUseCase`: 32-byte SecureRandom → Base64 URL-safe, SHA-256 hash storage, 30min expiry
- `ResetPasswordUseCase`: Hash-based lookup, single-use validation, BCrypt password update
- Anti-enumeration: same response for existing/non-existing emails
- FE `ResetPasswordComponent`: new-password + confirm form, auto-redirect to login after 3s

**Phase 3 - VNPay v2.1 Integration:**
- `VnPayConfig` (@ConfigurationProperties), `VnPayUtil` (HMAC-SHA512), `PaymentGatewayPort` interface
- `VnPayGatewayAdapter`: sorted params + HMAC-SHA512 checksum, amount×100, diacritics removal
- `V47__vnpay_payment_fields.sql` (4 new columns on payment_transactions)
- 3 new endpoints: `POST /vnpay/create-url`, `GET /vnpay-ipn` (public), `GET /vnpay-return` (public)
- IPN handler: checksum verification, payment status update, auto-enrollment, email notifications
- SecurityConfig: whitelisted IPN + return URLs (no JWT required)
- FE: `PaymentApi.createVnPayUrl()` + VNPay redirect flow in PaymentService

**Phase 4 - Integration:**
- Welcome email sent on registration (AuthControllerV3)
- Payment receipt + enrollment confirmation emails sent in IPN handler

### Session 62 (2026-02-23): PWA Download-First Hardening

**12 fixes** | 550 tests, 0 failures

- NetworkStatusService maritime default+debounce+probeLatency, offline interceptor auth whitelist
- Sync dedup+backoff+conflict matching, background refresh race fix
- Download resume checkpoints+atomic txn, @Valid on 3 controllers
- SyncUseCase catch(Exception)→specific, login design tokens, speed-grader responsive, beforeunload warning

### Session 61 (2026-02-23): PWA Download-First + Data Sync + SOTA Audit

**5 sub-sessions (S61–S61d)** | FE 0 errors | BE 550 tests, 0 failures

**Phase 1 - PWA Foundation (S61):**
- Angular NGSW config (6 data groups: catalog, content, profile, progress, images, enrollments)
- Dexie.js 4 IndexedDB schema (7 tables: courses, chapters, lessons, progress, submissions, quizAttempts, syncQueue)
- NetworkStatusService (3-tier: none/slow/fast), StorageManagerService, ScreenWakeLockService
- OfflineIndicatorComponent, StorageBudgetComponent, SwUpdateService (6h check + user confirmation dialog)

**Phase 2 - Adaptive Video (S61):**
- Shaka Player 5.x integration with maritime ABR (60s buffer, 10 retries, 500kbps default)
- QoETrackerService (startup, rebuffer, bitrate changes, connection type)
- OfflineVideoService (Cache API, ReadableStream download + progress)

**Phase 3 - Offline Capability (S61b):**
- OfflineSyncService: batch sync via `/api/v3/sync/push`, failedCount signal, retryFailed()
- CourseDownloadService: full course download (metadata + chapters + lessons), storage quota pre-check (90%)
- OfflineFallbackComponent: downloaded courses list, pending/failed sync UI, retry button
- Offline HTTP interceptor: GET→IndexedDB fallback, POST/PUT/PATCH/DELETE→sync queue (fake 202)

**Phase 4 - Deep Audit (S61c, CoT SOTA Research):**
- SSE reconnect + exponential backoff (3 retries: 1s/2s/4s), 180s timeout, 15s heartbeat
- **BE SyncUseCase implemented** (was 100% stubbed): routes to TrackVideoProgressUseCase with additive merge
- **Conflict resolution**: Additive merge (video segments), Timestamp LWW (progress), Server-wins (grades/quiz)
- Removed dual SW conflict: sw.js now only handles sync+push (no fetch handlers)
- SW update: user confirmation dialog instead of auto-reload (prevents data loss during quiz)
- manifest.webmanifest branding update, browserconfig.xml created

**Phase 5 - Download-First Upgrade (S61d, CoT SOTA Research):**
- **Architecture decision**: Offline-Capable → Download-First (not full Offline-First). Referenced Moodle Mobile, Coursera, OTG/Seagull, Google Workbox stale-while-revalidate
- **LearningService.loadCourse()**: Downloaded courses read from IndexedDB instantly (0 spinner), background refresh from server (stale-while-revalidate)
- **LearningService.loadLesson()**: Same Download-First pattern with lesson-level cache + background refresh
- **CourseDownloadService**: Added `isDownloadedSync()`, `getOfflineCourse()`, `getOfflineChapters()`, `getOfflineLesson()`, `getOfflineLessons()`
- **SyncUseCase stubs→real**: All 4 entity types routed (videoProgress, lessonProgress, submission, quizAttempt) + pullChanges() + getStatus()
- **SyncUseCaseTest**: 23 new unit tests (7 nested classes, 0 failures)
- **NetworkStatusService spec**: 10 tests covering connectionTier/connectionLabel reactivity
- **Auto-redirect /offline**: app.ts effect monitors `NetworkStatusService.online()` → saves URL → redirects → restores on reconnect
- **Background Sync**: `navigator.serviceWorker.ready.then(reg => reg.sync.register('lms-offline-sync'))`

### Session 60 (2026-02-13): Teacher Assignments Deep-Dive + INSTRUCTOR_LED Enforcement

**11 issues fixed** | 527 tests, 0 failures | FE: 0 errors

- **BE hardcoded zeros→real DB**: `GetTeacherAssignmentsSummaryUseCase` + `GetAssignmentsByCourseUseCase` now use batch JPQL via new `AssignmentStatsQueryPort` + adapter
- **INSTRUCTOR_LED enforcement**: `CreateAssignmentUseCaseV3` validates course delivery mode before creating assignments
- **GradeRequest field mismatch**: Added `score` alongside `grade` (FE sends `score`, BE accepts both)
- **Batch grading endpoint**: `PATCH /api/v3/assignments/{id}/submissions/batch-grade`
- **FE mock elimination**: Removed fake `gradedCount`, fixed submission mapping (List vs Page), rubric tab→real API
- **Quiz-list stub→real API**: 175-line functional component using `QuizApi.getTeacherQuizzes()`
- **Rubric unassign**: `DELETE /api/v3/rubrics/assignment/{assignmentId}` + domain `Rubric.unassign()`
- **5 new tests**: INSTRUCTOR_LED reject, course not found, deliveryMode in summary

### Session 59 (2026-02-12): Full Vietnamese Localization

- ALL 29 controllers: ~200 ApiResponse messages + ~60 validation annotations → Vietnamese
- FE: 8 aria-labels, 12 error messages → Vietnamese
- **Result: 0 English user-facing messages in entire codebase** | 522 tests, 0 failures

### Sessions 50-58 Summary

| Session | Key Changes |
|---------|-------------|
| **S58** | Complete design token (0 blue-*), 0 catch(Exception), 30+ EN→VN messages |
| **S56** | VideoProgress threshold fix (0 test failures!), TeacherStudent 3 real endpoints |
| **S55** | Teacher revenue/invitation real DB, gamification COMPLETION/QUIZ fix, streak dedup |
| **S54** | Quiz shuffle + optimistic locking + 5 N+1 fixes + homepage real API (522 tests) |
| **S53** | 12-agent deep audit, design token completion, dead code cleanup |
| **S52** | Design tokens (~870 replacements), SecurityContextHolder→@AuthPrincipal (10 controllers) |
| **S51** | Rubric CRUD API + Quiz timeout + Certificate auto-generation (520 tests) |
| **S50** | Module merge (course_management→course_authoring), 7 FE duplicates deleted |

### Sessions 29-49 Summary

| Session | Key Changes |
|---------|-------------|
| **S48-49** | Deep audits (9+12 agents), security fix (TeacherAnalytics RBAC), DDD fix |
| **S47** | Teacher courses table redesign, thumbnailUrl data loss fix |
| **S43-46** | Multi-tier admin (ORG_ADMIN), emoji→SVG, INSTRUCTOR removal, stub elimination |
| **S37-42** | Design standardization #0056D2, mock elimination, forum removal |
| **S29-36** | ConfirmDialog, Toast, Vietnamese encoding, DnD SOTA, 0 native dialogs |

### Sessions 8-28 Summary

| Range | Key Changes |
|-------|-------------|
| **S24-28** | MVP completion, 7 DDD violations→0, mock→real API |
| **S15-17** | Dual-mode courses, Quiz (6 types), QuestionBank (12 endpoints) |
| **S8-14** | 40 dead files cleanup, OnPush 100%, V1 schema |

---

## ARCHITECTURE SCORES (Post-S63)

| Category | Score | Key Facts |
|----------|-------|-----------|
| Backend Clean Architecture | 10/10 | 0 infra imports in domain, CQRS query ports, @AuthenticationPrincipal everywhere, port-adapter email/payment |
| Frontend Angular Patterns | 10/10 | 100% signals, 0 legacy patterns, 0 mock services, 0 alert/confirm, 0 bare `.subscribe()` |
| PWA / Download-First | 9.7/10 | NGSW + Dexie.js, Download-First (stale-while-revalidate), batch sync, conflict resolution, auto-redirect /offline |
| JPA & Database | 9.5/10 | Correct entity mapping, N+1 fixes, optimistic locking, batch JPQL queries |
| API & Use Cases | 9.9/10 | SRP, typed DTOs, @Valid, real DB queries, email/VNPay/password-reset fully implemented |
| Security | 10/10 | Multi-tier RBAC (4 roles), OWASP password reset, anti-enumeration, VNPay HMAC-SHA512 |
| Test Coverage | 8.8/10 | 550 tests, **0 failures**, ~50% coverage |
| Code Cleanliness | 10/10 | 0 dead code, 0 mocks, 0 stubs (except 3 honest), 0 English messages, 0 generic blue-* |
| UX & Design | 10/10 | Consistent #0056D2 tokens, Coursera-style, SVG icons, DnD WCAG 2.5.7 |

---

*This document is the single source of truth for Claude Code. Update after significant changes.*
*Backend details: [`backend/README.md`](backend/README.md) | FE details: [`fe/FRONTEND_ARCHITECTURE.md`](fe/FRONTEND_ARCHITECTURE.md)*
