# CLAUDE.md

> **Last Updated**: 2026-04-24 | **Version**: 16.2 | **Status**: Faculty-level milestone checkpoint. Production VM paused on GCP to conserve free-trial credits; CI/CD build jobs still push images to GHCR, deploy job gated by `DEPLOY_ENABLED` repo variable. See [`docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`](docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md) to resume. Docs tree reorganized per [`docs/reference/DOCUMENTATION_POLICY.md §6`](docs/reference/DOCUMENTATION_POLICY.md) — Q1 2026 working docs now under [`docs/archive/2026-Q1/`](docs/archive/2026-Q1/README.md); thesis artifacts under [`docs/academic/`](docs/academic/README.md).

This file provides guidance to Claude Code for working with this repository. **Read this first before any task.**

---

## QUICK START

```bash
# Backend (Docker - Recommended)
cp .env.dev.example .env && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend
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

> **Production VM paused** since 2026-04-24 end of faculty-level milestone. `holilihu.online` is offline. CI build jobs still push images to GHCR; deploy job skipped via `DEPLOY_ENABLED=false`. Latest DB backup: `backups/prod-2026-04-24.dump` (483 KB, `pg_restore` custom format). To resume, follow [`docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md`](docs/runbooks/PRODUCTION_PAUSE_RESUME_RUNBOOK.md).

### Backend: RUNNING locally (440+ files | 806 tests | 295+ endpoints)
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
├── shared/                # Value objects, domain events, exceptions, file service (presigned upload), payment (DDD), email, VNPay, admin settings
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
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend --tail=50
```

### 3. Backend Won't Start
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend --tail=100
# "Not a managed type" → See fix #1
# "Access key cannot be blank" → Disable R2 in application-dev.yml
# Database connection → Check postgres container
```

### 4. Migration Fails (Flyway)
**Common**: JPA tables created without column defaults (id, created_at).
**Fix**: Use temporary `ALTER TABLE SET DEFAULT gen_random_uuid()/NOW()` at migration start, `DROP DEFAULT` at end. See V54/V55 for pattern.

### 5. Build Errors
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend 2>&1 | tail -50
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
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod exec db psql -U lms -d lms -c "ALTER USER lms WITH PASSWORD '<password-from-env-prod>';"
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

### 10. SSR: "Angular app engine manifest is not set"
**Cause**: `angular.json` missing `"outputMode": "server"` in build options. Without it, the build doesn't inject manifest imports into `server.mjs`.
**Fix**: Add `"outputMode": "server"` to `angular.json` → `projects.lms-angular.architect.build.options`.

### 11. SSR: "URL with hostname 'X' is not allowed" (SSRF protection)
**Cause**: Angular 20's SSRF protection blocks all hostnames when `outputMode: "server"` is set. The `allowedHosts` array is empty by default.
**Fix**: Set `NG_ALLOWED_HOSTS=holilihu.online,localhost` environment variable in `docker-entrypoint.sh` and `docker-compose.prod.yml`.

### 12. Dev server TTFB ~7s trên `localhost:4200` (SSR leak vào dev)
**Cause**: `outputMode` có mặt ở **bất kỳ level nào** (root `options` hoặc `development` config) của `fe/angular.json` khiến Angular 20.3 `@angular/build:dev-server` wire Express SSR middleware vào dev server, dù `ssr: false` đã set. SSR chạy trong dev + `baseUrlInterceptor` gọi `http://backend:8080` ngoài Docker → DNS fail → ~7s timeout mỗi request HTML.
**Fix**: `outputMode: "server"` CHỈ đặt trong `production` configuration. Root `options` và `development` configuration TUYỆT ĐỐI không có field `outputMode`. `development` chỉ cần `ssr: false`.
**Verify**: `curl -s -o /dev/null -w "%{time_starttransfer}s\n" http://localhost:4200/` phải < 100ms.
**Deep dive**: [`ADR-006-angular-dev-server-ssr-separation.md`](backend/docs/adr/ADR-006-angular-dev-server-ssr-separation.md), [`docs/reference/FRONTEND_GOTCHAS.md §1.1`](docs/reference/FRONTEND_GOTCHAS.md). PR #148 / Issue #147.

> **FE gotcha catalog đầy đủ**: [`docs/reference/FRONTEND_GOTCHAS.md`](docs/reference/FRONTEND_GOTCHAS.md) — 20+ gotcha phân theo Build, Deps, PWA, SSR, Offline, IDB, Conventions. Đọc trước khi đụng `angular.json`, `ngsw-config.json`, `proxy.conf.json`, hoặc code SSR path.

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
| **Backend SKILL** | **`.claude/skills/01-backend-ddd-development/SKILL.md`** |
| Dev Config | `backend/src/main/resources/application-dev.yml` |
| Prod Config | `backend/src/main/resources/application-prod.yml` |
| Docker Compose | `docker-compose.yml` + `docker-compose.dev.yml` |
| Security Config | `config/SecurityConfig.java` |
| JWT Filter | `config/JwtAuthenticationFilter.java` |
| **Schema Reference** | **`src/main/resources/db/migration/V1__lms_complete_schema.sql`** (1,249 lines) |
| Seed Data (Users+Courses) | `db/migration/V54__seed_users_courses_content.sql` |
| Seed Data (Assessment) | `db/migration/V55__seed_assessment_enrollments.sql` |
| Category/Tag Taxonomy | `db/migration/V70__course_categories_and_tags.sql` |
| Upload Sessions | `db/migration/V74__upload_sessions.sql` |
| Presigned Upload UseCase | `shared/application/usecase/PresignedUploadUseCase.java` |
| Upload Cleanup Scheduler | `shared/infrastructure/service/UploadCleanupScheduler.java` |

### Frontend
| Purpose | File |
|---------|------|
| **FE Architecture** | **`fe/FRONTEND_ARCHITECTURE.md`** |
| **FE SKILL** | **`.claude/skills/angular-v20-frontend/SKILL.md`** |
| Environment | `fe/src/environments/environment.ts` |
| API Client | `fe/src/app/api/client/api-client.ts` |
| Root Routes | `fe/src/app/app.routes.ts` |
| SSR Routes | `fe/src/app/app.routes.server.ts` |
| Auth Service | `fe/src/app/core/services/auth.service.ts` |
| SEO Service | `fe/src/app/core/services/seo.service.ts` |
| WebMCP Service | `fe/src/app/core/services/webmcp.service.ts` |
| Global State | `fe/src/app/state/global.state.ts` |
| Course Editor Store | `fe/src/app/features/teacher/course-editor/store/course-editor.store.ts` |
| Presigned Upload Service | `fe/src/app/core/services/presigned-upload.service.ts` |
| Server Upload Adapter | `fe/src/app/core/utils/server-upload-adapter.ts` |
| Base URL Interceptor | `fe/src/app/api/interceptors/base-url.interceptor.ts` (SSR: `isPlatformServer` → `http://backend:8080`) |

### PWA / Offline
| Purpose | File |
|---------|------|
| **PWA Deep Research** | **`docs/PWA_OFFLINE_RESEARCH.md`** |
| **PWA Roadmap** | **`docs/architecture/STREAMING_PWA_ROADMAP.md`** |
| Dexie.js DB Schema | `fe/src/app/core/db/lms-offline.db.ts` |
| NGSW Config | `fe/ngsw-config.json` |
| Course Download | `fe/src/app/core/services/course-download.service.ts` |
| Offline Video | `fe/src/app/core/services/offline-video.service.ts` |
| Offline Sync | `fe/src/app/core/services/offline-sync.service.ts` |
| Offline Interceptor | `fe/src/app/api/interceptors/offline.interceptor.ts` |

### SEO & Branding
| Purpose | File |
|---------|------|
| robots.txt | `fe/public/robots.txt` |
| Sitemap | `fe/public/sitemap.xml` (13 public URLs) |
| OG Image | `fe/public/og-image.png` (1200x630 social share banner) |
| PWA Icons | `fe/public/icons/icon-{72..512}x{72..512}.png` (compass rose) |
| Master Logo | `fe/public/icons/logo-master.png` (1024x1024) |
| Parent Brand | `fe/public/icons/thewiiilab.png` (The Wiii Lab) |

### Deployment
| Purpose | File |
|---------|------|
| Base Docker Compose | `docker-compose.yml` |
| Production Overrides | `docker-compose.prod.yml` |
| Caddy Reverse Proxy | `Caddyfile` (auto-HTTPS for holilihu.online) |
| FE Dockerfile | `fe/Dockerfile` (node:20-alpine + nginx, SSR + static) |
| FE Entrypoint | `fe/docker-entrypoint.sh` (Node.js SSR:4000 + nginx:80) |
| FE nginx | `fe/nginx.conf` (static → nginx, pages → SSR:4000, 502 → CSR fallback) |
| Deploy Script | `deploy.sh` |
| PWA Build Fix | `fe/scripts/fix-ngsw.js` (removes phantom CSS from ngsw.json) |
| Test Checklist | `docs/testing/TEST_CHECKLIST.md` |

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
| shared | 4 | 6 | 4 | 18 |
| **Total** | **43** | **83** | **35** | **295+** |

---

## TECH STACK

**Backend**: Java 21, Spring Boot 3.2.6, Spring Security 6.x, PostgreSQL 16, Flyway 10.x, JJWT 0.12.3, SpringDoc OpenAPI 2.5.0, AWS SDK S3 (R2) 2.25.0, Lombok 1.18.32

**Frontend**: Angular 20.3, TypeScript 5.x, RxJS 7.x, Sass, Dexie.js 4.x, Shaka Player 5.x

**Testing**: JUnit 5, Mockito, AssertJ, ArchUnit

**Deploy**: Docker multi-stage (Node.js SSR + nginx), Caddy auto-HTTPS, GCP Compute Engine (e2-standard-2, asia-southeast1-c — migrated từ -b 2026-04-27 do zone capacity exhausted)

**SSR/SEO**: Full Angular SSR via `outputMode: "server"`, Node.js:4000 + nginx reverse proxy, CSR fallback on 502. robots.txt, sitemap.xml, JSON-LD, Open Graph, centralized SeoService

**WebMCP**: W3C Draft (Feb 2026) — `navigator.modelContext.registerTool()` exposes 4 public tools to AI agents (search_courses, get_course_detail, get_course_curriculum, list_categories)

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
| **S131** (2026-04-02) | **EditorJS block validation fixes**: `preserveBlank: true` for paragraph, permissive `validate()` for video + math tools — eliminated all "Block skipped because saved data is invalid" errors. **Video upload endpoint fix**: Server relay fallback changed from `/upload/editor` (50MB, image-oriented) to `/upload/video` (500MB, video MIME types) in both `video-block-tool.ts` and `PresignedUploadService`. Root cause: R2 disabled in dev → `isServerRelay: true` → wrong endpoint. Also fixed in lesson video upload path. |
| **S128** (2026-03-13) | **Full SSR deployment**: Angular `outputMode: "server"`, Dockerfile rewrite (node:20-alpine + nginx), base-url interceptor `isPlatformServer()` → `http://backend:8080`, `NG_ALLOWED_HOSTS` SSRF protection. **SEO foundation**: robots.txt, sitemap.xml (13 URLs), canonical tags, OG/Twitter meta, JSON-LD (Organization + WebSite + SearchAction), centralized SeoService. **Branding**: Compass rose PWA icons (8 sizes + favicon), OG image (1200x630), logo-master, The Wiii Lab parent brand. **WebMCP** (W3C Draft): 4 AI-agent tools via `navigator.modelContext.registerTool()`. **Course editor stabilization**: key-based selection dedup, section surface state machine, nested modal Escape, ARIA dialogs, sync helpers in CurriculumSelectionService. Deployed to production. |
| **S124** (2026-03-04) | Upload system upgrade: 3-step presigned URL flow (BE: PresignedUploadUseCase, V74 migration, UploadCleanupScheduler; FE: PresignedUploadService, ServerUploadAdapter for CKEditor). Course info page redesign: 5-card sidebar (Shopify pattern), sticky save bar with discard. Thumbnail drag-drop + progress + cancel UX. Course settings CSS fixes. V70 migration production fix (legacy course_tags rename). 9 new BE + 3 new FE files. Deployed to production. |
| **S121-S123** (2026-03-03) | Course creation UX redesign (two-panel, live progress). DeliveryMode enforcement (lock after enrollment). Course editor bugfixes (categoryName, tags, price validation). |
| **S120** (2026-03-03) | Category/Taxonomy redesign: 2-level `course_categories` + controlled vocabulary `course_tags` (V70). Full DDD. 16 BE + 6 FE files. |
| **S116-S119** (2026-03-02) | ADMIN/ORG_ADMIN role separation, org-scoped analytics, pagination bugfix, teacher portal design audit, KPI rating bugs. |
| **S110-S115** (2026-03-01-02) | PWA research, IndexedDB isolation, teacher dashboard redesign, org management audit. |
| **S93-S109** (2026-02-26-03-01) | VNPay security, PWA iOS, payment DDD, org invitation system, student UX audit, dead code cleanup. |
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
*Backend details: [`backend/README.md`](backend/README.md) | FE details: [`fe/FRONTEND_ARCHITECTURE.md`](fe/FRONTEND_ARCHITECTURE.md) | Test guide: [`docs/testing/TEST_CHECKLIST.md`](docs/testing/TEST_CHECKLIST.md)*

<!-- SPECKIT START -->
Active spec-kit feature: **001-sidebar-redesign** — Multi-role sidebar redesign with SOTA collapse UX, mobile auto-close drawer, WCAG 2.2 AA accessibility, unified state service.
For full technical context, file scope, constitution-check verdict, and verification steps, read [`specs/001-sidebar-redesign/plan.md`](specs/001-sidebar-redesign/plan.md).
<!-- SPECKIT END -->
