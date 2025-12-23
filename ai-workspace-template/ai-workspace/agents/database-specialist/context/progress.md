# Progress - LMS

## Database Layer - Deep Analysis (from actual schema.md)

### Tech Stack
- **Database**: PostgreSQL (Supabase hosted)
- **ORM**: JPA/Hibernate
- **Migrations**: Flyway (30 migrations, now disabled for Supabase)
- **UUID**: gen_random_uuid() for PKs

---

## Schema Overview

**Total Tables**: 40
**Total Indexes**: 100+
**JSONB Usage**: 8 tables (flexible data)

---

## Table Catalog

### User & Auth Domain (3 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **users** | 7 | Core user table (id, username, email, password, role, enabled) |
| **refresh_tokens** | 9 | JWT refresh tokens with device info |
| **flyway_schema_history** | 10 | Migration tracking |

#### users Indexes (9)
- `idx_users_email`, `idx_users_role`
- `idx_users_email_lower` (case-insensitive search)
- `idx_users_role_email_lower` (composite for filtered search)

---

### Course Domain (10 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **courses** | 22 | Core course (title, description, status, pricing) |
| **chapters** | 7 | Course chapters |
| **lessons** | 15 | Lessons within chapters |
| **sections** | 14 | Content units (LECTURE/VIDEO/FILE/QUIZ) |
| **categories** | 3 | Course categories |
| **course_tags** | 2 | M:N course-tag mapping |
| **course_teaching_staff** | 2 | Additional teachers |
| **course_enrollments** | 2 | Direct course enrollment (legacy) |
| **course_versions** | 4 | Snapshot versioning (JSONB content) |
| **course_authoring** | 14 | Draft/authoring workflow |

#### courses Fields
```
id, code (UNIQUE), title, description
status, visibility, price_type, price, sale_price
teacher_id → users, instructor_id, reviewed_by_id
category_id → categories
credits, benefits, welcome_message, course_information
intro_video_url
```

---

### Class-Based Enrollment (5 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **learning_classes** | 14 | Class definitions (name, code, schedule, semester) |
| **enrollments** | 10 | Student-class enrollment with progress JSONB |
| **learning_enrollments** | 9 | Alternative enrollment table |
| **class_courses** | 7 | M:N class-course mapping |
| **chapter_authoring** | 6 | Chapter drafts |

#### learning_classes Fields
```
id, name, code (UNIQUE), description
teacher_id → users
schedule_type, semester, max_students
status (OPEN/CLOSED), start_date, end_date
```

---

### Quiz Domain (6 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **quizzes** | 22 | Quiz definitions (settings, type, dates) |
| **questions** | 13 | Question bank (content, difficulty, tags) |
| **question_options** | 5 | Multiple choice options |
| **quiz_questions** | 9 | M:N quiz-question with ordering |
| **quiz_attempts** | 20 | Student attempts (score, answers JSONB) |
| **quiz_attempt_items** | 6 | Per-question responses |
| **quiz_assignments** | 12 | Quiz assigned to specific students |

#### quizzes Fields
```
id, title, description, type (LESSON_QUIZ/ASSIGNMENT)
lesson_id → lessons, section_id → sections, course_id → courses
created_by → users
time_limit_minutes, max_attempts, passing_score
shuffle_questions, shuffle_options
show_results_immediately, show_correct_answers
question_ids (TEXT), start_date, end_date
status, published_at
```

---

### Assignment Domain (7 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **assignments** | 17 | Assignment definitions |
| **assignment_submissions** | 17 | Student submissions with grading |
| **submissions** | 10 | Alternative submission table |
| **assignment_allocations** | 12 | Distribution to students |
| **assignment_allocation_students** | 5 | Individual allocations |
| **assignment_attachments** | 9 | Attached files |
| **assignment_rubrics** | 8 | Grading criteria |
| **lesson_assignments** | 5 | Lesson-assignment mapping |

---

### Progress Tracking (3 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **stu_lesson_progress** | 8 | Student lesson progress (time_spent, status) |
| **student_lesson_progress** | 10 | Extended progress (watch_time, completion_percent) |
| **lesson_attachments** | 11 | Lesson files |

---

### Communication (3 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **conversations** | 15 | 1:1 teacher-student threads |
| **messages** | 9 | Conversation messages |
| **chat_sessions** | 11 | AI chat sessions |
| **chat_messages** | 13 | AI chat messages (analytics tracked) |

---

### Other (4 tables)
| Table | Columns | Purpose |
|-------|---------|---------|
| **packages** | 12 | Question packages/banks |
| **file_attachments** | 13 | Generic file storage |
| **outbox_messages** | 11 | Transactional outbox pattern |
| **lesson_authoring** | 12 | Lesson drafts |

---

## Key Relationships

```
users (1) ──< courses (teacher_id)
users (1) ──< learning_classes (teacher_id)
users (M) ──< enrollments ──> learning_classes (M)
learning_classes (M) ──< class_courses ──> courses (M)

courses (1) ──< chapters (M)
chapters (1) ──< lessons (M)
lessons (1) ──< sections (M)
sections (1) ──< quizzes (optional)

quizzes (M) ──< quiz_questions ──> questions (M)
quizzes (1) ──< quiz_attempts (M) ──> users
quiz_attempts (1) ──< quiz_attempt_items (M)

assignments (1) ──< assignment_submissions (M) ──> users
```

---

## JSONB Usage

| Table | Field | Purpose |
|-------|-------|---------|
| enrollments | progress | Learning progress data |
| quiz_attempts | answers | Student answers map |
| quiz_questions | options | Question options |
| course_versions | snapshot_content | Version snapshot |
| assignment_config | assignment_config | Flexible settings |
| outbox_messages | payload | Event data |

---

## Indexing Strategy

### Performance Indexes
- Composite: `idx_users_role_email_lower`
- Case-insensitive: `idx_users_email_lower`
- Status filters: `idx_courses_status`, `idx_learning_classes_status`
- Join optimization: `idx_chapters_course_id`, `idx_lessons_chapter_id`

### Unique Constraints
- `courses.code`, `users.email`, `users.username`
- `learning_classes.code`
- `quiz_questions (quiz_id, question_id)` - no duplicate questions

---

## Observations

### Good Practices ✓
- UUID primary keys (gen_random_uuid)
- Proper foreign keys
- Comprehensive indexing
- JSONB for flexible data
- Composite unique constraints

### Areas to Note
- Two progress tables (stu_lesson_progress, student_lesson_progress) - needs cleanup
- Two submission tables (submissions, assignment_submissions) - consolidation needed
- Flyway disabled for Supabase - manual migration required

---

**Last Audit**: 2025-12-23
**Source**: Actual database schema export (schema.md)
**Audit Depth**: Complete schema analysis
