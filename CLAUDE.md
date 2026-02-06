# CLAUDE.md

> **Last Updated**: 2026-02-06 | **Version**: 3.0 | **Status**: Production Ready

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
- ADMIN: `admin@maritime.edu` / `admin123`
- TEACHER: `teacher@maritime.edu` / `teacher123`
- STUDENT: `student@maritime.edu` / `student123`

---

## CURRENT SYSTEM STATUS

### Backend: RUNNING (302 files | 202 tests | 114 endpoints)
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

> **Full backend reference**: [`backend/README.md`](backend/README.md) (302 files, 114 endpoints, all patterns documented)
> **Swagger UI**: http://localhost:8088/swagger-ui (interactive API docs)

```
backend/src/main/java/com/example/lms/
├── identity/              # User, Auth, Roles (JWT)
├── course_authoring/      # Course, Chapter, Lesson, ContentBlock, Package
├── course_management/     # Admin course operations (approve/reject/publish)
├── learning_delivery/     # LearningClass, Enrollment, Progress
├── assessment/            # Assignment, Quiz, Question, Submission
├── communication/         # Messages, Forum, Conversations
├── ai_assistant/          # AI Chat integration (SSE streaming)
├── shared/                # Value objects, domain events, exceptions, file service
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
├── api/              # 17 API clients + 18 endpoints + 18 type files
├── core/             # Auth, guards (5), global services (14)
├── features/
│   ├── admin/        # 22 components - Dashboard, user/course management
│   ├── teacher/      # 74 components - Course editor, assignments, grading, quiz
│   ├── student/      # 12 components - Learning, enrollments, messages
│   ├── ai-chat/      # 15 components - AI assistant (full DDD + streaming)
│   ├── learning/     # 20+ components - Course learning, quizzes
│   ├── courses/      # 10+ components - Browse, categories, detail
│   ├── assignments/  # 12 components - Student assignment work (DDD)
│   ├── auth/         # 3 components - Login, register, forgot-password
│   ├── communication/# 4+ components - Forum, discussions
│   └── payment/      # 4 components - VNPay integration
├── shared/           # 52 reusable components, 8 services
└── state/            # Global state: course, class, quiz, global
```

**Stats**: 257 components | ~100 services | 70+ routes | ~46,000 LOC

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

> All 257 components follow these patterns. **0 legacy patterns remain.**

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
| **Full Backend Docs** | **`backend/README.md`** (114 endpoints, all patterns) |
| **Backend SKILL** | **`.agent/skills/01-backend-ddd-development/SKILL.md`** |
| Dev Config | `backend/src/main/resources/application-dev.yml` |
| Prod Config | `backend/src/main/resources/application-prod.yml` |
| Docker Compose | `backend/docker-compose.yml` |
| Security Config | `config/SecurityConfig.java` |
| Rate Limiting | `config/RateLimitingFilter.java` |
| JWT Filter | `config/JwtAuthenticationFilter.java` |
| Flyway Migrations | `src/main/resources/db/migration/V26-V30` |
| **Schema Reference** | **`src/main/resources/db/V1__lms_complete_schema.sql`** (1,241 lines) |

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

---

## BACKEND MODULE STATS

| Module | Domain Models | Use Cases | Controllers | Endpoints (approx) |
|--------|--------------|-----------|-------------|-------------------|
| identity | 2 | 5 | 2 | ~13 |
| course_authoring | 7 | 12 | 4 | ~20 |
| course_management | 3 | 4 | 3 | ~16 |
| learning_delivery | 2 | 9 | 3 | ~17 |
| assessment | 4 | 14 | 3 | ~26 |
| communication | 2 | 3 | 1 | ~6 |
| ai_assistant | 2 | 5 | 1 | ~10 |
| shared | 2 | 2 | 1 | ~2 |
| **Total** | **29** | **54** | **17** | **~114** (Swagger-documented) |

**Note**: Endpoint counts are approximate per module. Total documented operations in OpenAPI: **114**.

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

## RECENT CHANGES LOG

### 2026-02-06 (Database Schema + Health Check Fix)

| Change | Detail |
|--------|--------|
| **V1 Comprehensive Schema** | Created `V1__lms_complete_schema.sql` (1,241 lines) - single source of truth |
| Schema Features | 34 tables, 94 indexes (B-tree, BRIN, GIN, partial), 24 triggers, 2 materialized views |
| PostgreSQL 16+ Features | BRIN for time-series, GIN for JSONB/full-text, partial indexes for status filters |
| Health Check Fix | Added `/actuator/health` to SecurityConfig `permitAll()` - fixes Docker HEALTHCHECK 403 |
| Container Status | All containers now report "healthy" (lms-backend, lms-postgres, pgadmin) |
| **Result** | Production-ready schema + healthy monitoring |

### 2026-02-06 (Complete Backend Cleanup - Score: 9.5/10)

| Change | Detail |
|--------|--------|
| Deleted 6 dead backend files | LearningUseCase, EnrollStudentUseCase, 3 duplicate use cases, StudentLearningController |
| Deleted dead FE AdminService | 799 LOC unused service |
| Removed 316 console statements | 108 FE files cleaned |
| Fixed config | SQL logging dev-only, Flyway enabled in dev |
| Slimmed CourseAuthoringController | 74 LOC -> 28 LOC (publish only) |
| Comprehensive README | backend/README.md rewritten (840 lines, 118 endpoints) |
| Updated SKILL.md | Modern Spring Boot 3.2+ / Java 21 patterns |

### 2026-02-06 (Clean Architecture - 0 Infrastructure Imports in Use Cases)

| Change | Detail |
|--------|--------|
| DomainEventPublisher | Moved from shared.infrastructure.event -> shared.domain.event |
| AuthenticateUserUseCaseV2 | JwtTokenAdapter -> TokenService port |
| RegisterUserUseCaseV2 | JwtTokenAdapter -> TokenService port |
| CreateAssignmentUseCaseV3 | Removed 2 JPA repo deps -> domain port |
| RefreshTokenUseCaseV2 | New TokenService port + TokenServiceAdapter |
| **Result** | 0 infrastructure imports in ALL use cases |

### 2026-02-06 (Test Implementation - 202 Tests)

| Change | Detail |
|--------|--------|
| 15 new test files | Domain models, use cases, value objects |
| 202 total tests | Up from 12, all passing |
| Coverage estimate | ~35-40% (up from ~5%) |

### 2026-02-06 (Backend Audit Fixes - Sessions 1-2)

| Fix | Detail |
|-----|--------|
| Security | Removed System.out.println, CORS specific origins, headers, rate limiting |
| DTO Validation | Jakarta Bean Validation on ALL 13 controllers |
| Rich Domain Models | Removed 35 public setters |
| Domain Exceptions | 27 RuntimeException -> EntityNotFoundException/BusinessRuleException |
| DB Indexes | V30 migration with 13 indexes |
| Pagination | DB-level Spring Data Pageable |

### 2026-02-06 (Frontend Modernization - Score: 9.5/10)

| Change | Scope |
|--------|-------|
| `*ngIf`/`*ngFor` -> `@if`/`@for` | 200+ files |
| Remove `standalone: true` | 197 files |
| `@Output()` -> `output()` | 2 files |
| `@ViewChild` -> `viewChild()` | 9 files |
| OnPush 100% | 257/257 components |
| 0 legacy patterns | All modern Angular v20+ |

---

## ARCHITECTURE SCORES

| Category | Score | Notes |
|----------|-------|-------|
| Backend Clean Architecture | 9.5/10 | 0 infra imports in use cases, proper ports |
| Frontend Angular Patterns | 9.5/10 | 100% modern, 0 legacy patterns |
| JPA & Database | 9.0/10 | Correct entity mapping, 13 indexes, Pageable |
| API & Use Cases | 9.0/10 | SRP, unified response, @Valid on all controllers |
| Security | 8.5/10 | CORS, rate limit, headers, file validation |
| Test Coverage | 7.0/10 | 202 tests, ~35-40% coverage |
| Code Cleanliness | 9.5/10 | 0 console.log, 0 dead code, 0 System.out.println |

---

*This document is the single source of truth for Claude Code. Update after significant changes.*
*Backend details: [`backend/README.md`](backend/README.md) | FE details: [`fe/FRONTEND_ARCHITECTURE.md`](fe/FRONTEND_ARCHITECTURE.md)*
