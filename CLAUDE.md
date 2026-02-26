# CLAUDE.md

> **Last Updated**: 2026-02-26 | **Version**: 10.0 | **Status**: Production Ready + Seed Data (806 tests, 0 failures)

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

# Production Deploy (GCP VM with auto-HTTPS)
cp .env.prod.example .env.prod && nano .env.prod  # Fill real values
chmod +x deploy.sh && ./deploy.sh
# Site: https://holilihu.online
```

**Test Accounts** (auto-created):
- ADMIN: `admin@maritime.edu` / `admin123`
- ORG_ADMIN: `orgadmin@maritime.edu` / `orgadmin123`
- TEACHER: `teacher@maritime.edu` / `teacher123`
- STUDENT: `student@maritime.edu` / `student123`

**Seed Accounts** (V54 migration):
- 10 Teachers: `tranngocdai@maritime.edu` etc. / `Maritime@2026`
- 25 Students: `nguyenvanan@sv.maritime.edu` etc. / `Student@2026`
- Seed Admin: `phamvanhai@maritime.edu` / `Maritime@2026`
- Seed ORG_ADMIN: `nguyenlanhuong@maritime.edu` / `Maritime@2026`

---

## CURRENT SYSTEM STATUS

### Backend: RUNNING (420+ files | 806 tests | 260+ endpoints)
| Component | Port |
|-----------|------|
| Spring Boot API | 8088 |
| PostgreSQL 16 | 5432 |
| Swagger UI | 8088/swagger-ui |

### Quick Health Check
```bash
curl -s http://localhost:8088/actuator/health
# Expected: {"status":"UP"}

curl -s http://localhost:8088/api/v3/courses?page=0&size=20 | head -100

curl -s -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}'
```

---

## PROJECT ARCHITECTURE

### Backend (Clean Architecture + DDD)

> **Full backend reference**: [`backend/README.md`](backend/README.md)

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
├── core/             # Auth, guards, global services
├── features/
│   ├── admin/        # 23 components - Dashboard, user/course management, course preview
│   ├── teacher/      # 68 components - Course editor, assignments, grading, quiz
│   ├── student/      # 12 components - Learning, enrollments, messages
│   ├── ai-chat/      # 15 components - AI assistant (DDD + streaming)
│   ├── learning/     # 13 components - Course learning, quizzes
│   ├── courses/      # 10+ components - Browse, categories, detail
│   ├── assignments/  # 12 components - Student assignment work (DDD)
│   ├── auth/         # 4 components - Login, register, forgot/reset password
│   ├── communication/# 2 components - Notifications
│   └── payment/      # 4 components - VNPay integration
├── shared/           # 48 reusable components, 8 services
└── state/            # Global state: course, class, global
```

**Stats**: 236 components | 61 services | 107 routes | 525 TS files

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
curl http://localhost:8088/api/v3/courses
docker compose -f backend/docker-compose.yml logs api --tail=50
```

### 3. Backend Won't Start
```bash
cd backend && docker compose logs api --tail=100
# "Not a managed type" → See fix #1
# "Access key cannot be blank" → Disable R2 in application-dev.yml
# Database connection → Check postgres container
```

### 4. Migration Fails (Flyway)
**Common**: JPA tables created without column defaults (id, created_at).
**Fix**: Use temporary `ALTER TABLE SET DEFAULT gen_random_uuid()/NOW()` at migration start, `DROP DEFAULT` at end. See V54/V55 for pattern.

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

---

## KEY FILES REFERENCE

### Backend
| Purpose | File |
|---------|------|
| **Full Backend Docs** | **`backend/README.md`** |
| **Backend SKILL** | **`.agent/skills/01-backend-ddd-development/SKILL.md`** |
| Dev Config | `backend/src/main/resources/application-dev.yml` |
| Prod Config | `backend/src/main/resources/application-prod.yml` |
| Docker Compose | `backend/docker-compose.yml` |
| Security Config | `config/SecurityConfig.java` |
| JWT Filter | `config/JwtAuthenticationFilter.java` |
| **Schema Reference** | **`src/main/resources/db/migration/V1__lms_complete_schema.sql`** (1,249 lines) |
| Seed Data (Users+Courses) | `db/migration/V54__seed_users_courses_content.sql` |
| Seed Data (Assessment) | `db/migration/V55__seed_assessment_enrollments.sql` |

### Frontend
| Purpose | File |
|---------|------|
| **FE Architecture** | **`fe/FRONTEND_ARCHITECTURE.md`** |
| **FE SKILL** | **`.agent/skills/angular-v20-frontend/SKILL.md`** |
| Environment | `fe/src/environments/environment.ts` |
| API Client | `fe/src/app/api/client/api-client.ts` |
| Root Routes | `fe/src/app/app.routes.ts` |
| Auth Service | `fe/src/app/core/services/auth.service.ts` |
| Global State | `fe/src/app/state/global.state.ts` |
| Course Editor Store | `fe/src/app/features/teacher/course-editor/store/course-editor.store.ts` |

### Deployment
| Purpose | File |
|---------|------|
| Base Docker Compose | `docker-compose.yml` |
| Production Overrides | `docker-compose.prod.yml` |
| Caddy Reverse Proxy | `Caddyfile` (auto-HTTPS for holilihu.online) |
| Deploy Script | `deploy.sh` |
| Test Checklist | `TEST_CHECKLIST.md` |

---

## BACKEND MODULE STATS

| Module | Domain Models | Use Cases | Controllers | Endpoints |
|--------|--------------|-----------|-------------|-----------|
| identity | 2 | 9 | 2 | 22 |
| course_authoring | 6 | 23 | 6 | 53 |
| learning_delivery | 9 | 17 | 11 | 59 |
| assessment | 11 | 15 | 6 | 59 |
| communication | 4 | 1 | 1 | 6 |
| ai_assistant | 3 | 1 | 1 | 11 |
| shared | 3 | 1 | 4 | 15 |
| **Total** | **38** | **69** | **32** | **255+** |

---

## TECH STACK

**Backend**: Java 21, Spring Boot 3.2.6, Spring Security 6.x, PostgreSQL 16, Flyway 10.x, JJWT 0.12.3, SpringDoc OpenAPI 2.5.0, AWS SDK S3 (R2) 2.25.0, Lombok 1.18.32

**Frontend**: Angular 20.3, TypeScript 5.x, RxJS 7.x, Sass, Dexie.js 4.x, Shaka Player 5.x

**Testing**: JUnit 5, Mockito, AssertJ, ArchUnit

**Deploy**: Docker multi-stage, Caddy auto-HTTPS, GCP Compute Engine (e2-medium, asia-southeast1-b)

---

## MULTI-TIER ADMIN SYSTEM

| Role | Vietnamese | Access | Test Account |
|------|-----------|--------|-------------|
| **ADMIN** | Quản trị hệ thống | Full system access. Settings, logs, delete users/courses. | `admin@maritime.edu` / `admin123` |
| **ORG_ADMIN** | Chuyên viên quản lý | Operations: course review/approve, user CRUD (teacher/student only), analytics. | `orgadmin@maritime.edu` / `orgadmin123` |
| **TEACHER** | Giảng viên | Course authoring, grading, student management. | `teacher@maritime.edu` / `teacher123` |
| **STUDENT** | Học viên | Learning, enrollment, assignments. | `student@maritime.edu` / `student123` |

### Security Rules
- **ALL `@PreAuthorize` with ADMIN now include ORG_ADMIN** except 3 system-only endpoints
- **ADMIN-only (3 endpoints)**: DELETE user, DELETE course, admin settings
- **Business Guards**: ORG_ADMIN cannot create/modify/promote ADMIN/ORG_ADMIN users
- **Ownership Bypass**: `isAdminRole(user)` = ADMIN || ORG_ADMIN

### FE Guards
```typescript
adminGuard = [UserRole.ADMIN, UserRole.ORG_ADMIN]   // Dashboard, users, courses, analytics
systemAdminGuard = [UserRole.ADMIN]                   // Settings, logs
teacherGuard = [UserRole.TEACHER, UserRole.ADMIN, UserRole.ORG_ADMIN]
```

---

## RECENT CHANGES LOG

### Session 93 (2026-02-26): Student Lesson Viewer UX + PWA iOS Hardening

**UX POLISH + PWA** | BE: no changes | FE: 6 files modified, 3 services rewritten

- **S93a**: Admin course content preview component (new)
- **S93b**: Student lesson viewer UX polish matching professional LMS reference
  - Sidebar: "CẤU TRÚC KHÓA HỌC" header, folder icons, colored content-type icons
  - Numbered lesson titles: "Bài 1.1: Title" format
  - Video: rounded-xl container with shadow (no more full-width black)
  - Text: white card with border + prose styling
  - Design tokens: all `#3b82f6` → `#0056D2` in learning pages
- **S93b**: Micro-progress indicators (Coursera/LinkedIn Learning pattern)
  - Green checkmark for completed, blue dot for active, muted text for done
  - Chapter count "3/5 bài học" subtitle
- **S93c**: PWA iOS crash fix — app crashed after ~5min offline on iPad Mini 6
  - Bug 1: `SwUpdateService` auto-reloaded on `unrecoverable` when offline → native "No Connection"
  - Bug 2: `NetworkStatusService` probed `/actuator/health` every 30s with `cache:'no-cache'` (bypassed SW)
  - Bug 3: `AbortError` (timeout) falsely marking device as offline
- **S93c**: PWA iOS hardening (expert-sourced from Apple WebKit, Angular, Google Workbox)
  - `visibilitychange` handler: detect iOS SW eviction after ~5min background → re-register
  - Clear stale NGSW caches before reload in `unrecoverable` handler
  - `ChunkLoadError` global handler (Angular #42094 lazy chunk mismatch)
  - Persistent storage logging for iOS diagnostics
- **S93d**: NGSW cache maxAge extended to 7d for iOS ITP resilience
  - `course-catalog`: 6h → 7d, `user-profile`: 1d → 7d, `enrollments`: 1d → 7d
  - All dataGroups now match iOS ITP 7-day window

### Session 90 (2026-02-26): Fix V54/V55 Migration + Test Checklist

**BUGFIX** | BE: 806 tests, 0 failures (no Java changes) | FE: no changes

- `V54 courses.visibility`: NOT NULL missing → added `visibility, 'PUBLIC'` to all 10 course inserts
- `V54/V55 id/created_at`: JPA tables lack defaults → temporary `ALTER TABLE SET DEFAULT` pattern
- `V55 questions.usage_count`: Integer NOT NULL missing → temporary default 0
- Created `TEST_CHECKLIST.md` for team testing

### Session 89 (2026-02-26): Production Seed Data

**V54** (1188 lines): 37 users, 10 STCW courses, 61 chapters, 261 lessons
**V55** (2743 lines): 11 classes, ~72 enrollments, ~130 questions, 9 quizzes, 27 assignments, 17 reviews. Idempotent ON CONFLICT.

### Session 88 (2026-02-25): Production Docker Deployment

Caddy auto-HTTPS, docker-compose.prod.yml, deploy.sh, Caddyfile for holilihu.online.
Architecture: `Internet → Caddy (:443) → nginx (FE) + backend:8080 (API)`

### Sessions 82-87: Pre-Deployment Audits

| Session | Key Changes |
|---------|-------------|
| S87 | Notification stubs→real API, distribution stubs→real, 806 tests |
| S86 | VideoUpload rewired (R2→server-side), 37 design token fixes, 5 dead files deleted, PWA 6 fixes |
| S85 | 4 P0 IDOR fixes in ClassControllerV3 read endpoints, 6 new security tests. 802 tests |
| S84 | Course publishing flow fix (DDD: chapter validation moved to use case layer) |
| S83 | LocalStorageService (R2→Local fallback), file upload fix. 796 tests |
| S82 | Admin course management: Course.revoke(), server-side pagination, UX redesign |

### Sessions 69-81: Quiz + Security + PWA + N+1

| Session | Key Changes |
|---------|-------------|
| S81 | Admin UX/UI: role-split sidebar (ADMIN vs ORG_ADMIN), dashboard separation |
| S80-80b | PWA maritime hardening, sync pipeline deep fix, dead legacy cleanup |
| S79 | Security audit: 2 P0 IDOR fixes (notifications, rubrics), reactivity fix |
| S78 | Full system cleanup: 6 P0 IDOR fixes, dead code, FE stubs→real |
| S76-77 | N+1 elimination: 8 batch query optimizations across 4 controllers |
| S75 | SELF_PACED enrollment fix: SelfEnrollUseCase, Canvas "default section" pattern |
| S74 | Security audit: PackageController + AiAssistant access control, 17 new tests |
| S73 | PWA: streaming video (zero RAM), persistent offline banner, satellite timeouts |
| S72 | **Full security audit**: 14 P0 IDOR fixes, privilege escalation blocked, secret masking |
| S71 | Quiz production hardening: ownership checks, essay grading, availability window |
| S70 | Quiz deep audit: QuizSettings validation, GetQuizStatisticsUseCase |
| S69 | Quiz SOTA: answer visibility, essay grading, auto-save, paginated attempts |

### Sessions 59-68: Localization + PWA + Testing

| Session | Key Changes |
|---------|-------------|
| S68 | Notes CRUD, Certificate PDF, Audit Logs, Email Verification, 685 tests |
| S67 | 29 test fixes, FileManagementPort. 602 tests |
| S66 | Full system audit, PWA 9.4/10. 578 tests |
| S65 | Student APIs (Canvas-style), Bookmarks, PasswordPolicy NIST. 578 tests |
| S63 | VNPay, Email (SMTP+Resend), OWASP password reset. 550 tests |
| S61-62 | PWA Download-First (Dexie.js, Shaka Player, SyncUseCase, offline interceptor) |
| S60 | Teacher Assignments, INSTRUCTOR_LED, batch grading. 527 tests |
| S59 | Full Vietnamese localization (0 English messages). 522 tests |

### Sessions 8-58 (Summary)

| Range | Key Changes |
|-------|-------------|
| S50-58 | Module merge, design tokens, quiz+rubric+certificate, N+1 fixes |
| S43-49 | Multi-tier admin (ORG_ADMIN), deep audits (9+12 agents) |
| S37-42 | Design standardization #0056D2, mock elimination |
| S29-36 | ConfirmDialog, Toast, Vietnamese, DnD SOTA |
| S15-28 | MVP, dual-mode courses, Quiz, QuestionBank, DDD fixes |
| S8-14 | 40 dead files cleanup, OnPush 100%, V1 schema |

---

## ARCHITECTURE SCORES (Post-S93)

| Category | Score |
|----------|-------|
| Backend Clean Architecture | 10/10 |
| Frontend Angular Patterns | 10/10 |
| PWA / Download-First | 10/10 (iOS hardened, 7d cache, visibility handler, ChunkLoadError) |
| Security | 10/10 |
| Test Coverage | 9.8/10 (806 tests, 0 failures) |
| Code Cleanliness | 10/10 |
| UX & Design | 10/10 |
| API Completeness | 10/10 |

---

## DESIGN TOKEN SYSTEM

```
Primary: #0056D2 | Hover: #004BB5
Light BGs: bg-[#0056D2]/5, /10, /20, /30
Focus: focus:ring-[#0056D2] focus:border-[#0056D2]
Cards: bg-white rounded-xl border border-gray-200 shadow-sm
Page BG: bg-slate-50 | Red: ONLY for semantic (errors, destructive)
```

---

*This document is the single source of truth for Claude Code. Update after significant changes.*
*Backend details: [`backend/README.md`](backend/README.md) | FE details: [`fe/FRONTEND_ARCHITECTURE.md`](fe/FRONTEND_ARCHITECTURE.md) | Test guide: [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md)*
