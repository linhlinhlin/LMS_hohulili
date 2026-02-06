# Maritime LMS - Learning Management System

<div align="center">

![Maritime LMS Banner](assets/banner.jpeg)

[![Angular](https://img.shields.io/badge/Angular-20.3-dd0031?style=flat-square&logo=angular&logoColor=white)](https://angular.io)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.6-6db33f?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-21-ed8b00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)

[![AI Powered](https://img.shields.io/badge/AI%20Powered-Gemini%202.5-4285f4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![LangChain](https://img.shields.io/badge/LangChain-RAG-1c3c3c?style=flat-square&logo=chainlink&logoColor=white)](https://langchain.com)
[![Neo4j](https://img.shields.io/badge/Neo4j-Knowledge%20Graph-008cc1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com)

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=flat-square)](/)]

**AI-Powered Learning Management System for Maritime Education**

*Comprehensive e-learning platform with intelligent tutoring, course management, and maritime knowledge base*

[Features](#key-features) | [Project Status](#project-status) | [Quick Start](#getting-started) | [Architecture](#architecture)

</div>

---

## 📊 Project Status (Updated: February 6, 2026)

### Implementation Progress

| Module | Status | Completion | Notes |
|--------|--------|------------|-------|
| **Authentication** | ✅ Done | 100% | JWT, Role-based guards |
| **Student Portal** | ✅ Done | 95% | Dashboard, courses, assignments, quiz |
| **Teacher Portal** | ✅ Done | 90% | Course management, grading, quiz builder |
| **Admin Portal** | 🟡 In Progress | 80% | Users, analytics, AI knowledge mgmt |
| **AI Chatbot** | ✅ Done | 95% | Server-side sync, Notion AI-style UI |
| **Assignment System** | ✅ Done | 90% | Rubric grading, file submissions |
| **Quiz System** | ✅ Done | 85% | Multiple question types, auto-grading |
| **Messaging** | 🟡 In Progress | 70% | Student-teacher communication |

---

## 🗂️ Detailed Feature Implementation

### Frontend (Angular 20.3)

#### Student Module (`/student`)
| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Dashboard | `/student/dashboard` | ✅ | Learning progress, enrolled courses, heatmap |
| My Courses | `/student/my-courses` | ✅ | Course cards with progress tracking |
| Course Detail | `/student/course/:id` | ✅ | Modules, lessons, enrollment |
| Assignments | `/student/assignments` | ✅ | Assignment list, submission |
| Assignment Work | `/student/assignments/:id/work` | ✅ | File upload, rubric view |
| Quiz List | `/student/quiz` | ✅ | Available quizzes |
| Quiz Taking | `/student/quiz/take/:id` | ✅ | Interactive quiz interface |
| Learning | `/student/learn/*` | ✅ | Video/PDF viewer, progress |
| Messages | `/student/messages` | ✅ | Teacher messaging |
| AI Chat | `/student/ai-chat` | ✅ | Maritime AI assistant |
| Analytics | `/student/analytics` | ✅ | Learning statistics |
| Profile | `/student/profile` | ✅ | Personal information |

#### Teacher Module (`/teacher`)
| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Dashboard | `/teacher/dashboard` | ✅ | Overview, course stats |
| Course Management | `/teacher/courses` | ✅ | CRUD operations |
| Course Creation | `/teacher/course-creation` | ✅ | New course wizard |
| Course Editor | `/teacher/courses/:id/edit` | ✅ | Sections, lessons |
| Section Editor | `/teacher/courses/:id/sections/:id` | ✅ | Lesson management |
| Assignment Hub | `/teacher/assignments/*` | ✅ | Unified assignment management |
| Grading | `/teacher/assignments/:id/grade` | ✅ | Speed grader, rubrics |
| Quiz Management | `/teacher/quiz/*` | ✅ | Create, edit, analytics |
| Student Management | `/teacher/students` | ✅ | Enrollment, progress |
| Analytics | `/teacher/analytics` | ✅ | Teaching statistics |
| AI Chat | `/teacher/ai-chat` | ✅ | Maritime AI assistant |

#### Admin Module (`/admin`)
| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Dashboard | `/admin/dashboard` | ✅ | System overview |
| User Management | `/admin/users` | ✅ | User CRUD, roles |
| Course Management | `/admin/courses` | ✅ | All courses overview |
| Course Review | `/admin/courses/review` | 🟡 | Approval workflow |
| Analytics | `/admin/analytics` | ✅ | System metrics |
| Settings | `/admin/settings` | 🟡 | System configuration |
| AI Knowledge | `/admin/ai-knowledge` | ✅ | PDF upload, documents |
| AI Chat | `/admin/ai-chat` | ✅ | Maritime AI assistant |
| Logs | `/admin/logs` | 🔴 | Placeholder only |

#### AI Chat Module
| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Full Page | `ai-chat-full-page.component.ts` | ✅ | Main container |
| Main Area | `chat-main-area.component.ts` | ✅ | Welcome screen, messages |
| Sidebar | `chat-sidebar.component.ts` | ✅ | Session history |
| Message | `chat-message.component.ts` | ✅ | Message bubble, sources |
| Input | `chat-message-input.component.ts` | ✅ | Auto-resize textarea |
| Service | `chat.service.ts` | ✅ | Server-side history sync |

### Backend (Spring Boot 3.2.6 + PostgreSQL 16)

**Architecture**: Clean Architecture / DDD (Domain-Driven Design)
**Stats**: 302 Java files | 114 REST endpoints | 202 tests | 9 modules | 34 database tables

**API Documentation**: [Swagger UI](http://localhost:8088/swagger-ui) - Interactive API docs với 114 endpoints, 17 modules

#### API Controllers (30 total)
| Controller | Endpoints | Status | Description |
|------------|-----------|--------|-------------|
| `AuthController` | 4 | ✅ | Login, register, refresh, profile |
| `CourseController` | 15+ | ✅ | Course CRUD, enrollment |
| `LessonController` | 10+ | ✅ | Lesson management |
| `SectionController` | 8+ | ✅ | Section management |
| `AssignmentController` | 12+ | ✅ | Assignment CRUD, submissions |
| `QuizController` | 15+ | ✅ | Quiz management, attempts |
| `AIChatController` | 5 | ✅ | Chat, sessions, health |
| `AIAdminController` | 6 | ✅ | Knowledge upload, stats |
| `UserController` | 8+ | ✅ | User management |
| `MessageController` | 10+ | ✅ | Internal messaging |
| `FileUploadController` | 5 | ✅ | File upload/serve |
| `StudentProgressController` | 6 | ✅ | Progress tracking |

---

## 🏗️ Architecture

```
                              MARITIME LMS ARCHITECTURE
                              
+------------------+         +------------------+         +------------------+
|                  |         |                  |         |                  |
|    FRONTEND      |  HTTP   |   LMS BACKEND    |  HTTP   |   AI BACKEND     |
|    (Angular)     |-------->|  (Spring Boot)   |-------->|   (FastAPI)      |
|    Port: 4200    |         |    Port: 8088    |         |   Port: 8000     |
|                  |         |                  |         |                  |
+--------+---------+         +--------+---------+         +--------+---------+
         |                            |                            |
         v                            v                            v
+------------------+         +------------------+         +------------------+
|   Session State  |         |   PostgreSQL     |         |   Neo4j          |
|   (Server-side)  |         |   (Supabase)     |         |   + pgvector     |
+------------------+         +------------------+         +------------------+
```

---

## 📁 Project Structure

```
LMS_hohulili/
├── backend/                          # Backend (Spring Boot 3.2.6 + Java 21)
│   ├── src/main/java/com/example/lms/
│   │   ├── identity/                 # Auth, JWT (13 endpoints)
│   │   ├── course_authoring/         # Course CRUD (20 endpoints)
│   │   ├── course_management/        # Admin approval (16 endpoints)
│   │   ├── learning_delivery/        # Enrollments, classes (17 endpoints)
│   │   ├── assessment/               # Assignments, quizzes (26 endpoints)
│   │   ├── communication/            # Messaging (6 endpoints)
│   │   ├── ai_assistant/             # AI chatbot (10 endpoints)
│   │   ├── shared/                   # Value objects, events
│   │   └── config/                   # Security, CORS, JWT
│   └── src/main/resources/db/
│       ├── migration/                # Flyway V26-V30
│       └── V1__lms_complete_schema.sql  # 1,241-line reference schema
│
├── fe/                               # Frontend (Angular 20.3 + Signals)
│   └── src/app/
│       ├── features/
│       │   ├── student/              # 12 components
│       │   ├── teacher/              # 74 components
│       │   ├── admin/                # 22 components
│       │   ├── ai-chat/              # 15 components (streaming SSE)
│       │   ├── assignments/          # 12 components (DDD)
│       │   ├── learning/             # 20+ components (quiz, video)
│       │   └── courses/              # 10+ components
│       ├── core/services/            # Auth, guards (14 services)
│       ├── api/client/               # 17 API clients
│       └── shared/components/        # 52 reusable components
│
├── ONBOARDING.md                     # 🆕 Team onboarding guide (15-min setup)
├── CLAUDE.md                         # AI agent guide
└── README.md                         # This file
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Java JDK | 21+ | [Download](https://adoptium.net) |
| Node.js | 22.x | [Download](https://nodejs.org) |
| Docker | Latest | [Download](https://docker.com) |
| Maven | 3.6+ | [Download](https://maven.apache.org) |

### Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd LMS_hohulili

# 2. Start Backend (Docker - Recommended)
cd backend
docker compose up -d          # Start PostgreSQL + API

# Wait ~60s for Spring Boot startup, then verify:
curl http://localhost:8088/actuator/health
# Expected: {"status":"UP"}

# 3. Start Frontend (new terminal)
cd fe
npm install
npm start

# 4. Access Application
# Frontend: http://localhost:4200
# Backend API: http://localhost:8088/api/v3
# Swagger UI: http://localhost:8088/swagger-ui
# Health Check: http://localhost:8088/actuator/health
```

**⚡ New Team Member?** Read [`ONBOARDING.md`](ONBOARDING.md) for detailed 15-minute setup guide.

### Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@maritime.edu | admin123 |
| Teacher | teacher@maritime.edu | teacher123 |
| Student | student@maritime.edu | student123 |

---

## 📡 API Endpoints Summary

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | User registration |
| `/api/v1/auth/login` | POST | User login (JWT) |
| `/api/v1/auth/refresh` | POST | Refresh token |
| `/api/v1/auth/profile` | GET | Get user profile |

### AI Chat
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ai/chat` | POST | Send message to AI |
| `/api/v1/ai/sessions` | GET | List chat sessions |
| `/api/v1/ai/history/{userId}` | GET | Load chat history (server-side) |
| `/api/v1/ai/history/{userId}` | DELETE | Clear chat history |
| `/api/v1/ai/health` | GET | AI service health |

### AI Admin (Admin Only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ai/admin/knowledge/upload` | POST | Upload PDF document |
| `/api/v1/ai/admin/knowledge/stats` | GET | Knowledge base stats |
| `/api/v1/ai/admin/knowledge/documents` | GET | List all documents |

---

## 🔄 Recent Changes (February 2026)

| Date | Change | Details |
|------|--------|---------|
| **Feb 6** | **V1 Comprehensive Schema** | `V1__lms_complete_schema.sql` - 1,241 lines, 34 tables, 94 indexes (BRIN, GIN, partial) |
| **Feb 6** | **Health Check Fix** | Fixed Docker HEALTHCHECK 403 - `/actuator/health` now whitelisted |
| **Feb 6** | **Documentation Update** | Created `ONBOARDING.md`, updated backend/README, CLAUDE.md |
| Feb 6 | Backend cleanup | 0 dead files, 0 console.log, 202 tests passing |
| Feb 6 | Clean Architecture | 0 infrastructure imports in use cases |
| Feb 6 | Frontend modernization | 257/257 components OnPush, 0 legacy patterns |

---

## 🛠️ Tech Stack

### Frontend
- **Angular 20.3** - Frontend framework with signals
- **TailwindCSS** - Utility-first CSS
- **RxJS** - Reactive programming
- **Chart.js** - Data visualization

### Backend
- **Spring Boot 3.2.6** - Application framework (Java 21)
- **Spring Security 6.x** - JWT authentication (JJWT 0.12.3)
- **Spring Data JPA** - Data access with Clean Architecture
- **PostgreSQL 16** - 34 tables, 94 indexes (BRIN, GIN, partial)
- **Flyway 10.x** - Database migrations (V26-V30 + V1 reference)
- **Caffeine Cache** - In-memory caching
- **Cloudflare R2** - File storage (S3-compatible)

### AI Service
- **FastAPI** - Python web framework
- **LangChain + LangGraph** - LLM orchestration
- **Neo4j** - Knowledge graph
- **Google Gemini 2.5** - Large language model

---

## 📄 License

Proprietary software for Maritime Education.

---

<div align="center">

**Maritime LMS** - Empowering Maritime Education with AI

[![Made with Angular](https://img.shields.io/badge/Made%20with-Angular-dd0031?style=flat-square&logo=angular)](https://angular.io)
[![Powered by Spring](https://img.shields.io/badge/Powered%20by-Spring-6db33f?style=flat-square&logo=spring)](https://spring.io)
[![AI by Gemini](https://img.shields.io/badge/AI%20by-Gemini-4285f4?style=flat-square&logo=google)](https://ai.google.dev)

</div>
