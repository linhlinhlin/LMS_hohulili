# Maritime LMS Backend

> **Spring Boot 3.2.6 + Java 21 + PostgreSQL 16** | Clean Architecture / DDD | 302 source files | 202 tests

## Quick Start

```bash
# Start everything (DB + API)
cd backend && docker compose up -d

# Verify
curl -s http://localhost:8088/api/v3/courses | head -50

# Logs
docker compose logs api --tail=100
```

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:8088/api/v3 | JWT Bearer |
| **Swagger UI** | **http://localhost:8088/swagger-ui** | - (114 endpoints documented) |
| OpenAPI Spec | http://localhost:8088/v3/api-docs | - |
| pgAdmin | http://localhost:8081 | `admin@devmail.net` / `S3cure!Passw0rd` |
| PostgreSQL | localhost:5432/lms | `lms` / `lms` |

**Test Accounts** (auto-created on first startup):

| Role | Email | Password | Full Name |
|------|-------|----------|-----------|
| ADMIN | `admin@maritime.edu` | `admin123` | Admin User |
| TEACHER | `teacher@maritime.edu` | `teacher123` | Teacher User |
| STUDENT | `student@maritime.edu` | `student123` | Student User |

---

## Architecture

### Clean Architecture + DDD (Modular Monolith)

```
com.example.lms/
├── identity/              # Users, Authentication, Roles (JWT)
├── course_authoring/      # Course, Chapter, Lesson, ContentBlock, Package, Category
├── course_management/     # Admin course operations (approve/reject/publish)
├── learning_delivery/     # LearningClass, Enrollment, Progress
├── assessment/            # Assignment, Quiz, Question, Submission
├── communication/         # Messages, Forum, Conversations
├── ai_assistant/          # AI Chat integration (streaming SSE)
├── shared/                # Value objects, domain events, exceptions, file service
└── config/                # Security, CORS, JWT filter, rate limiting, R2 storage
```

### Layer Structure (Per Module)

```
{module}/
├── domain/
│   ├── model/            # Pure domain entities (NO framework annotations)
│   ├── repository/       # Repository INTERFACES (ports)
│   ├── valueobject/      # Value objects (CourseCode, Email, UserId)
│   └── event/            # Domain events
├── application/
│   ├── usecase/          # Single-responsibility use cases
│   ├── dto/              # Commands, responses
│   └── port/             # Application-level port interfaces (TokenService)
└── infrastructure/
    ├── persistence/
    │   ├── entity/       # JPA entities (*JpaEntity) - annotated with @Entity
    │   ├── repository/   # Spring Data JPA repositories (use JpaEntity!)
    │   ├── mapper/       # Entity <-> Domain mappers
    │   └── *Adapter.java # Repository port implementations
    └── web/              # REST controllers (@RestController)
```

### Dependency Rule

```
Domain ← Application ← Infrastructure
(inner)   (middle)      (outer)
```

- **Domain layer**: Zero framework imports. Pure Java business logic.
- **Application layer**: Depends on domain ports only. NO JPA, NO Spring annotations.
- **Infrastructure layer**: Implements domain/application ports. Contains Spring, JPA, HTTP.

---

## Database Schema

### PostgreSQL 16 Schema Files

| File | Purpose | Tables | Status |
|------|---------|--------|--------|
| **V1__lms_complete_schema.sql** | **Comprehensive reference schema** | 34 | ✅ Production-ready |
| V26__normalize_enums.sql | Normalize enums to UPPERCASE | - | ✅ Applied |
| V27__add_performance_indexes.sql | 26 performance indexes | - | ✅ Applied |
| V28__add_foreign_key_constraints.sql | 13 FK constraints | - | ✅ Applied |
| V29__complete_assignment_entities.sql | Assignment entity columns | - | ✅ Applied |
| V30__add_missing_indexes.sql | 11 additional indexes | - | ✅ Applied |

**V1__lms_complete_schema.sql** (New - 1,241 lines):
- 🎯 **Single source of truth** for database architecture
- 34 tables (31 entities + 1 collection + 2 security tables)
- 94 indexes (B-tree, BRIN, GIN, partial)
- 24 triggers (auto `updated_at` + audit logging)
- 2 materialized views (analytics dashboards)
- PostgreSQL 16+ features: BRIN for time-series, GIN for JSONB/full-text search
- Seed data: 5 categories + admin user
- Can be used as Flyway baseline for fresh deployments

**Schema Stats:**
- **34 tables**: identity (1), course_authoring (8), course_management (1), learning_delivery (3), assessment (12), communication (2), ai_assistant (2), shared (3), security (2)
- **94 indexes**: 60+ B-tree, 9 partial, 6 BRIN, 12 GIN, 7 unique
- **54 foreign keys**: CASCADE on children, SET NULL on soft dependencies
- **All enums validated** at DB level with CHECK constraints

### Key Schema Features

| Feature | Implementation | Benefit |
|---------|----------------|---------|
| Full-text search | `pg_trgm` + GIN trigram indexes | 10-50x faster course search |
| Analytics | Materialized views (refresh concurrently) | 100-9000x faster dashboard queries |
| Time-series queries | BRIN indexes on `created_at` | 100x smaller index, fast range scans |
| JSONB queries | GIN indexes on `content_blocks`, `progress` | JSONB containment queries indexed |
| Status filters | Partial indexes (e.g., `status = 'PUBLISHED'`) | 50-80% smaller indexes |
| Auto timestamps | `fn_set_updated_at()` trigger on 18 tables | Consistent across all tables |
| Audit trail | Generic `fn_audit_trigger()` on 4 critical tables | Compliance-grade change tracking |
| Security logging | `login_attempts` table with INET type | Brute force detection |

---

## Health & Monitoring

### Container Status

```bash
docker compose ps
# Expected: All containers "healthy"
```

| Container | Status | Port | Health Check |
|-----------|--------|------|--------------|
| lms-backend | ✅ Healthy | 8088 | `/actuator/health` → `{"status":"UP"}` |
| lms-postgres | ✅ Healthy | 5432 | `pg_isready` |
| backend-pgadmin-1 | ✅ Up | 8081 | - |

### Health Endpoints

| Endpoint | Access | Purpose |
|----------|--------|---------|
| `/actuator/health` | Public | Docker HEALTHCHECK + monitoring |
| `/actuator/info` | Public | Build info, version |
| `/swagger-ui` | Public | API documentation |

**Note**: `/actuator/health` is **whitelisted** in SecurityConfig (no JWT required) for Docker health checks.

### Test Suite

```bash
mvn test -B
# Expected: Tests run: 202, Failures: 0, Errors: 0
```

**Coverage**: ~35-40% (target: 50%+)

---

## API Documentation

### Swagger UI (Interactive API Docs)

**Access**: http://localhost:8088/swagger-ui

**Features:**
- ✅ **114 endpoints** fully documented with request/response schemas
- ✅ **17 API tags** organized by domain module
- ✅ **Try it out** - Test endpoints directly from browser
- ✅ **JWT Authentication** - Built-in authorization testing
- ✅ **OpenAPI 3.0.1** - Standard specification format

### API Modules (17 tags)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Authentication v3** | 7 | Login, register, JWT refresh, profile |
| **Course Authoring V3** | 12 | Create/update courses, chapters, lessons |
| **Course Query V3** | 8 | Public course browsing, search |
| **Admin - Courses** | 7 | Approve/reject/publish courses |
| **Admin - Users** | 6 | User management (CRUD) |
| **Teacher - Courses** | 10 | Teacher course management |
| **Teacher - Assignments** | 9 | Assignment creation, grading |
| **Teacher - Students** | 5 | Student enrollment, progress |
| **Student Enrollment V3** | 6 | Enrollment queries, progress |
| **Quiz V3** | 11 | Quiz CRUD, attempts, grading |
| **Question V3** | 8 | Question bank management |
| **Packages V3** | 5 | Question package organization |
| **Classes V3** | 7 | Learning class management |
| **Communication V3** | 5 | Messaging between users |
| **AI Assistant** | 6 | AI chatbot, sessions, health |
| **File Upload V3** | 2 | File upload/download (R2) |
| **Course Authoring Support V3** | 2 | Categories, support endpoints |

### OpenAPI Specification

**Raw JSON**: http://localhost:8088/v3/api-docs

**Metadata:**
```json
{
  "title": "LMS Backend API",
  "version": "v1.0.0",
  "description": "Learning Management System Backend REST API với Spring Boot, PostgreSQL và JWT Authentication",
  "servers": [
    {"url": "http://localhost:8088", "description": "Development"},
    {"url": "https://api.lms.com", "description": "Production"}
  ]
}
```

### Sample Endpoints

#### Authentication
```bash
# Register
POST /api/v3/auth/register
Body: {"username": "...", "email": "...", "password": "...", "fullName": "...", "role": "STUDENT"}

# Login (returns JWT)
POST /api/v3/auth/login
Body: {"email": "admin@maritime.edu", "password": "admin123"}

# Get current user
GET /api/v3/auth/me
Headers: Authorization: Bearer {token}
```

#### Courses
```bash
# Browse public courses (paginated)
GET /api/v3/courses?page=0&size=20&sort=createdAt,desc

# Get course detail
GET /api/v3/courses/{courseId}

# Create course (TEACHER only)
POST /api/v3/teacher/courses
Headers: Authorization: Bearer {token}
```

#### AI Assistant
```bash
# Send message to AI
POST /api/v3/ai/chat
Headers: Authorization: Bearer {token}
Body: {"sessionId": "...", "message": "Explain maritime navigation"}

# Get chat sessions
GET /api/v3/ai/sessions
Headers: Authorization: Bearer {token}
```

### Testing with curl

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8088/api/v3/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maritime.edu","password":"admin123"}' \
  | grep -o '"accessToken":"[^"]*"' \
  | cut -d'"' -f4)

# 2. Call protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8088/api/v3/admin/users

# 3. Create a course
curl -X POST http://localhost:8088/api/v3/teacher/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Course","description":"..."}'
```

---

## Module Inventory

### Codebase Stats

| Metric | Count |
|--------|-------|
| Java source files | 302 |
| Bounded contexts (modules) | 9 |
| Domain models | 29 |
| Use cases | 54 |
| REST controllers | 17 |
| REST endpoints | 114 |
| JPA entities | 29 |
| Flyway migrations | V26 - V30 + V1 (reference) |
| Test files | 27 |
| Test cases | 202 |
| Domain events | 11 |
| @PreAuthorize annotations | 79 |

### Module Breakdown

| Module | Domain Models | Use Cases | Controllers | Endpoints |
|--------|--------------|-----------|-------------|-----------|
| identity | User, Role | 5 (Auth, Register, Refresh, UpdateUser) | 2 (Auth, User) | 13 |
| course_authoring | Course, Chapter, Lesson, Section, ContentBlock, Category, Package | 12 (Create/Approve/Reject Course, Chapter, Lesson, ContentBlock, Package) | 4 (Authoring, Query, Package, Publish) | 20 |
| course_management | Course, Chapter, Lesson | 4 (Publish, CourseAuthoring, GetDraft) | 3 (Admin, Teacher, Authoring) | 16 |
| learning_delivery | LearningClass, Enrollment | 9 (Create/Update/Delete Class, Enroll, Drop, Close, Progress) | 3 (Class, Enrollment, TeacherStudent) | 17 |
| assessment | Assignment, Quiz, Question, Submission | 14 (CRUD + Grading + Attempts) | 3 (Assignment, Quiz, Question) | 26 |
| communication | Conversation, Message | 3 | 1 | 6 |
| ai_assistant | ChatSession, KnowledgeDocument | 5 | 1 | 10 |
| shared | ContentBlock, FileMetadata | 2 (FileManagement) | 1 (FileUpload) | 2 |
| config | - | - | - | - |

---

## API Reference (118 Endpoints)

### Identity Module

#### AuthControllerV3 (`/api/v3/auth`)
```
POST   /api/v3/auth/register           # User registration
POST   /api/v3/auth/login              # Login → JWT tokens
POST   /api/v3/auth/logout             # Logout
POST   /api/v3/auth/refresh            # Refresh JWT token
GET    /api/v3/auth/profile            # Get current user profile
PUT    /api/v3/auth/profile            # Update profile
```

#### UserControllerV3 (`/api/v3/users`)
```
GET    /api/v3/users                   # List users (ADMIN)
GET    /api/v3/users/{id}              # Get user by ID
PUT    /api/v3/users/{id}              # Update user (ADMIN)
DELETE /api/v3/users/{id}              # Delete user (ADMIN)
PUT    /api/v3/users/{id}/role         # Change role (ADMIN)
PUT    /api/v3/users/{id}/enable       # Enable account (ADMIN)
PUT    /api/v3/users/{id}/disable      # Disable account (ADMIN)
```

### Course Authoring Module

#### CourseAuthoringControllerV3 (`/api/v3/authoring`)
```
POST   /api/v3/authoring/courses                                  # Create course
PUT    /api/v3/authoring/courses/{id}                              # Update course info
PUT    /api/v3/authoring/courses/{id}/thumbnail                    # Update thumbnail
POST   /api/v3/authoring/courses/{courseId}/chapters               # Add chapter
PUT    /api/v3/authoring/courses/{courseId}/chapters/reorder        # Reorder chapters
POST   /api/v3/authoring/courses/{courseId}/chapters/{chId}/lessons # Add lesson
PUT    /api/v3/authoring/courses/{courseId}/lessons/reorder         # Reorder lessons
PUT    /api/v3/authoring/lessons/{lessonId}                        # Update lesson
POST   /api/v3/authoring/lessons/{lessonId}/content-blocks         # Add content block
PUT    /api/v3/authoring/content-blocks/{blockId}                  # Update content block
DELETE /api/v3/authoring/content-blocks/{blockId}                  # Delete content block
POST   /api/v3/authoring/courses/{id}/submit                      # Submit for approval
```

#### CourseAuthoringController (`/api/v3/authoring`)
```
POST   /api/v3/authoring/courses/{courseId}/publish                # Publish course
```

#### CourseQueryControllerV3 (`/api/v3/courses`)
```
GET    /api/v3/courses                                             # List courses (paginated)
GET    /api/v3/courses/{id}                                        # Course detail
GET    /api/v3/courses/{id}/full                                   # Full course with chapters/lessons
GET    /api/v3/courses/search                                      # Search courses
GET    /api/v3/courses/categories                                  # List categories
```

#### PackageControllerV3 (`/api/v3/packages`)
```
GET    /api/v3/packages                                            # List packages
POST   /api/v3/packages                                            # Create package
PUT    /api/v3/packages/{id}                                       # Update package
DELETE /api/v3/packages/{id}                                       # Delete package
```

### Course Management Module

#### AdminCoursesControllerV3 (`/api/v3/admin/courses`)
```
GET    /api/v3/admin/courses                                       # All courses (ADMIN)
GET    /api/v3/admin/courses/pending                                # Pending approval (ADMIN)
POST   /api/v3/admin/courses/{id}/approve                          # Approve course (ADMIN)
POST   /api/v3/admin/courses/{id}/reject                           # Reject course (ADMIN)
GET    /api/v3/admin/stats                                         # Dashboard stats (ADMIN)
```

#### TeacherCoursesControllerV3 (`/api/v3/teacher/courses`)
```
GET    /api/v3/teacher/courses                                     # My courses (TEACHER)
GET    /api/v3/teacher/courses/{id}                                 # Course detail (TEACHER)
GET    /api/v3/teacher/courses/{id}/draft                           # Get draft (TEACHER)
GET    /api/v3/teacher/courses/{id}/students                        # Course students
```

### Learning Delivery Module

#### ClassControllerV3 (`/api/v3/classes`)
```
GET    /api/v3/classes                                              # List classes
POST   /api/v3/classes                                              # Create class
GET    /api/v3/classes/{id}                                         # Class detail
PUT    /api/v3/classes/{id}                                         # Update class
DELETE /api/v3/classes/{id}                                         # Delete class
POST   /api/v3/classes/{id}/close                                   # Close class
GET    /api/v3/classes/{id}/students                                 # Class students
POST   /api/v3/classes/{id}/students                                 # Add student to class
DELETE /api/v3/classes/{id}/students/{studentId}                     # Remove student
```

#### StudentEnrollmentControllerV3 (`/api/v3/enrollments`)
```
GET    /api/v3/enrollments/my                                       # My enrollments (STUDENT)
POST   /api/v3/enrollments                                          # Enroll in class
DELETE /api/v3/enrollments/{id}                                     # Drop enrollment
GET    /api/v3/enrollments/{id}/progress                            # Get progress
PUT    /api/v3/enrollments/{id}/progress                            # Update progress
```

#### TeacherStudentControllerV3 (`/api/v3/teacher/students`)
```
GET    /api/v3/teacher/students                                     # My students (TEACHER)
GET    /api/v3/teacher/students/{id}                                # Student detail
POST   /api/v3/teacher/students/{id}/message                        # Message student
```

### Assessment Module

#### AssignmentControllerV3 (`/api/v3/assignments`)
```
GET    /api/v3/assignments                                          # List assignments
POST   /api/v3/assignments                                          # Create assignment
GET    /api/v3/assignments/{id}                                     # Assignment detail
PUT    /api/v3/assignments/{id}                                     # Update assignment
DELETE /api/v3/assignments/{id}                                     # Delete assignment
POST   /api/v3/assignments/{id}/publish                             # Publish assignment
POST   /api/v3/assignments/{id}/close                               # Close assignment
GET    /api/v3/assignments/course/{courseId}                         # By course
GET    /api/v3/assignments/teacher/summary                           # Teacher summary
POST   /api/v3/assignments/{id}/submissions                         # Submit work
GET    /api/v3/assignments/{id}/submissions                         # List submissions
PUT    /api/v3/assignments/submissions/{subId}/grade                 # Grade submission
```

#### QuizControllerV3 (`/api/v3/quizzes`)
```
GET    /api/v3/quizzes                                              # List quizzes
POST   /api/v3/quizzes                                              # Create quiz
GET    /api/v3/quizzes/{id}                                         # Quiz detail
PUT    /api/v3/quizzes/{id}                                         # Update quiz
DELETE /api/v3/quizzes/{id}                                         # Delete quiz
POST   /api/v3/quizzes/{id}/publish                                 # Publish quiz
POST   /api/v3/quizzes/{id}/attempts                                # Start attempt
PUT    /api/v3/quizzes/attempts/{attemptId}/submit                   # Submit attempt
GET    /api/v3/quizzes/attempts/{attemptId}/result                   # Get result
```

#### QuestionControllerV3 (`/api/v3/questions`)
```
GET    /api/v3/questions                                            # Question bank
POST   /api/v3/questions                                            # Create question
GET    /api/v3/questions/{id}                                       # Question detail
PUT    /api/v3/questions/{id}                                       # Update question
DELETE /api/v3/questions/{id}                                       # Delete question
```

### Communication Module

#### CommunicationControllerV3 (`/api/v3/communication`)
```
GET    /api/v3/communication/conversations                          # My conversations
POST   /api/v3/communication/conversations                          # Start conversation
GET    /api/v3/communication/conversations/{id}/messages             # Get messages
POST   /api/v3/communication/conversations/{id}/messages             # Send message
POST   /api/v3/communication/forum/posts                            # Create forum post
GET    /api/v3/communication/forum/posts                            # List forum posts
```

### AI Assistant Module

#### AiAssistantControllerV3 (`/api/v3/ai`)
```
POST   /api/v3/ai/chat                                             # Send message (SSE streaming)
GET    /api/v3/ai/sessions                                          # List sessions
POST   /api/v3/ai/sessions                                          # Create session
DELETE /api/v3/ai/sessions/{id}                                     # Delete session
GET    /api/v3/ai/sessions/{id}/messages                            # Session messages
POST   /api/v3/ai/knowledge/upload                                  # Upload knowledge doc
GET    /api/v3/ai/knowledge                                         # List knowledge docs
DELETE /api/v3/ai/knowledge/{id}                                    # Delete knowledge doc
GET    /api/v3/ai/knowledge/stats                                   # Knowledge stats
POST   /api/v3/ai/knowledge/search                                  # Search knowledge
```

### Shared Module

#### FileUploadControllerV3 (`/api/v3/files`)
```
POST   /api/v3/files/upload                                         # Upload file (R2/local)
GET    /api/v3/files/{filename}                                     # Download file
```

---

## Domain Models

### Core Aggregates

#### Course (course_authoring)
```
Course ──┬── chapters: List<Chapter>
         │       └── lessons: List<Lesson>
         │               └── contentBlocks: List<ContentBlock>
         ├── code: CourseCode (value object)
         ├── status: DRAFT → PENDING → APPROVED/REJECTED → PUBLISHED → ARCHIVED
         ├── pricing: FREE/PAID + price/salePrice
         └── visibility: PUBLIC/PRIVATE/UNLISTED
```

**Status Lifecycle**:
```
DRAFT ──submit()──> PENDING ──approve()──> APPROVED ──publish()──> PUBLISHED
                        │                                              │
                        └──reject()──> REJECTED ──resubmit()──> PENDING
                                                                       │
                                                              archive()──> ARCHIVED
```

#### Assignment (assessment)
```
Assignment ──┬── rubrics: List<Rubric>
             ├── attachments: List<Attachment>
             ├── submissions: List<Submission>
             ├── type: ESSAY/QUIZ/PROJECT/LAB
             └── status: DRAFT → PUBLISHED → CLOSED
```

#### LearningClass (learning_delivery)
```
LearningClass ──┬── enrollments: List<Enrollment>
                ├── courseId: UUID
                ├── teacherId: UUID
                └── status: OPEN → CLOSED → ARCHIVED → CANCELLED
```

#### Enrollment (learning_delivery)
```
Enrollment ──┬── status: ACTIVE → COMPLETED/DROPPED/SUSPENDED
             ├── completionPercent: 0-100 (auto-completes at 100%)
             └── lessonProgress: Map<lessonId, Boolean>
```

### Value Objects (shared/domain/valueobject)

| Value Object | Usage |
|-------------|-------|
| `UserId` | Wraps UUID for user identity |
| `Email` | Validated email with normalization (lowercase, trim) |
| `CourseCode` | Unique course identifier code |
| `ContentBlock` | Rich content: TEXT, IMAGE, VIDEO, FORMULA, CODE |

### Domain Events (11 total)

| Event | Published By | Consumed By |
|-------|-------------|-------------|
| `CourseCreatedEvent` | CreateCourseUseCase | (logged) |
| `CourseApprovedEvent` | ApproveCourseUseCase | (notification) |
| `CourseRejectedEvent` | RejectCourseUseCase | (notification) |
| `CoursePublishedEvent` | PublishCourseUseCase | (indexing) |
| `UserRegisteredEvent` | RegisterUserUseCaseV2 | (welcome email) |
| `StudentEnrolledEvent` | EnrollStudentUseCaseV3 | (progress init) |
| `StudentDroppedEvent` | DropStudentUseCase | (cleanup) |
| `AssignmentCreatedEvent` | CreateAssignmentUseCaseV3 | (notification) |
| `AssignmentSubmittedEvent` | SubmitAssignmentUseCase | (grading queue) |
| `QuizAttemptCompletedEvent` | QuizAttemptUseCase | (scoring) |
| `ClassClosedEvent` | CloseClassUseCase | (enrollment freeze) |

---

## Security

### Authentication
- **JWT Bearer tokens** (JJWT 0.12.3)
- Access token + Refresh token pattern
- Token generation via `TokenService` port (application layer)

### Authorization
- **79 @PreAuthorize annotations** across controllers
- Roles: `ADMIN`, `TEACHER`, `INSTRUCTOR`, `STUDENT`
- Method-level security with SpEL expressions

### Security Hardening
| Feature | Implementation |
|---------|---------------|
| CORS | Specific origins via `CORS_ALLOWED_ORIGINS` env var |
| Security Headers | X-Frame-Options: DENY, HSTS, X-Content-Type-Options: nosniff |
| Rate Limiting | Auth endpoints (`RateLimitingFilter`) |
| File Upload | MIME type validation + filename sanitization |
| Password | BCrypt hashing |
| User Enumeration | `hideUserNotFoundExceptions=true` |

### SecurityConfig Key Paths
```java
// Public (no auth required)
/api/v3/auth/login, /api/v3/auth/register, /api/v3/auth/refresh
/api/v3/courses (GET), /api/v3/courses/{id} (GET)
/swagger-ui/**, /v3/api-docs/**

// Authenticated (any role)
/api/v3/auth/profile, /api/v3/auth/logout

// Role-specific
/api/v3/admin/**        → ADMIN only
/api/v3/teacher/**      → TEACHER, INSTRUCTOR, ADMIN
/api/v3/assignments/**  → TEACHER, STUDENT (varies by endpoint)
```

---

## Database

### PostgreSQL 16 Configuration
```yaml
Database: lms
User: lms
Password: lms
Port: 5432 (Docker) / 5432 (local)
```

### Flyway Migrations

| Version | Description |
|---------|-------------|
| V26 | Normalize enums across all tables |
| V27 | Add performance indexes (conversations, enrollments) |
| V28 | Add foreign key constraints |
| V29 | Complete assignment entities (rubrics, attachments) |
| V30 | Add 13 missing indexes (chat, assignments, files) |

**Note**: Migrations V1-V25 exist in production database history but SQL files are managed externally. V26+ are in `src/main/resources/db/migration/`.

### Key Tables

| Table | Module | Indexes |
|-------|--------|---------|
| users | identity | email (unique), username (unique) |
| courses | course_authoring | code (unique), teacher_id, category_id, status |
| chapters | course_authoring | course_id, sort_order |
| lessons | course_authoring | chapter_id, sort_order |
| content_blocks | course_authoring | lesson_id, sort_order |
| learning_classes | learning_delivery | course_id, teacher_id, status |
| enrollments | learning_delivery | class_id + student_id (unique), student_id |
| assignments | assessment | course_id, class_id, teacher_id, status |
| assignment_submissions | assessment | assignment_id, student_id |
| quizzes | assessment | lesson_id, course_id |
| questions | assessment | package_id, difficulty |
| conversations | communication | participant IDs |
| chat_sessions | ai_assistant | user_id |

---

## Tech Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Java | 21 | Language (virtual threads capable) |
| Spring Boot | 3.2.6 | Application framework |
| Spring Security | 6.x | Authentication & authorization |
| Spring Data JPA | 3.2.x | Data access (Hibernate 6.4) |
| Spring Validation | 3.2.x | Jakarta Bean Validation |
| Spring Actuator | 3.2.x | Health checks & metrics |
| Spring WebFlux | 3.2.x | SSE streaming (AI chat) |
| Spring Kafka | 3.2.x | Event messaging (optional) |
| PostgreSQL | 16 | Database |
| Flyway | 10.x | Database migrations |
| JJWT | 0.12.3 | JWT token handling |
| SpringDoc OpenAPI | 2.5.0 | API documentation (Swagger UI) |
| Caffeine | (managed) | In-memory caching |
| Hypersistence Utils | 3.7.0 | JSONB column support |
| AWS SDK S3 | 2.25.0 | Cloudflare R2 file storage |
| Apache POI | 5.2.4 | Document parsing (Word, Excel, PPT) |
| Lombok | 1.18.32 | Code generation |
| ArchUnit | 1.2.1 | Architecture testing |

### Test Dependencies
- JUnit 5 (Jupiter)
- Mockito
- AssertJ
- Spring Security Test
- ArchUnit

---

## Docker Setup

### docker-compose.yml Services

```
db (postgres:16-alpine)     → Port 5432
pgadmin (dpage/pgadmin4)    → Port 8081
api (custom Dockerfile)     → Port 8088 → 8080 internal
```

### Resource Limits
```yaml
api:
  limits:   2 CPU / 2GB RAM
  reserved: 0.5 CPU / 512MB RAM
```

### Commands
```bash
# Start all services
docker compose up -d

# Rebuild after code changes
docker compose build api --no-cache && docker compose up -d api

# View logs
docker compose logs api --tail=100 -f

# Stop
docker compose down

# Reset database
docker compose down -v && docker compose up -d
```

---

## Configuration

### Profiles

| Profile | Port | SQL Logging | Flyway | Purpose |
|---------|------|-------------|--------|---------|
| dev | 8080 (Docker: 8088) | true | true | Development |
| prod | 8080 | false | true | Production |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_PROFILES_ACTIVE` | dev | Active profile |
| `SPRING_DATASOURCE_URL` | jdbc:postgresql://db:5432/lms | Database URL |
| `SPRING_DATASOURCE_USERNAME` | lms | DB username |
| `SPRING_DATASOURCE_PASSWORD` | lms | DB password |
| `CORS_ALLOWED_ORIGINS` | http://localhost:4200 | CORS origins (comma-separated) |
| `SPRING_AI_SERVICE_URL` | (Render URL) | AI chatbot backend |
| `R2_ACCESS_KEY` | - | Cloudflare R2 access key |
| `R2_SECRET_KEY` | - | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | - | R2 bucket name |
| `R2_ENDPOINT` | - | R2 endpoint URL |

---

## Testing

### Current Coverage
- **202 tests** across 27 test files
- All passing (BUILD SUCCESS)
- Estimated line coverage: ~35-40%

### Test Structure
```
src/test/java/com/example/lms/
├── course_authoring/
│   ├── domain/model/CourseTest.java          # 18 tests - lifecycle, pricing, chapters
│   └── application/usecase/
│       ├── CreateCourseUseCaseTest.java       # 6 tests
│       ├── ApproveCourseUseCaseTest.java      # 5 tests
│       ├── CreateChapterUseCaseV3Test.java    # 2 tests
│       ├── CreateLessonUseCaseV3Test.java     # 2 tests
│       └── ManageContentBlockUseCaseV3Test.java # 7 tests
├── assessment/
│   ├── domain/model/
│   │   ├── AssignmentTest.java               # 12 tests - lifecycle, validation
│   │   ├── QuizTest.java                     # 10 tests - publish, questions
│   │   └── QuestionTest.java                 # 3 tests
│   └── application/usecase/
│       ├── CreateAssignmentUseCaseV3Test.java # 3 tests
│       ├── UpdateAssignmentUseCaseV3Test.java # 5 tests
│       └── UpdateQuestionUseCaseV3Test.java   # 4 tests
├── identity/
│   ├── domain/model/UserTest.java            # 5 tests
│   └── application/usecase/
│       ├── AuthenticateUserUseCaseV2Test.java # 7 tests
│       ├── RegisterUserUseCaseV2Test.java     # 10 tests
│       └── UpdateUserUseCaseV3Test.java       # 4 tests
├── learning_delivery/
│   ├── domain/model/
│   │   ├── EnrollmentTest.java               # 10 tests - status, progress
│   │   └── LearningClassTest.java            # 10 tests - status transitions
│   └── application/usecase/
│       ├── CreateLearningClassUseCaseV3Test.java # 6 tests
│       └── EnrollStudentUseCaseV3Test.java       # 6 tests
└── shared/domain/valueobject/
    └── EmailTest.java                        # 7 tests
```

### Test Patterns
```java
// Domain model tests: NO mocks, test state + exceptions
@Test
void shouldTransitionFromDraftToPending() {
    Course course = Course.create(code, "Title", "Desc", teacherId);
    course.addChapter("Ch1", "Desc");
    course.submitForApproval();
    assertThat(course.getStatus()).isEqualTo(CourseStatus.PENDING);
}

// Use case tests: @Mock repos, @InjectMocks use case
@ExtendWith(MockitoExtension.class)
class CreateCourseUseCaseTest {
    @Mock private CourseRepository courseRepository;
    @InjectMocks private CreateCourseUseCase useCase;
    // Given/When/Then pattern with AssertJ + Mockito
}
```

### Running Tests
```bash
# Inside Docker
docker compose exec api mvn test -B

# Local (requires Java 21 + Maven)
cd backend && mvn test -B

# Specific test class
mvn test -Dtest=CourseTest -B

# Specific module tests
mvn test -Dtest="com.example.lms.assessment.**" -B
```

---

## Patterns & Conventions

### JPA Repository Rule (CRITICAL)

```java
// CORRECT - JPA repos use JpaEntity classes
@Repository
public interface AssignmentJpaRepository extends JpaRepository<AssignmentJpaEntity, UUID> {}

// WRONG - causes "Not a managed type" startup error
public interface BadRepo extends JpaRepository<Assignment, UUID> {} // Domain model!
```

### Repository Adapter Pattern

```java
// Domain port (interface)
public interface AssignmentRepository {
    Assignment findById(UUID id);
    Assignment save(Assignment assignment);
    void deleteById(UUID id);
}

// Infrastructure adapter (implementation)
@Component
public class AssignmentRepositoryAdapter implements AssignmentRepository {
    private final AssignmentJpaRepository jpaRepo;
    private final AssignmentEntityMapper mapper;

    @Override
    public Assignment findById(UUID id) {
        return jpaRepo.findById(id).map(mapper::toDomain).orElse(null);
    }

    @Override
    public Assignment save(Assignment assignment) {
        var entity = mapper.toEntity(assignment);
        return mapper.toDomain(jpaRepo.save(entity));
    }
}
```

### Use Case Pattern

```java
@Component
@RequiredArgsConstructor
public class CreateAssignmentUseCaseV3 {
    private final AssignmentRepository assignmentRepository;  // Domain port only!

    public UUID execute(CreateAssignmentCommand cmd) {
        var assignment = Assignment.create(cmd.title(), cmd.courseId(), cmd.teacherId());
        assignment = assignmentRepository.save(assignment);
        return assignment.getId();
    }
}
```

### Rich Domain Model

```java
// Domain model with business logic (NO anemic model)
public class Course extends BaseEntity<UUID> {
    private CourseCode code;
    private String title;
    private CourseStatus status;
    private List<Chapter> chapters;

    // Factory method
    public static Course create(CourseCode code, String title, String desc, UUID teacherId) {
        // Validation logic here
        return new Course(...);
    }

    // Business methods (NOT setters)
    public void submitForApproval() {
        ensureEditable();
        if (chapters.isEmpty()) throw new BusinessRuleException("Must have chapters");
        this.status = CourseStatus.PENDING;
    }

    public void approve(UUID reviewerId, String comment) {
        if (status != CourseStatus.PENDING) throw new BusinessRuleException("Must be pending");
        this.status = CourseStatus.APPROVED;
    }
}
```

### Unified API Response

```java
// All endpoints return ApiResponse wrapper
public record ApiResponse<T>(boolean success, String message, T data) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Success", data);
    }
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }
}
```

### Domain Exceptions

```java
// Use specific exceptions, NOT RuntimeException
throw new EntityNotFoundException("Course", courseId);      // 404
throw new BusinessRuleException("Course must be pending");  // 400
throw new ValidationException("Title cannot be blank");     // 400
throw new UnauthorizedException("Invalid credentials");     // 401
```

### DTO Validation

```java
// All request DTOs use Jakarta Bean Validation
public record CreateCourseCommand(
    @NotBlank String code,
    @NotBlank @Size(max = 255) String title,
    @Size(max = 5000) String description,
    @NotNull UUID teacherId
) {}

// Controllers use @Valid
@PostMapping("/courses")
public ResponseEntity<?> create(@Valid @RequestBody CreateCourseCommand cmd) {
    // Validation errors → 400 automatically
}
```

---

## Adding a New Feature (Guide for Agents)

### Step 1: Domain First
1. Create domain model in `{module}/domain/model/`
2. Add repository port interface in `{module}/domain/repository/`
3. Add domain events if needed in `{module}/domain/event/`

### Step 2: Application Layer
1. Create use case in `{module}/application/usecase/`
2. Create command/response DTOs in `{module}/application/dto/`
3. Use case depends on domain ports only - NO infrastructure imports

### Step 3: Infrastructure
1. Create JPA entity in `{module}/infrastructure/persistence/entity/` (suffix: `*JpaEntity`)
2. Create JPA repository in `{module}/infrastructure/persistence/` (use JpaEntity!)
3. Create mapper in `{module}/infrastructure/persistence/mapper/`
4. Create adapter implementing domain port
5. Create controller in `{module}/infrastructure/web/`

### Step 4: Database
1. Create Flyway migration in `src/main/resources/db/migration/V{N}__description.sql`
2. Version must be next sequential number after V30

### Step 5: Testing
1. Domain model tests (pure logic, no mocks)
2. Use case tests (@Mock repos, @InjectMocks use case)
3. Run `mvn test -B` to verify all 202+ tests pass

### Checklist
- [ ] Domain model has NO framework annotations
- [ ] JPA repository uses `*JpaEntity` class
- [ ] Use case has ZERO infrastructure imports
- [ ] Controller has `@Valid` on request bodies
- [ ] Controller has `@PreAuthorize` for authorization
- [ ] New endpoint added to this README
- [ ] Flyway migration for any schema changes
- [ ] Tests added and passing

---

## Troubleshooting

### "Not a managed type: class X"
JPA repository using domain model. Check `infrastructure/persistence/` for repos extending `JpaRepository<DomainModel, UUID>` and change to `JpaRepository<XJpaEntity, UUID>`.

### "Access key cannot be blank"
R2 storage not configured. Set `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` env vars, or disable R2 in `application-dev.yml`.

### Bean name collision
Two `@Component` classes with same bean name across modules. Add explicit `@Component("moduleName_BeanName")`.

### Port 8088 not accessible
```bash
docker compose ps          # Check container status
docker compose logs api    # Check for startup errors
```

### Database connection refused
```bash
docker compose ps          # Is 'db' container healthy?
docker compose logs db     # Check postgres logs
```

### Container shows "unhealthy"
```bash
# Check health endpoint directly
curl http://localhost:8088/actuator/health

# If 403 Forbidden: /actuator/health not whitelisted in SecurityConfig
# Fix: Add "/actuator/health" to permitAll() list (already fixed in current version)

# Check Docker health check logs
docker inspect lms-backend --format='{{.State.Health.Status}}'
```

---

*Last updated: 2026-02-06 | 302 files | 202 tests | 118 endpoints*
