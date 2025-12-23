# Progress - LMS

## Backend Layer - Deep Analysis

### Tech Stack
- **Language**: Java 21
- **Framework**: Spring Boot 3.5.6
- **Database**: PostgreSQL + JPA/Hibernate
- **Security**: JWT (jjwt 0.12.3) + Spring Security
- **Migrations**: Flyway (disabled for Supabase)
- **Documentation**: SpringDoc OpenAPI 2.6.0
- **Utilities**: Lombok 1.18.40, Apache POI 5.2.4

---

## Controllers (34 total)

### Major Controllers (by size/complexity)
| Controller | Lines | Key Features |
|------------|-------|--------------|
| **CourseController** | 1016 | CRUD, enrollment, bulk enroll via Excel, approval workflow |
| **AssignmentController** | 852 | Assignments, submissions, grading, allocations |
| **QuizController** | 547 | Quiz lifecycle, attempts, results |
| **LessonController** | ~600 | Lessons, sections, content management |
| **AdminController** | ~500 | User management, course approval |
| **MessageController** | ~300 | Messaging system |

### API Patterns
- RESTful design: `/api/v1/{resource}`
- `@PreAuthorize` for role-based access (ADMIN, TEACHER, STUDENT)
- `ApiResponse<T>` wrapper for consistent responses
- Pagination via Spring Pageable
- Swagger annotations for documentation

### Key Endpoints
```
POST   /api/v1/courses                  # Create course (TEACHER)
GET    /api/v1/courses/{id}/content     # Get course curriculum
POST   /api/v1/courses/{id}/enroll      # Student enrollment
POST   /api/v1/courses/{id}/bulk-enroll # Excel bulk enrollment

POST   /api/v1/lessons/{id}/quiz        # Create quiz
POST   /api/v1/quiz/{id}/start          # Start quiz attempt
POST   /api/v1/quiz/attempt/{id}/submit # Submit answers

POST   /api/v1/assignments              # Create assignment
POST   /api/v1/assignments/{id}/submit  # Submit assignment
POST   /api/v1/submissions/{id}/grade   # Grade submission
```

---

## Services (29 total)

### Core Services (by complexity)
| Service | Lines | Responsibility |
|---------|-------|----------------|
| **QuizService** | 1086 | Quiz creation, attempts, scoring, statistics |
| **CourseService** | ~500 | Course management, enrollments |
| **AssignmentService** | ~400 | Assignment lifecycle, submissions |
| **LessonProgressDomainService** | ~300 | Progress tracking |
| **TeacherDomainService** | ~200 | Teacher-specific logic |

### Service Patterns
- Constructor injection via `@RequiredArgsConstructor`
- Transaction management with `@Transactional`
- Domain services for complex business logic
- Separate application services for orchestration

---

## Entities (31 total)

### Core Domain Model
```
User (230 lines)
├── Roles: ADMIN, TEACHER, STUDENT
├── Implements UserDetails (Spring Security)
└── ManyToMany → enrolledCourses

Course (284 lines)
├── Status: DRAFT, PENDING, APPROVED, REJECTED
├── Visibility: PUBLIC, PRIVATE
├── PriceType: FREE, PAID
├── ManyToOne → teacher (User)
├── ManyToMany → enrolledStudents
├── OneToMany → chapters, assignments
└── 30+ fields: tags, benefits, pricing, etc.

Chapter → Lesson → Section
├── Section types: LECTURE, VIDEO, FILE, QUIZ
└── Section → Quiz (if type=QUIZ)

Quiz → Question → QuestionOption
└── QuizAttempt → QuizAttemptItem

Assignment → AssignmentSubmission
└── AssignmentAllocation (for specific students)
```

### Relationships
- Course ↔ User (teacher, enrolledStudents)
- Course → Chapter → Lesson → Section
- Section → Quiz (embedded quizzes)
- User → QuizAttempt, AssignmentSubmission

---

## Configuration

| Config | Purpose |
|--------|---------|
| SecurityConfig | JWT filter, CORS, endpoint security |
| JwtAuthenticationFilter | Token validation |
| WebConfig | CORS configuration |
| OpenApiConfig | Swagger/OpenAPI setup |
| DataFixInitializer | Data migration fixes |

### Security Rules
- Public: Auth endpoints, public course list
- STUDENT: Enroll, submit, view own progress
- TEACHER: Manage own courses, grade submissions
- ADMIN: Full access, course approval

---

## Identified Patterns

### Good Practices ✓
- Builder pattern for DTOs
- Response wrapper (ApiResponse)
- Role-based authorization
- Pagination support
- Input validation (`@Valid`)

### Areas for Improvement
- Large controllers (consider splitting)
- DTOs inside controllers (should be in dto package)
- Some N+1 query risks (lazy loading)

---

**Last Audit**: 2025-12-23
**Audit Depth**: Deep (code-level analysis)
