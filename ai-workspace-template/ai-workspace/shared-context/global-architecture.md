# GLOBAL ARCHITECTURE - LMS

Learning Management System Architecture

---

## PROJECT INFO

| Property | Value |
|----------|-------|
| **Project** | LMS (Learning Management System) |
| **Type** | Full-stack Web Application |
| **Tech Stack** | Java 21 + Spring Boot 3.5.6 + Angular 20 + PostgreSQL |
| **Path** | `E:\LMS\lms_1\dev` |

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                      Angular 20 + SSR                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    FEATURE MODULES                        │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │  │
│  │  │  Auth  │ │Teacher │ │Student │ │ Admin  │ │Courses │ │  │
│  │  │        │ │(12 sub)│ │(9 sub) │ │        │ │        │ │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                    SHARED LAYER                           │  │
│  │  components (17) / directives / services / models         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                     API LAYER                             │  │
│  │  quiz.api (V2-DDD) / course / question / package         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                         HTTP/REST
                              │
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
│                    Spring Boot 3.5.6                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   CONTROLLER LAYER (34)                   │  │
│  │  CourseController (1016) | QuizController | AdminController│  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                    SERVICE LAYER (29)                     │  │
│  │  QuizService (1086) | CourseService | AssignmentService   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                   REPOSITORY LAYER (26)                   │  │
│  │  CourseRepository | QuizRepository | UserRepository       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                    ENTITY LAYER (31)                      │  │
│  │  User | Course | Quiz | Assignment | Chapter | Lesson     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │  JWT Security  │  │   Flyway     │  │  Swagger/OpenAPI│     │
│  └────────────────┘  └──────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                         JPA/Hibernate
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                 │
│                        PostgreSQL                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  users   │ │ courses  │ │ quizzes  │ │assignments│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ chapters │ │ lessons  │ │ sections │ │ attempts │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                   30 Flyway Migrations                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## DOMAIN MODEL

### Core Aggregates

```
USER AGGREGATE
└── User (root)
    ├── Roles: ADMIN, TEACHER, STUDENT
    └── Relationships: courses, enrollments

COURSE AGGREGATE
└── Course (root)
    ├── Status: DRAFT → PENDING → APPROVED/REJECTED
    ├── Chapter (1:N)
    │   └── Lesson (1:N)
    │       └── Section (1:N) → Quiz/Video/File
    └── Assignment (1:N)

QUIZ AGGREGATE
└── Quiz (root)
    ├── Types: LESSON_QUIZ, ASSIGNMENT
    ├── Question (M:N via question_ids)
    └── QuizAttempt (1:N per student)

ENROLLMENT AGGREGATE
└── LearningClass (root)
    └── ClassEnrollment (student + class)
```

---

## FILE STRUCTURE

```
E:\LMS\lms_1\dev/
├── api/                           # BACKEND
│   └── src/main/java/.../lms/
│       ├── controller/            # 34 REST controllers
│       ├── service/               # 29 services
│       ├── entity/                # 31 JPA entities
│       ├── repository/            # 26 repositories
│       ├── dto/                   # Request/Response DTOs
│       ├── config/                # Security, CORS, OpenAPI
│       └── exception/             # Error handlers
│
├── fe/                            # FRONTEND
│   └── src/app/
│       ├── features/              # 17 feature modules
│       │   ├── teacher/ (12)
│       │   ├── student/ (9)
│       │   └── admin, auth, courses...
│       ├── api/                   # HTTP layer (12 endpoints)
│       ├── core/                  # Guards, interceptors
│       ├── shared/                # 17 component folders
│       └── state/                 # Signal-based state
│
└── ai-workspace-template/         # AI AGENT SYSTEM
    ├── ai-workspace/              # Agent prompts/context
    └── luongngoai/                # Human interface
```

---

## KEY DECISIONS

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend Framework | Spring Boot 3.5.6 | Enterprise-ready, great ecosystem |
| Frontend Framework | Angular 20 | Modern signals, great tooling |
| Database | PostgreSQL | JSONB support, reliability |
| Auth | JWT stateless | Scalability, simplicity |
| Styling | Tailwind v4 | Utility-first, rapid development |
| Quiz Storage | JSONB question_ids | Flexible ordering, deduplication |

---

**Last Updated**: 2025-12-23
**Audit Level**: Deep (code-level analysis)
