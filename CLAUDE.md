# CLAUDE.md

> **Last Updated**: 2026-03-03 | **Version**: 15.1 | **Status**: Production Ready + Category Taxonomy Redesign (806 tests, 0 failures)

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

### Backend: RUNNING (426+ files | 806 tests | 290+ endpoints)
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
├── course_authoring/      # Course, Chapter, Lesson, ContentBlock, Package, CourseCategory (2-level hierarchy), CourseTag, Review, Admin ops
├── learning_delivery/     # LearningClass, Enrollment, Progress, Gamification, Analytics, Video, Certificate
├── assessment/            # Assignment, Quiz, Question, Submission, Rubric, QuestionBank
├── communication/         # Messages, Conversations
├── ai_assistant/          # AI Chat integration (SSE streaming)
├── shared/                # Value objects, domain events, exceptions, file service, payment (DDD), email, VNPay, admin settings
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
│   └── payment/      # 6 components - VNPay integration, refund policy, payment history
├── shared/           # 48 reusable components, 8 services
└── state/            # Global state: course, class, global
```

**Stats**: 215+ components | 62 services | 108 routes | ~470 TS files

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

### 6. Production Deploy — Backend Crashes with "password authentication failed"
**Cause**: Running `docker compose up` without `--env-file .env.prod`. Backend gets default password `lms` but postgres has the production password.
**Fix**: Always use `deploy.sh` or the full command:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
If postgres password is out of sync:
```bash
docker exec lms-postgres psql -U lms -d lms -c "ALTER USER lms WITH PASSWORD '<password-from-env-prod>';"
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod restart backend
```

### 7. PWA Service Worker Won't Install (404 on prefetch)
**Cause**: Angular 20 esbuild merges CSS chunks into main bundle but still lists original chunk name in `ngsw.json`. Missing file → 404 → NGSW install fails completely.
**Fix**: Already handled by `fe/scripts/fix-ngsw.js` post-build script (runs automatically via `npm run build`).

### 8. Backend Crash: "Schema-validation: wrong column type" (text[] array)
**Cause**: Hibernate 6.4 `ddl-auto: validate` fails on PostgreSQL `text[]` array columns (`_text` vs `text[]` type mismatch).
**Fix**: Use `ddl-auto: none` in production (Flyway manages schema). Dev uses `ddl-auto: update`.

### 9. YAML Indentation Bug in application-prod.yml
**Cause**: `datasource`/`jpa`/`flyway`/`servlet` accidentally nested under `server:` instead of `spring:` due to misleading comment placement.
**Fix**: Keep `spring:` and `server:` as separate top-level blocks. Always verify YAML structure with an IDE or linter.

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
| Category/Tag Taxonomy | `db/migration/V70__course_categories_and_tags.sql` |

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

### PWA / Offline
| Purpose | File |
|---------|------|
| **PWA Deep Research** | **`docs/PWA_OFFLINE_RESEARCH.md`** |
| **PWA Roadmap** | **`STREAMING_PWA_ROADMAP.md`** |
| Dexie.js DB Schema | `fe/src/app/core/db/lms-offline.db.ts` |
| NGSW Config | `fe/ngsw-config.json` |
| Course Download | `fe/src/app/core/services/course-download.service.ts` |
| Offline Video | `fe/src/app/core/services/offline-video.service.ts` |
| Offline Sync | `fe/src/app/core/services/offline-sync.service.ts` |
| Offline Interceptor | `fe/src/app/api/interceptors/offline.interceptor.ts` |

### Deployment
| Purpose | File |
|---------|------|
| Base Docker Compose | `docker-compose.yml` |
| Production Overrides | `docker-compose.prod.yml` |
| Caddy Reverse Proxy | `Caddyfile` (auto-HTTPS for holilihu.online) |
| Deploy Script | `deploy.sh` |
| PWA Build Fix | `fe/scripts/fix-ngsw.js` (removes phantom CSS from ngsw.json) |
| Test Checklist | `TEST_CHECKLIST.md` |

---

## BACKEND MODULE STATS

| Module | Domain Models | Use Cases | Controllers | Endpoints |
|--------|--------------|-----------|-------------|-----------|
| identity | 4 | 15 | 3 | 36 |
| course_authoring | 8 | 26 | 8 | 68 |
| learning_delivery | 9 | 17 | 11 | 59 |
| assessment | 11 | 15 | 6 | 59 |
| communication | 4 | 1 | 1 | 6 |
| ai_assistant | 3 | 1 | 1 | 11 |
| shared | 4 | 5 | 4 | 15 |
| **Total** | **43** | **82** | **35** | **290+** |

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

## RECENT CHANGES (Summary)

> **Full session history**: See `MEMORY.md` session log or `.claude/projects/.../memory/session-history.md`

| Sessions | Key Changes |
|----------|-------------|
| **S120** (2026-03-03) | Category/Taxonomy redesign: 2-level hierarchical `course_categories` + controlled vocabulary `course_tags` (V70 migration). Full DDD: domain models, JPA entities, repos, use cases, controllers, Spring Cache. FE: cascading category picker (course creation + editor), tag vocabulary picker, admin hierarchical filter, student browse API tabs. 16 BE + 6 FE files. BE+FE 0 errors. |
| **S119** (2026-03-02) | Teacher portal design audit: `indigo-*`→`#0056D2` (13 files), `bg-gray-50`→`bg-slate-50` (5 pages), KPI rating bugs (BE batch queries), sidebar sync, student dashboard `max-width: 900→1100px` |
| **S118** (2026-03-02) | P1 pagination bugfix: teacher/student management `size`→`limit`, `page:0`→`page:1`. CLAUDE.md trimmed 56.3k→16.3k chars |
| **S116-S117** (2026-03-02) | ADMIN/ORG_ADMIN role separation, org-scoped analytics/users, bulk approve/reject, CSV export, advanced filters |
| **S114-S115** (2026-03-02) | Teacher dashboard redesign (KPI cards, pill tabs, single-column), org management audit (11 bugs) |
| **S110-S113c** (2026-03-01) | PWA research, multi-account IndexedDB isolation, student course detail redesign, storage management |
| **S104-S109** (2026-03-01) | Dead code cleanup (-11,755 lines), org invitation system, student UX audit, token management |
| **S93-S103** (2026-02-26) | VNPay security, PWA iOS, full audits, payment DDD, org-scoped multi-tenancy |
| **S82-S92** (2026-02-25) | Production deployment (GCP), seed data, course management, 806 tests |
| **S8-S81** | MVP → production: auth, DDD, quiz, PWA, Vietnamese, security audits, design tokens |

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
