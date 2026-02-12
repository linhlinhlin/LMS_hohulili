# Maritime LMS Backend

> **Spring Boot 3.2.6 + Java 21 + PostgreSQL 16** | Clean Architecture / DDD | 381 source files | 522 tests | 215 endpoints

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
| **Swagger UI** | **http://localhost:8088/swagger-ui** | - (215 endpoints documented) |
| OpenAPI Spec | http://localhost:8088/v3/api-docs | - |
| pgAdmin | http://localhost:8081 | `admin@devmail.net` / `S3cure!Passw0rd` |
| PostgreSQL | localhost:5432/lms | `lms` / `lms` |

**Test Accounts** (auto-created on first startup):

| Role | Email | Password | Full Name |
|------|-------|----------|-----------|
| ADMIN (System) | `admin@maritime.edu` | `admin123` | Admin User |
| ORG_ADMIN (Operations) | `orgadmin@maritime.edu` | `orgadmin123` | OrgAdmin User |
| TEACHER | `teacher@maritime.edu` | `teacher123` | Teacher User |
| STUDENT | `student@maritime.edu` | `student123` | Student User |

---

## Architecture

### Clean Architecture + DDD (Modular Monolith)

```
com.example.lms/
├── identity/              # Users, Authentication, Roles (JWT), Multi-tier Admin
├── course_authoring/      # Course, Chapter, Lesson, ContentBlock, Package, Category, Review, Admin ops
├── learning_delivery/     # LearningClass, Enrollment, Progress, Gamification, Analytics, Video, Certificate
├── assessment/            # Assignment, Quiz, Question, Submission, Rubric, QuestionBank
├── communication/         # Messages, Conversations
├── ai_assistant/          # AI Chat integration (streaming SSE)
├── shared/                # Value objects, domain events, exceptions, file service, payment, admin settings
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
- **34 tables**: identity (1), course_authoring (8+1 review), learning_delivery (8 incl. gamification/video/certificate), assessment (12+2 question_bank), communication (2), ai_assistant (2), shared (3+1 payment), security (2)
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
# Expected: Tests run: 522, Failures: 0, Errors: 0
```

**Coverage**: ~49% (target: 60%+)

---

## API Documentation

### Swagger UI (Interactive API Docs)

**Access**: http://localhost:8088/swagger-ui

**Features:**
- ✅ **215 endpoints** fully documented with request/response schemas
- ✅ **29 API tags** organized by domain module
- ✅ **Try it out** - Test endpoints directly from browser
- ✅ **JWT Authentication** - Built-in authorization testing
- ✅ **OpenAPI 3.0.1** - Standard specification format

### API Modules (29 controllers)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Authentication V3** | 8 | Login, register, JWT refresh, profile, forgot-password |
| **User Management V3** | 13 | User CRUD, role change, enable/disable (ADMIN/ORG_ADMIN) |
| **Course Authoring V3** | 14 | Create/update courses, chapters, lessons, content blocks |
| **Course Query V3** | 9 | Public course browsing, search, categories |
| **Admin - Courses** | 7 | Approve/reject courses, dashboard stats (ADMIN/ORG_ADMIN) |
| **Teacher - Courses** | 9 | Teacher course management, drafts, students |
| **Course Review V3** | 5 | Student course reviews/ratings |
| **Packages V3** | 9 | Question package organization |
| **Student Enrollment V3** | 13 | Enrollment, progress, certificates, lesson completion |
| **Classes V3** | 9 | Learning class management, students |
| **Teacher - Students** | 7 | Student management, assignments, analytics, status |
| **Gamification V3** | 6 | Achievements, streaks, leaderboard |
| **Learning Activity V3** | 6 | Learning events, progress tracking |
| **Video Progress V3** | 5 | Heartbeat, resume position, completion |
| **Teacher Analytics V3** | 1 | Teacher analytics dashboard |
| **Student Analytics V3** | 1 | Student analytics dashboard |
| **Teacher Revenue V3** | 5 | Revenue dashboard, payout history |
| **Teacher Invitation V3** | 3 | Course co-instructor invitations |
| **Assignment V3** | 6 | Assignment CRUD, publish, close |
| **Assignment Submission V3** | 9 | Student submissions + teacher grading |
| **Quiz V3** | 16 | Quiz CRUD, attempts, grading, timeout |
| **Question V3** | 6 | Question CRUD |
| **Question Bank V3** | 15 | Question bank, categories, import/export |
| **Rubric V3** | 7 | Rubric CRUD, library mode, assign-to-assignment |
| **Communication V3** | 6 | Messaging between users |
| **AI Assistant V3** | 11 | AI chatbot, sessions, knowledge management |
| **File Upload V3** | 3 | File upload/download (R2/local) |
| **Payment V3** | 4 | VNPay integration, payment callbacks |
| **Admin Settings V3** | 2 | System settings (ADMIN-only) |

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
| Java source files | 381 |
| Bounded contexts (modules) | 8 |
| Domain models | 38 |
| Use cases | 64 |
| REST controllers | 29 |
| REST endpoints | 215 |
| JPA entities | 39 |
| Repository ports | 33 |
| Flyway migrations | V1 (reference) + V26-V43 (18 incremental) |
| Test files | 50 |
| Test cases | 522 (0 failures) |
| Domain events | 11 |
| @PreAuthorize annotations | 163 |

### Module Breakdown

| Module | Domain Models | Use Cases | Controllers | Endpoints |
|--------|--------------|-----------|-------------|-----------|
| identity | 2 (User, Role) | 7 | 2 (Auth, User) | 21 |
| course_authoring | 6 (Course, Chapter, Lesson, ContentBlock, Category, CourseReview) | 23 | 6 (Authoring, Query, Package, AdminCourses, TeacherCourses, CourseReview) | 53 |
| learning_delivery | 9 (LearningClass, Enrollment, Certificate, VideoProgress, LearningStreak, Achievement, etc.) | 17 | 10 (Class, Enrollment, TeacherStudent, Gamification, Activity, Video, Analytics x2, Revenue, Invitation) | 51 |
| assessment | 11 (Assignment, Quiz, Question, Submission, Rubric, QuestionBank, etc.) | 14 | 6 (Assignment, Submission, Quiz, Question, QuestionBank, Rubric) | 59 |
| communication | 4 (Conversation, Message, etc.) | 1 | 1 | 6 |
| ai_assistant | 3 (ChatSession, KnowledgeDocument, etc.) | 1 | 1 | 11 |
| shared | 3 (ContentBlock, FileMetadata, PaymentTransaction) | 1 | 3 (FileUpload, Payment, AdminSettings) | 9 |
| config | - | - | - | - |
| **TOTAL** | **38** | **64** | **29** | **215** |

---

## API Reference (215 Endpoints)

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

#### CourseQueryControllerV3 (`/api/v3/courses`)
```
GET    /api/v3/courses                                             # List courses (paginated)
GET    /api/v3/courses/{id}                                        # Course detail
GET    /api/v3/courses/{id}/full                                   # Full course with chapters/lessons
GET    /api/v3/courses/search                                      # Search courses
GET    /api/v3/courses/categories                                  # List categories
GET    /api/v3/courses/{id}/reviews                                # Course reviews (public)
GET    /api/v3/courses/{id}/reviews/summary                         # Review summary (avg, count)
GET    /api/v3/courses/{id}/enrolled                                # Check enrollment status
GET    /api/v3/courses/{id}/instructor                              # Course instructor info
```

#### PackageControllerV3 (`/api/v3/packages`)
```
GET    /api/v3/packages                                            # List packages
POST   /api/v3/packages                                            # Create package
PUT    /api/v3/packages/{id}                                       # Update package
DELETE /api/v3/packages/{id}                                       # Delete package
```

#### AdminCoursesControllerV3 (`/api/v3/admin/courses`) — merged from course_management in S50
```
GET    /api/v3/admin/courses                                       # All courses (ADMIN/ORG_ADMIN)
GET    /api/v3/admin/courses/pending                                # Pending approval
POST   /api/v3/admin/courses/{id}/approve                          # Approve course
POST   /api/v3/admin/courses/{id}/reject                           # Reject course
POST   /api/v3/admin/courses/{id}/revoke                           # Revoke approval
GET    /api/v3/admin/stats                                         # Dashboard stats
GET    /api/v3/admin/courses/{id}                                  # Course detail (admin view)
```

#### TeacherCoursesControllerV3 (`/api/v3/teacher/courses`) — merged from course_management in S50
```
GET    /api/v3/teacher/courses                                     # My courses (TEACHER)
GET    /api/v3/teacher/courses/{id}                                 # Course detail
GET    /api/v3/teacher/courses/{id}/draft                           # Get draft
GET    /api/v3/teacher/courses/{id}/students                        # Course students
GET    /api/v3/teacher/courses/{id}/stats                           # Course statistics
GET    /api/v3/teacher/courses/stats/overview                       # Teacher overview stats
GET    /api/v3/teacher/courses/{id}/enrollments                     # Course enrollments
GET    /api/v3/teacher/courses/{id}/reviews                         # Course reviews
GET    /api/v3/teacher/dashboard/stats                              # Dashboard stats
```

#### CourseReviewControllerV3 (`/api/v3/reviews`)
```
POST   /api/v3/reviews                                             # Create review (STUDENT)
PUT    /api/v3/reviews/{id}                                        # Update review
DELETE /api/v3/reviews/{id}                                        # Delete review
GET    /api/v3/reviews/my                                          # My reviews
GET    /api/v3/reviews/course/{courseId}                             # Reviews by course
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
POST   /api/v3/enrollments/lessons/{lessonId}/complete               # Mark lesson complete
GET    /api/v3/enrollments/continue                                  # Continue learning (last position)
GET    /api/v3/enrollments/certificates                              # My certificates
POST   /api/v3/enrollments/certificates/issue                        # Issue certificate
GET    /api/v3/enrollments/certificates/{id}/verify                  # Verify certificate
GET    /api/v3/enrollments/course/{courseId}                          # Enrollment by course
GET    /api/v3/enrollments/courses/{courseId}/progress                # Progress by course
GET    /api/v3/enrollments/check/{courseId}                           # Check if enrolled
```

#### TeacherStudentControllerV3 (`/api/v3/teacher/students`)
```
GET    /api/v3/teacher/students                                     # My students (TEACHER)
GET    /api/v3/teacher/students/{id}                                # Student detail
GET    /api/v3/teacher/students/{id}/assignments                    # Student assignments (real DB)
GET    /api/v3/teacher/students/{id}/analytics                      # Student analytics (real DB)
PUT    /api/v3/teacher/students/{id}/status                         # Update student status
POST   /api/v3/teacher/students/{id}/message                        # Message student (stub)
GET    /api/v3/teacher/students/{id}/export                         # Export report (stub)
```

#### GamificationControllerV3 (`/api/v3/gamification`)
```
GET    /api/v3/gamification/achievements                            # All achievements
GET    /api/v3/gamification/my-achievements                         # My achievements
GET    /api/v3/gamification/streak                                  # Current streak
GET    /api/v3/gamification/leaderboard                             # Leaderboard
POST   /api/v3/gamification/check-in                                # Daily check-in
GET    /api/v3/gamification/stats                                   # Gamification stats
```

#### LearningActivityControllerV3 (`/api/v3/learning-activity`)
```
POST   /api/v3/learning-activity/events                             # Record learning event
GET    /api/v3/learning-activity/events                             # My learning events
GET    /api/v3/learning-activity/progress                           # Overall progress
GET    /api/v3/learning-activity/recent                             # Recent activity
GET    /api/v3/learning-activity/stats                              # Activity statistics
GET    /api/v3/learning-activity/daily                              # Daily activity
```

#### VideoProgressControllerV3 (`/api/v3/video-progress`)
```
POST   /api/v3/video-progress/heartbeat                             # Video heartbeat (position update)
GET    /api/v3/video-progress/{lessonId}                             # Get progress for lesson
GET    /api/v3/video-progress/course/{courseId}                      # All video progress for course
PUT    /api/v3/video-progress/{lessonId}/complete                    # Mark video complete
GET    /api/v3/video-progress/resume/{lessonId}                      # Get resume position
```

#### TeacherAnalyticsControllerV3 (`/api/v3/teacher/analytics`)
```
GET    /api/v3/teacher/analytics/dashboard                          # Teacher analytics dashboard
```

#### StudentAnalyticsControllerV3 (`/api/v3/student/analytics`)
```
GET    /api/v3/student/analytics/dashboard                          # Student analytics dashboard
```

#### TeacherRevenueControllerV3 (`/api/v3/teacher/revenue`)
```
GET    /api/v3/teacher/revenue/dashboard                            # Revenue dashboard
GET    /api/v3/teacher/revenue/transactions                         # Transaction history
GET    /api/v3/teacher/revenue/payout-history                       # Payout history
GET    /api/v3/teacher/revenue/stats                                # Revenue statistics
POST   /api/v3/teacher/revenue/request-payout                       # Request payout (stub)
```

#### TeacherInvitationControllerV3 (`/api/v3/teacher/invitations`)
```
GET    /api/v3/teacher/invitations                                  # My invitations
POST   /api/v3/teacher/invitations/{id}/accept                      # Accept invitation
POST   /api/v3/teacher/invitations/{id}/reject                      # Reject invitation
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
POST   /api/v3/questions/import                                     # Import from file (Excel/CSV)
```

#### QuestionBankControllerV3 (`/api/v3/question-banks`)
```
GET    /api/v3/question-banks                                       # List question banks
POST   /api/v3/question-banks                                       # Create question bank
GET    /api/v3/question-banks/{id}                                  # Bank detail
PUT    /api/v3/question-banks/{id}                                  # Update bank
DELETE /api/v3/question-banks/{id}                                  # Delete bank
GET    /api/v3/question-banks/{id}/questions                         # Questions in bank
POST   /api/v3/question-banks/{id}/questions                         # Add question to bank
DELETE /api/v3/question-banks/{id}/questions/{qId}                   # Remove from bank
GET    /api/v3/question-banks/categories                             # List categories
POST   /api/v3/question-banks/categories                             # Create category
PUT    /api/v3/question-banks/categories/{id}                        # Update category
DELETE /api/v3/question-banks/categories/{id}                        # Delete category
POST   /api/v3/question-banks/{id}/import                            # Import questions
GET    /api/v3/question-banks/{id}/export                            # Export questions
GET    /api/v3/question-banks/search                                 # Search across banks
```

#### AssignmentSubmissionControllerV3 (`/api/v3/submissions`)
```
POST   /api/v3/submissions                                          # Submit assignment work
GET    /api/v3/submissions/my                                        # My submissions
GET    /api/v3/submissions/{id}                                     # Submission detail
GET    /api/v3/submissions/assignment/{assignmentId}                 # Submissions for assignment
PUT    /api/v3/submissions/{id}/grade                                # Grade submission (TEACHER)
PUT    /api/v3/submissions/{id}/feedback                             # Add feedback (TEACHER)
GET    /api/v3/submissions/student/{studentId}                       # Student submissions (TEACHER)
POST   /api/v3/submissions/{id}/resubmit                             # Resubmit (STUDENT)
GET    /api/v3/submissions/stats/{assignmentId}                      # Submission statistics
```

#### RubricControllerV3 (`/api/v3/rubrics`)
```
GET    /api/v3/rubrics                                               # My rubrics (TEACHER)
POST   /api/v3/rubrics                                               # Create rubric
GET    /api/v3/rubrics/{id}                                         # Rubric detail
PUT    /api/v3/rubrics/{id}                                         # Update rubric
DELETE /api/v3/rubrics/{id}                                         # Delete rubric
POST   /api/v3/rubrics/{id}/assign/{assignmentId}                    # Assign to assignment
GET    /api/v3/rubrics/assignment/{assignmentId}                     # Get by assignment
```

### Communication Module

#### CommunicationControllerV3 (`/api/v3/communication`)
```
GET    /api/v3/communication/conversations                          # My conversations
POST   /api/v3/communication/conversations                          # Start conversation
GET    /api/v3/communication/conversations/{id}/messages             # Get messages
POST   /api/v3/communication/conversations/{id}/messages             # Send message
GET    /api/v3/communication/unread-count                            # Unread message count
PUT    /api/v3/communication/conversations/{id}/read                 # Mark as read
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
POST   /api/v3/files/upload-multiple                                 # Upload multiple files
```

#### PaymentControllerV3 (`/api/v3/payments`)
```
POST   /api/v3/payments/create                                      # Create payment (VNPay)
GET    /api/v3/payments/callback/vnpay                               # VNPay callback
GET    /api/v3/payments/my                                           # My payments
GET    /api/v3/payments/{id}                                        # Payment detail
```

#### AdminSettingsControllerV3 (`/api/v3/admin/settings`) — ADMIN-only
```
GET    /api/v3/admin/settings                                       # Get system settings
PUT    /api/v3/admin/settings                                       # Update system settings
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
         ├── status: DRAFT → PENDING → APPROVED/REJECTED
         ├── pricing: FREE/PAID + price/salePrice
         └── visibility: PUBLIC/PRIVATE/UNLISTED
```

**Status Lifecycle**:
```
DRAFT ──submit()──> PENDING ──approve()──> APPROVED
                        │
                        └──reject(reason)──> REJECTED ──resubmit()──> PENDING
```

**Note**: APPROVED courses are immediately visible. No separate PUBLISHED/ARCHIVED states.

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

### Authorization (Multi-Tier Admin — S43)
- **163 @PreAuthorize annotations** across controllers
- Roles: `ADMIN` (system), `ORG_ADMIN` (operations), `TEACHER`, `STUDENT`
- **Escalation prevention**: ORG_ADMIN cannot create/modify ADMIN/ORG_ADMIN users
- **ADMIN-only (3 endpoints)**: DELETE user, DELETE course, admin settings
- Method-level security with SpEL expressions
- `@AuthenticationPrincipal UserJpaEntity` pattern (not SecurityContextHolder)

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
/api/v3/admin/**        → ADMIN, ORG_ADMIN (except settings: ADMIN only)
/api/v3/teacher/**      → TEACHER, ADMIN, ORG_ADMIN
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
| V34 | Question bank categories + question types |
| V35 | Learning delivery tables (video progress, achievements, streaks, events) |
| V36 | Certificates, notifications, gamification |
| V37 | Course review tables |
| V38 | Payment transactions |
| V39 | Admin settings |
| V40 | Multi-tier admin (ORG_ADMIN role + user metadata) |
| V41 | Rubric library mode (teacher_id + nullable assignment_id) |
| V42 | Teacher revenue + payout tables |
| V43 | Teacher invitations |
| V44 | Seed TEACHER + STUDENT test accounts |

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
- **522 tests** across 50 test files
- All passing (BUILD SUCCESS, 0 failures, 0 errors)
- Estimated line coverage: ~49%

### Test Structure (50 files, 522 tests)
```
src/test/java/com/example/lms/
├── course_authoring/
│   ├── domain/model/CourseTest.java                    # 18 tests - lifecycle, pricing, chapters
│   └── application/usecase/
│       ├── CreateCourseUseCaseTest.java                 # 6 tests
│       ├── ApproveCourseUseCaseTest.java                # 5 tests
│       ├── CreateChapterUseCaseV3Test.java              # 3 tests (incl. ownership)
│       ├── CreateLessonUseCaseV3Test.java               # 2 tests
│       └── ManageContentBlockUseCaseV3Test.java         # 7 tests
├── assessment/
│   ├── domain/model/
│   │   ├── AssignmentTest.java                         # 12 tests
│   │   ├── QuizTest.java                               # 10 tests
│   │   ├── QuestionTest.java                            # 3 tests
│   │   ├── QuestionBankTest.java                        # tests
│   │   └── QuestionBankCategoryTest.java                # tests
│   └── application/usecase/
│       ├── CreateAssignmentUseCaseV3Test.java           # 3 tests
│       ├── UpdateAssignmentUseCaseV3Test.java           # 5 tests
│       ├── UpdateQuestionUseCaseV3Test.java             # 4 tests
│       ├── CreateQuestionUseCaseV3Test.java              # tests
│       ├── QuestionBankManagementUseCaseTest.java        # tests
│       ├── QuestionImportExportUseCaseTest.java          # tests
│       ├── QuizAttemptUseCaseTest.java                   # tests (incl. timeout)
│       └── RubricCrudUseCaseTest.java                    # 8 tests
├── identity/
│   ├── domain/model/UserTest.java                       # 5 tests (incl. ORG_ADMIN)
│   └── application/usecase/
│       ├── AuthenticateUserUseCaseV2Test.java           # 7 tests
│       ├── RegisterUserUseCaseV2Test.java               # 10 tests
│       └── UpdateUserUseCaseV3Test.java                  # 4 tests
├── learning_delivery/
│   ├── domain/model/
│   │   ├── EnrollmentTest.java                          # 10 tests
│   │   ├── LearningClassTest.java                       # 10 tests
│   │   ├── VideoProgressTest.java                        # tests (90% threshold)
│   │   └── CertificateTest.java                          # tests
│   └── application/usecase/
│       ├── CreateLearningClassUseCaseV3Test.java         # 6 tests
│       ├── EnrollStudentUseCaseV3Test.java               # 6 tests
│       ├── TrackVideoProgressUseCaseTest.java            # tests
│       ├── CertificateUseCaseTest.java                   # 3 tests
│       ├── GamificationUseCaseTest.java                  # tests
│       ├── LearningActivityUseCaseTest.java              # tests
│       └── StudentAnalyticsUseCaseTest.java              # tests
├── shared/domain/valueobject/
│   └── EmailTest.java                                    # 7 tests
└── ArchitectureTest.java                                 # Architecture rules
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
2. Version must be next sequential number after V44

### Step 5: Testing
1. Domain model tests (pure logic, no mocks)
2. Use case tests (@Mock repos, @InjectMocks use case)
3. Run `mvn test -B` to verify all 522+ tests pass

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

*Last updated: 2026-02-12 | 381 files | 522 tests | 215 endpoints | 8 modules | 29 controllers*
