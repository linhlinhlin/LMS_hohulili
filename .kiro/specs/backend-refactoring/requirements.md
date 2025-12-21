# Backend LMS Refactoring Specification

## 📋 Executive Summary

Dự án LMS hàng hải hiện tại đang sử dụng **Mixed Architecture** với 2 kiến trúc song song:
1. **Legacy Layered Architecture** (controller → service → repository → entity)
2. **DDD Modules** (course_management, learning_delivery) - chưa hoàn thiện

Cần refactor để thống nhất kiến trúc, loại bỏ code duplication, và tuân theo best practices.

---

## 🔍 Current State Analysis

### Tech Stack
- **Framework**: Spring Boot 3.5.6
- **Java**: 21
- **Database**: PostgreSQL (Supabase)
- **Security**: Spring Security + JWT
- **Documentation**: SpringDoc OpenAPI 2.6.0
- **ORM**: Spring Data JPA + Hibernate

### Current Structure
```
com.example.lms/
├── config/           # 7 files - Security, JWT, AI, OpenAPI configs
├── controller/       # 34 files - REST Controllers (FAT CONTROLLERS!)
├── service/          # 28 files - Business logic (ANEMIC SERVICES)
├── repository/       # 26 files - JPA Repositories
├── entity/           # 31 files - JPA Entities (ANEMIC DOMAIN MODEL)
├── dto/              # 20+ files - DTOs
├── exception/        # Exception handlers
├── util/             # Utilities
├── usecase/          # 4 files - Started DDD (incomplete)
├── course_management/  # DDD Module (incomplete)
│   ├── application/usecase/
│   ├── domain/model/
│   ├── domain/repo_port/
│   └── infrastructure/
└── learning_delivery/  # DDD Module (incomplete)
    ├── application/usecase/
    ├── domain/model/
    ├── domain/repo_port/
    └── infrastructure/
```

### Critical Issues Identified

#### 1. **Duplicate Entities** 🔴 HIGH
- `Course` entity exists in 2 places:
  - `entity/Course.java` → maps to `courses` table
  - `course_management/domain/model/Course.java` → maps to `course_authoring` table
- This causes confusion and potential data inconsistency

#### 2. **Fat Controllers** 🔴 HIGH
- `CourseController.java`: **1012 lines** with 20+ endpoints
- Contains DTOs, business logic, and conversion methods inside controller
- Violates Single Responsibility Principle

#### 3. **Anemic Domain Model** 🟡 MEDIUM
- Entities are pure data holders (getters/setters only)
- No domain behavior in entities
- All business logic in services

#### 4. **Mixed Architecture** 🔴 HIGH
- Legacy code uses traditional layered architecture
- New modules use DDD structure
- No clear migration path or boundary

#### 5. **No Clear Bounded Contexts** 🟡 MEDIUM
- Services directly access repositories from other domains
- No anti-corruption layer between modules
- Tight coupling between components

#### 6. **DTOs Inside Controllers** 🟡 MEDIUM
- Inner classes for DTOs in controllers (e.g., `CreateCourseRequest`, `CourseSummary`)
- Should be in separate DTO package

---

## 🎯 Recommended Architecture: Modular Monolith with DDD

### Why Modular Monolith?
1. **Gradual Migration**: Can migrate module by module without big bang rewrite
2. **Clear Boundaries**: Each module has its own bounded context
3. **Scalability Path**: Easy to extract to microservices later if needed
4. **Team Alignment**: Different teams can own different modules
5. **Best for LMS Domain**: Educational domain has clear bounded contexts

### Target Architecture
```
com.example.lms/
├── shared/                          # Shared Kernel
│   ├── domain/                      # Shared value objects, base entities
│   ├── infrastructure/              # Common infrastructure (security, config)
│   └── application/                 # Shared DTOs, exceptions
│
├── identity/                        # Identity & Access Management
│   ├── domain/
│   │   ├── model/                   # User, Role, Permission
│   │   └── service/                 # Domain services
│   ├── application/
│   │   ├── usecase/                 # RegisterUser, AuthenticateUser
│   │   └── dto/                     # Request/Response DTOs
│   └── infrastructure/
│       ├── persistence/             # JPA repositories
│       └── web/                     # REST controllers
│
├── course_authoring/                # Course Creation & Management
│   ├── domain/
│   │   ├── model/                   # Course, Chapter, Lesson, Section
│   │   ├── service/                 # CourseValidationService
│   │   └── event/                   # CoursePublished, CourseUpdated
│   ├── application/
│   │   ├── usecase/                 # CreateCourse, PublishCourse
│   │   └── dto/
│   └── infrastructure/
│       ├── persistence/
│       └── web/
│
├── learning_delivery/               # Student Learning Experience
│   ├── domain/
│   │   ├── model/                   # LearningClass, Enrollment, Progress
│   │   ├── service/                 # ProgressCalculationService
│   │   └── event/                   # StudentEnrolled, LessonCompleted
│   ├── application/
│   │   ├── usecase/                 # EnrollStudent, TrackProgress
│   │   └── dto/
│   └── infrastructure/
│       ├── persistence/
│       └── web/
│
├── assessment/                      # Quizzes & Assignments
│   ├── domain/
│   │   ├── model/                   # Quiz, Question, Assignment, Submission
│   │   └── service/                 # GradingService
│   ├── application/
│   │   └── usecase/                 # SubmitQuiz, GradeAssignment
│   └── infrastructure/
│
├── communication/                   # Messaging & Notifications
│   ├── domain/
│   │   └── model/                   # Message, Conversation, Notification
│   ├── application/
│   └── infrastructure/
│
└── ai_assistant/                    # AI Chatbot Integration
    ├── domain/
    │   └── model/                   # ChatSession, ChatMessage
    ├── application/
    │   └── usecase/                 # ProcessChatMessage
    └── infrastructure/
        └── external/                # AI API clients
```

---

## 📝 User Stories

### US-001: Unified Course Entity
**As a** developer  
**I want** a single source of truth for Course entity  
**So that** there's no confusion about which entity to use

**Acceptance Criteria:**
- [ ] Single Course entity in `course_authoring` module
- [ ] Legacy `entity/Course.java` removed or deprecated
- [ ] All services use the new Course entity
- [ ] Database migration to consolidate tables if needed

### US-002: Thin Controllers
**As a** developer  
**I want** controllers to only handle HTTP concerns  
**So that** business logic is properly encapsulated in use cases

**Acceptance Criteria:**
- [ ] Controllers max 200 lines
- [ ] No business logic in controllers
- [ ] DTOs moved to application/dto package
- [ ] Controllers delegate to use cases

### US-003: Rich Domain Model
**As a** developer  
**I want** entities to contain domain behavior  
**So that** business rules are enforced at the domain level

**Acceptance Criteria:**
- [ ] Entities have validation methods
- [ ] State transitions are methods on entities
- [ ] Invariants are enforced in entity constructors
- [ ] Value objects for complex types (e.g., Email, CourseCode)

### US-004: Module Boundaries
**As a** developer  
**I want** clear boundaries between modules  
**So that** modules can evolve independently

**Acceptance Criteria:**
- [ ] Each module has its own package
- [ ] Modules communicate via application services or events
- [ ] No direct repository access across modules
- [ ] Shared kernel for common types

### US-005: Proper Exception Handling
**As a** developer  
**I want** consistent exception handling across modules  
**So that** API responses are predictable

**Acceptance Criteria:**
- [ ] Domain exceptions in each module
- [ ] Global exception handler
- [ ] Consistent error response format
- [ ] Proper HTTP status codes

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Create shared kernel package
2. Define base entity classes
3. Create common value objects
4. Setup module package structure
5. Create global exception handling

### Phase 2: Identity Module (Week 2-3)
1. Migrate User entity to identity module
2. Create authentication use cases
3. Refactor AuthController
4. Add proper DTOs

### Phase 3: Course Authoring Module (Week 3-5)
1. Consolidate Course entities
2. Create course use cases
3. Refactor CourseController (split into multiple controllers)
4. Add domain events

### Phase 4: Learning Delivery Module (Week 5-7)
1. Complete LearningClass and Enrollment
2. Create enrollment use cases
3. Add progress tracking
4. Integrate with Course Authoring via events

### Phase 5: Assessment Module (Week 7-9)
1. Migrate Quiz and Assignment entities
2. Create grading use cases
3. Refactor quiz controllers

### Phase 6: Communication & AI (Week 9-10)
1. Migrate messaging entities
2. Refactor AI chat integration
3. Add notification system

---

## 📊 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Max Controller Lines | 1012 | 200 |
| Duplicate Entities | 2 | 0 |
| Test Coverage | ~0% | 60% |
| Cyclomatic Complexity | High | Medium |
| Module Coupling | Tight | Loose |

---

## 🔗 References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Spring Modulith](https://spring.io/projects/spring-modulith)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
