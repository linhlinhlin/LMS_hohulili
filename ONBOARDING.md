# LMS Maritime - Hướng Dẫn Onboarding Cho Đồng Nghiệp

> Tài liệu này giúp bạn thiết lập và chạy dự án LMS Maritime từ đầu đến cuối trong **15 phút**.

---

## Prerequisites (Yêu cầu trước khi bắt đầu)

Cài đặt các tool sau trước khi tiếp tục:

| Tool | Version | Kiểm tra | Cài đặt |
|------|---------|----------|---------|
| **Docker Desktop** | Latest | `docker --version` | https://www.docker.com/products/docker-desktop |
| **Node.js** | 20+ | `node --version` | https://nodejs.org/ |
| **Git** | Latest | `git --version` | https://git-scm.com/ |
| **Maven** (optional) | 3.9+ | `mvn --version` | https://maven.apache.org/ |

**Note**: Maven chỉ cần nếu muốn chạy tests trên host. Docker build không cần Maven trên host.

---

## Quick Start (5 phút)

### 1. Clone Repository

```bash
git clone <repository-url>
cd LMS_hohulili
```

### 2. Start Backend (Docker - Recommended)

```bash
cd backend
docker compose up -d
```

**Đợi ~60 giây** để Spring Boot khởi động. Container sẽ tự động:
- Tạo database `lms` trên PostgreSQL 16
- Chạy Flyway migrations (V26-V30)
- Seed data: 5 categories + 3 test accounts

**Kiểm tra backend:**

```bash
# Health check
curl http://localhost:8088/actuator/health
# Expected: {"status":"UP"}

# API test
curl http://localhost:8088/api/v3/courses
# Expected: {"success":true,"message":"Courses loaded"...}
```

### 3. Start Frontend

```bash
cd ../fe
npm install    # Lần đầu tiên, ~2-3 phút
npm start
```

Truy cập: **http://localhost:4200**

---

## Test Accounts (Tài khoản mặc định)

| Role | Email | Password | Chức năng |
|------|-------|----------|-----------|
| **ADMIN** | `admin@maritime.edu` | `admin123` | Quản trị toàn hệ thống |
| **TEACHER** | `teacher@maritime.edu` | `teacher123` | Tạo khóa học, bài tập, chấm điểm |
| **STUDENT** | `student@maritime.edu` | `student123` | Học, làm bài tập, quiz |

**Đăng nhập thử:**

```bash
curl -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}'
```

Expected: Trả về `accessToken` và `refreshToken` (JWT tokens).

---

## Architecture Overview (Kiến trúc tổng quan)

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Angular 20.3 + Signals + OnPush (257 components) |
| **Backend** | Spring Boot 3.2.6 + Java 21 |
| **Database** | PostgreSQL 16 |
| **Architecture** | Clean Architecture / DDD (9 modules) |
| **Auth** | JWT (JJWT 0.12.3) |
| **API Docs** | SpringDoc OpenAPI 2.5.0 (Swagger) |
| **File Storage** | Cloudflare R2 (S3-compatible) |
| **Migration** | Flyway 10.x |

### Backend Modules (9 modules)

```
backend/src/main/java/com/example/lms/
├── identity/              # Xác thực, phân quyền (JWT)
├── course_authoring/      # Tạo khóa học, bài giảng
├── course_management/     # Admin duyệt khóa học
├── learning_delivery/     # Lớp học, ghi danh, tiến độ
├── assessment/            # Bài tập, quiz, câu hỏi
├── communication/         # Nhắn tin, thảo luận
├── ai_assistant/          # AI chatbot (streaming)
├── shared/                # Domain events, value objects
└── config/                # Security, CORS, JWT, rate limit
```

**Clean Architecture Layer:**
- `domain/model/` - Domain entities (pure Java, NO framework)
- `application/usecase/` - Business logic (NO JPA, NO Spring annotations)
- `infrastructure/` - JPA, REST controllers, adapters

### Frontend Structure

```
fe/src/app/
├── features/admin/        # Dashboard admin (22 components)
├── features/teacher/      # Tạo khóa học, chấm điểm (74 components)
├── features/student/      # Học, làm bài tập (12 components)
├── features/ai-chat/      # AI assistant (15 components)
├── core/services/         # Auth, guards (14 services)
├── api/client/            # API clients (17 files)
└── shared/components/     # Reusable UI (52 components)
```

**Angular 20+ Patterns:**
- Signals + Computed (reactive state)
- `@if/@for` control flow (NO `*ngIf/*ngFor`)
- `input()`, `output()`, `viewChild()` (NO decorators)
- OnPush change detection (100% coverage)

---

## Database Schema

### Flyway Migrations

| File | Purpose | Status |
|------|---------|--------|
| **V1__lms_complete_schema.sql** | **Reference schema (1,241 lines)** | ✅ Production-ready |
| V26__normalize_enums.sql | Normalize enums to UPPERCASE | ✅ Applied |
| V27__add_performance_indexes.sql | 26 indexes | ✅ Applied |
| V28__add_foreign_key_constraints.sql | 13 FK constraints | ✅ Applied |
| V29__complete_assignment_entities.sql | Assignment columns | ✅ Applied |
| V30__add_missing_indexes.sql | 11 additional indexes | ✅ Applied |

### Schema Stats

- **34 tables**: users, courses, chapters, lessons, quizzes, assignments, enrollments, messages, chat_sessions, etc.
- **94 indexes**: 60+ B-tree, 9 partial, 6 BRIN, 12 GIN
- **54 foreign keys**: CASCADE on children, SET NULL on soft deps
- **24 triggers**: Auto `updated_at` + audit logging
- **2 materialized views**: `mv_course_stats`, `mv_teacher_performance` (analytics)

### PostgreSQL 16+ Features

| Feature | Technique | Benefit |
|---------|-----------|---------|
| Full-text search | `pg_trgm` + GIN trigram | 10-50x faster course search |
| Analytics | Materialized views | 100-9000x faster dashboards |
| Time-series queries | BRIN indexes | 100x smaller index |
| JSONB queries | GIN indexes | JSONB containment indexed |
| Status filters | Partial indexes | 50-80% smaller |

**Truy cập database:**

```bash
# Via pgAdmin (GUI)
# http://localhost:8081
# Email: admin@devmail.net
# Password: S3cure!Passw0rd

# Via psql (CLI)
docker compose exec db psql -U lms -d lms
```

---

## Development Workflow

### 1. Backend Development

#### Run Tests

```bash
cd backend

# All tests (202 tests)
mvn test -B

# Expected: Tests run: 202, Failures: 0, Errors: 0
```

**Test Coverage**: ~35-40% (target: 50%+)

#### Rebuild API Container

```bash
docker compose up -d --build api
```

#### Check Logs

```bash
docker compose logs api --tail=100 --follow
```

#### Add New Flyway Migration

```bash
# Create new file: backend/src/main/resources/db/migration/V31__your_change.sql
# Restart: docker compose restart api
# Flyway auto-applies new migrations
```

### 2. Frontend Development

#### Run Dev Server

```bash
cd fe
npm start
# http://localhost:4200 (auto-reload on file changes)
```

#### Build for Production

```bash
npm run build
# Output: fe/dist/
```

#### Run Linting

```bash
npm run lint
```

### 3. Common Tasks

#### Tạo endpoint mới (backend)

1. **Domain model** (`domain/model/`) - Pure Java class
2. **Repository port** (`domain/repository/`) - Interface
3. **Use case** (`application/usecase/`) - Business logic
4. **JPA entity** (`infrastructure/persistence/entity/`) - `@Entity`
5. **Repository adapter** (`infrastructure/persistence/`) - Implements port
6. **Controller** (`infrastructure/web/`) - `@RestController`
7. **Tests** (`src/test/java/`) - JUnit 5

**Checklist:**
- [ ] Domain model: NO framework annotations
- [ ] JPA repo: Uses `*JpaEntity` class
- [ ] Use case: ZERO infrastructure imports
- [ ] Controller: `@Valid` + `@PreAuthorize`
- [ ] Tests: All passing

#### Tạo component mới (frontend)

```bash
cd fe
ng generate component features/admin/my-component
```

**Angular 20+ Conventions:**
- ✅ Use `@if/@for` (NOT `*ngIf/*ngFor`)
- ✅ Use `input()`, `output()`, `viewChild()` (NOT decorators)
- ✅ Use `ChangeDetectionStrategy.OnPush`
- ✅ Use `inject()` (NOT constructor DI)
- ❌ DO NOT specify `standalone: true` (default in Angular 20+)

---

## API Documentation

### Swagger UI

**URL**: http://localhost:8088/swagger-ui

Tất cả 114 endpoints được document tự động qua SpringDoc OpenAPI (17 API modules).

### Key Endpoints

| Group | Endpoint | Method | Auth | Description |
|-------|----------|--------|------|-------------|
| **Auth** | `/api/v3/auth/login` | POST | Public | Đăng nhập (trả về JWT) |
| **Auth** | `/api/v3/auth/register` | POST | Public | Đăng ký tài khoản |
| **Courses** | `/api/v3/courses` | GET | Public | Danh sách khóa học (paginated) |
| **Courses** | `/api/v3/courses/{id}` | GET | Public | Chi tiết khóa học |
| **Admin** | `/api/v3/admin/users` | GET | ADMIN | Quản lý users |
| **Teacher** | `/api/v3/teacher/courses` | GET | TEACHER | Khóa học của teacher |
| **Student** | `/api/v3/student/enrollments` | GET | STUDENT | Các khóa đã ghi danh |

**Test API với curl:**

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}' \
  | jq -r '.data.accessToken')

# Call protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8088/api/v3/admin/users
```

---

## Troubleshooting (Xử lý sự cố)

### Backend không start

```bash
# 1. Check container status
docker compose ps

# 2. Check logs
docker compose logs api --tail=50

# 3. Common issues:
# - "Not a managed type": JPA repo using domain model instead of JpaEntity
# - "Access key cannot be blank": R2 not configured (ignore or disable in yml)
# - Port 8088 in use: Stop other services or change port in docker-compose.yml
```

### Frontend build errors

```bash
# Clear cache + reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 20+
```

### Database migration errors

```bash
# Check Flyway schema history
docker compose exec db psql -U lms -d lms -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

# Repair if needed (use with caution!)
# docker compose down && docker compose up -d
```

### Container "unhealthy"

```bash
# Check health endpoint
curl http://localhost:8088/actuator/health
# Expected: {"status":"UP"}

# If 403: /actuator/health not whitelisted in SecurityConfig
# (Already fixed in current version)
```

---

## Useful Commands

### Backend

```bash
cd backend

# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild API
docker compose up -d --build api

# View logs
docker compose logs api --tail=100 --follow

# Run tests (on host, requires Maven)
mvn test -B

# Access database
docker compose exec db psql -U lms -d lms

# Check container health
docker compose ps
```

### Frontend

```bash
cd fe

# Install dependencies
npm install

# Run dev server
npm start

# Build for production
npm run build

# Lint code
npm run lint

# Run tests
npm test
```

---

## Project Stats

| Metric | Value |
|--------|-------|
| **Backend Files** | 302 Java files |
| **Frontend Components** | 257 components |
| **REST Endpoints** | 114 endpoints (Swagger-documented) |
| **Database Tables** | 34 tables |
| **Test Cases** | 202 tests (backend) |
| **Total LOC** | ~100k+ lines |
| **Modules (Backend)** | 9 bounded contexts |
| **Architecture Score** | 9.5/10 (Clean Architecture) |

---

## Next Steps

1. **Đọc tài liệu chi tiết:**
   - Backend: [`backend/README.md`](backend/README.md)
   - Frontend: [`fe/FRONTEND_ARCHITECTURE.md`](fe/FRONTEND_ARCHITECTURE.md)
   - AI Guide: [`CLAUDE.md`](CLAUDE.md)

2. **Khám phá code:**
   - Backend: `backend/src/main/java/com/example/lms/`
   - Frontend: `fe/src/app/features/`
   - Database: `backend/src/main/resources/db/`

3. **Tham gia phát triển:**
   - Xem issues / backlog
   - Pick một task nhỏ để làm quen
   - Follow development workflow ở trên

4. **Join team communication:**
   - Slack / Discord / Teams (link từ team lead)
   - Daily standup (nếu có)

---

## Support & Contact

- **Technical Issues**: Tạo GitHub issue hoặc hỏi trong team chat
- **Architecture Questions**: Đọc `CLAUDE.md` hoặc `backend/README.md`
- **Code Review**: Submit PR và tag reviewers

---

**Welcome to the team! 🚢⚓**

*Last updated: 2026-02-06*
