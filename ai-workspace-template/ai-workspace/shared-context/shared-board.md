# SHARED BOARD - LMS

Inter-Agent Collaboration Space

---

## CURRENT STATUS

**Phase**: Active Development
**Sprint**: December 2025
**Focus**: Quiz System Enhancement

### Codebase Metrics (Deep Audit)

| Metric | Count | Notes |
|--------|-------|-------|
| Backend Controllers | 34 | Largest: CourseController (1016 lines) |
| Backend Services | 29 | Largest: QuizService (1086 lines) |
| Backend Entities | 31 | Course: 30+ fields, User: UserDetails impl |
| Frontend Modules | 17 | Teacher (12), Student (9), Admin, etc. |
| API Endpoints | 12 | quiz.api.ts has V2 DDD approach |
| DB Migrations | 30 | V1→V27 + fixes |

### Active Work

| Agent | Current Task | Status | Last Updated |
|-------|--------------|--------|--------------|
| PM | Deep audit complete | Ready | 2025-12-23 |
| FE | Angular 20 + Tailwind v4 | Ready | 2025-12-23 |
| BE | Spring Boot 3.5.6 APIs | Ready | 2025-12-23 |
| DB | PostgreSQL migrations | Ready | 2025-12-23 |
| QA | Test infrastructure | Ready | 2025-12-23 |

---

## KEY INSIGHTS

### Backend
- CourseController handles CRUD, enrollment, bulk Excel import, approval workflow
- QuizService is most complex (quiz lifecycle, attempts, scoring, statistics)
- DTOs defined inside controllers (should refactor to dto package)

### Frontend
- V2 API in quiz.api.ts uses DDD approach with union types
- Large components need refactoring (student-my-courses: 28KB)
- Signal-based state management (Angular 20+)

### Database
- Quiz domain refactored in 3 phases (V17-V19)
- Class-based enrollment implemented (V25-V27)
- JSONB used for flexible data (tags, question_ids, answers)

---

## KNOWN ISSUES

| ID | Description | Owner | Status |
|----|-------------|-------|--------|
| 1 | Large controller files | BE | Documented |
| 2 | student-my-courses.component too large | FE | Documented |
| 3 | Flyway disabled for Supabase | DB | Workaround |

---

## RESOLVED INCIDENTS

| Date | Issue | Resolution |
|------|-------|------------|
| 2025-12-23 | False alarm: tables dropped | **DB Healthy** - Tables exist. V25 applied 2025-12-22. |
| 2025-12-23 | **CRITICAL**: course_id missing | **FIXED** - Added course_id column to learning_classes, linked via class_courses. |

---

## HOW TO USE

1. CHECK this board at session start
2. UPDATE your row in Active Work
3. LOG decisions that affect other agents
4. REPORT blockers immediately
