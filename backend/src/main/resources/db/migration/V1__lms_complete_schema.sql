-- =============================================
-- LMS MARITIME COMPLETE DATABASE SCHEMA
-- =============================================
-- PostgreSQL 16+ | Flyway Baseline Migration
-- Generated: 2026-02-06
--
-- This file is the SINGLE SOURCE OF TRUTH for the
-- entire LMS database architecture. It can be used:
--   1. As a Flyway baseline (V1) for fresh deployments
--   2. As a reference doc for BE/FE developers
--   3. For PostgreSQL 16+ feature showcase (BRIN, GIN, partial indexes, triggers)
--
-- Tables: 35 (33 existing + audit_log + login_attempts)
-- Indexes: 80+ (B-tree, BRIN, GIN, partial)
-- Triggers: updated_at auto-update + audit logging
-- Materialized Views: 2 (course stats, teacher performance)
--
-- Modules:
--   identity           (1 table)   - Users, authentication
--   course_authoring    (8 tables)  - Courses, chapters, lessons, sections
--   course_management   (1 table)   - Course versioning
--   learning_delivery   (3 tables)  - Classes, enrollments, progress
--   assessment         (12 tables)  - Assignments, quizzes, questions
--   communication       (2 tables)  - Conversations, messages
--   ai_assistant        (2 tables)  - Chat sessions, messages
--   shared              (4 tables)  - Packages, files, outbox
--   security            (2 tables)  - Audit log, login attempts
-- =============================================


-- =============================================
-- 1. EXTENSIONS & CONFIGURATION
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid(), crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram similarity for full-text search


-- =============================================
-- 2. HELPER FUNCTIONS
-- =============================================

-- 2.1 Auto-update updated_at timestamp
-- Usage: CREATE OR REPLACE TRIGGER... BEFORE UPDATE ... EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Generic audit trigger function
-- Captures INSERT/UPDATE/DELETE on critical tables into audit_log.
-- Attach via: CREATE OR REPLACE TRIGGER... AFTER INSERT OR UPDATE OR DELETE ... EXECUTE FUNCTION fn_audit_trigger();
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_by UUID;
BEGIN
    -- Try to extract changed_by from current_setting (set by application)
    BEGIN
        v_changed_by := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_changed_by := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_old_data, NULL, v_changed_by);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        -- Only log if data actually changed
        IF v_old_data IS DISTINCT FROM v_new_data THEN
            INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
            VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_old_data, v_new_data, v_changed_by);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, v_new_data, v_changed_by);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- 3. CORE TABLES
-- =============================================
-- Tables created in dependency order (parents before children).
-- Every table uses UUID primary keys via gen_random_uuid().

-- =============================================
-- 3.1 SECURITY MODULE
-- =============================================
-- These tables are created first because they have no dependencies.

-- Audit log for compliance-grade change tracking on critical tables.
-- Populated automatically by fn_audit_trigger() on courses, users, enrollments, submissions.
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL       PRIMARY KEY,
    table_name      VARCHAR(64)     NOT NULL,
    record_id       UUID            NOT NULL,
    action          VARCHAR(10)     NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data        JSONB,
    new_data        JSONB,
    changed_by      UUID,
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Generic audit trail for critical tables (courses, users, enrollments, submissions)';
COMMENT ON COLUMN audit_log.changed_by IS 'UUID of the user who made the change (set via app.current_user_id session var)';

-- Login attempts for brute-force detection and security analytics.
CREATE TABLE IF NOT EXISTS login_attempts (
    id              BIGSERIAL       PRIMARY KEY,
    email           VARCHAR(100)    NOT NULL,
    ip_address      INET,
    success         BOOLEAN         NOT NULL DEFAULT FALSE,
    failure_reason  VARCHAR(255),
    user_agent      VARCHAR(512),
    attempted_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE login_attempts IS 'Security logging for authentication - rate limiting and brute force detection';


-- =============================================
-- 3.2 IDENTITY MODULE
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50)     NOT NULL,
    email           VARCHAR(100)    NOT NULL,
    password        VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(255)    NOT NULL,
    role            VARCHAR(20)     NOT NULL DEFAULT 'STUDENT'
                                    CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    enabled         BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email    UNIQUE (email)
);

COMMENT ON TABLE users IS 'All system users: admins, teachers, students. Implements Spring Security UserDetails.';
COMMENT ON COLUMN users.role IS 'User role enum: ADMIN, TEACHER, STUDENT';
COMMENT ON COLUMN users.password IS 'BCrypt-hashed password (never stored in plain text)';


-- =============================================
-- 3.3 COURSE AUTHORING MODULE
-- =============================================

CREATE TABLE IF NOT EXISTS categories (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50)     NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    prefix          VARCHAR(10)     NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT uq_categories_code UNIQUE (code),
    CONSTRAINT uq_categories_prefix UNIQUE (prefix)
);

COMMENT ON TABLE categories IS 'Course categories (e.g., Navigation, Engineering, Safety, Logistics, Law)';

CREATE TABLE IF NOT EXISTS courses (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(64)     NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    description         TEXT,
    status              VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                                        CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED')),
    teacher_id          UUID            NOT NULL,
    category_id         UUID,
    welcome_message     TEXT,
    course_information  TEXT,
    benefits            TEXT,
    intro_video_url     VARCHAR(500),
    credits             INTEGER,
    visibility          VARCHAR(20)     NOT NULL DEFAULT 'PUBLIC'
                                        CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    price_type          VARCHAR(20)     NOT NULL DEFAULT 'FREE'
                                        CHECK (price_type IN ('FREE', 'PAID')),
    price               NUMERIC(19, 2),
    sale_price          NUMERIC(19, 2),
    delivery_mode       VARCHAR(20)     NOT NULL DEFAULT 'SELF_PACED'
                                        CHECK (delivery_mode IN ('SELF_PACED', 'INSTRUCTOR_LED')),
    review_comment      TEXT,
    reviewed_at         TIMESTAMPTZ,
    reviewed_by_id      UUID,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,

    CONSTRAINT uq_courses_code UNIQUE (code),
    CONSTRAINT fk_courses_teacher  FOREIGN KEY (teacher_id)     REFERENCES users(id),
    CONSTRAINT fk_courses_category FOREIGN KEY (category_id)    REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_courses_reviewer FOREIGN KEY (reviewed_by_id) REFERENCES users(id)
);

COMMENT ON TABLE courses IS 'Master course catalog. Lifecycle: DRAFT -> PENDING -> APPROVED -> PUBLISHED. Supports pricing and visibility controls.';
COMMENT ON COLUMN courses.status IS 'Course lifecycle status: DRAFT, PENDING, APPROVED, REJECTED, PUBLISHED, ARCHIVED';
COMMENT ON COLUMN courses.price IS 'Course price in VND (NULL for free courses)';

-- Element collection table for course tags (Set<String> in JPA)
CREATE TABLE IF NOT EXISTS course_tags (
    course_id       UUID            NOT NULL,
    tag_name        VARCHAR(100)    NOT NULL,

    CONSTRAINT pk_course_tags      PRIMARY KEY (course_id, tag_name),
    CONSTRAINT fk_course_tags_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

COMMENT ON TABLE course_tags IS 'Tags/keywords for courses (JPA @ElementCollection). Used for search and filtering.';

CREATE TABLE IF NOT EXISTS chapters (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID            NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT,
    order_index     INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_chapters_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

COMMENT ON TABLE chapters IS 'Course chapters (ordered sections of a course). Cascade-deleted with course.';

CREATE TABLE IF NOT EXISTS lessons (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id          UUID            NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    description         TEXT,
    lesson_type         VARCHAR(20)     DEFAULT 'VIDEO'
                                        CHECK (lesson_type IN ('VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'LECTURE')),
    video_url           VARCHAR(500),
    duration_minutes    INTEGER         DEFAULT 0,
    order_index         INTEGER         NOT NULL DEFAULT 0,
    is_free             BOOLEAN         DEFAULT FALSE,
    content_blocks      JSONB,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,

    CONSTRAINT fk_lessons_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

COMMENT ON TABLE lessons IS 'Individual lessons within chapters. Supports multiple types (video, text, quiz, assignment). Content stored as JSONB blocks.';
COMMENT ON COLUMN lessons.content_blocks IS 'JSONB array of ContentBlock objects: [{id, type, data: {}}]. Types: text, image, video, code, formula.';

CREATE TABLE IF NOT EXISTS sections (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID            NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    type            VARCHAR(20)     NOT NULL
                                    CHECK (type IN ('VIDEO', 'TEXT', 'QUIZ', 'FILE', 'ASSIGNMENT')),
    content         TEXT,
    video_url       VARCHAR(500),
    file_url        VARCHAR(500),
    is_required     BOOLEAN         NOT NULL DEFAULT FALSE,
    duration        INTEGER         DEFAULT 0,
    order_index     INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_sections_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

COMMENT ON TABLE sections IS 'Sub-sections within a lesson (video segments, text blocks, file attachments, quiz references).';

CREATE TABLE IF NOT EXISTS lesson_attachments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id           UUID            NOT NULL,
    file_name           VARCHAR(255)    NOT NULL,
    original_file_name  VARCHAR(255)    NOT NULL,
    file_url            VARCHAR(500)    NOT NULL,
    file_size           BIGINT,
    content_type        VARCHAR(100),
    file_type           VARCHAR(20)     DEFAULT 'OTHER'
                                        CHECK (file_type IN ('DOCUMENT', 'PRESENTATION', 'SPREADSHEET', 'VIDEO', 'AUDIO', 'IMAGE', 'OTHER')),
    display_order       INTEGER         DEFAULT 0,
    uploaded_by         UUID,
    uploaded_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_lesson_attachments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    CONSTRAINT fk_lesson_attachments_user   FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE lesson_attachments IS 'File attachments for lessons (documents, presentations, spreadsheets, etc.). Stored in R2/S3.';

CREATE TABLE IF NOT EXISTS lesson_assignments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID            NOT NULL,
    assignment_id   UUID            NOT NULL,
    order_index     INTEGER         DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_lesson_assignments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    -- FK to assignments added after assignments table is created
);

COMMENT ON TABLE lesson_assignments IS 'Junction table linking lessons to assignments (many-to-many).';


-- =============================================
-- 3.4 COURSE MANAGEMENT MODULE
-- =============================================

CREATE TABLE IF NOT EXISTS course_versions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id           UUID            NOT NULL,
    version_number      INTEGER         NOT NULL,
    snapshot_content    JSONB           NOT NULL,
    published_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_course_versions_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

COMMENT ON TABLE course_versions IS 'Immutable snapshots of published course content. JSONB contains full chapter/lesson tree for that version.';
COMMENT ON COLUMN course_versions.snapshot_content IS 'JSONB array of ChapterSnapshot: [{id, title, orderIndex, lessons: [{id, title, type, contentUrl, contentHtml, durationSeconds, orderIndex, isRequired}]}]';


-- =============================================
-- 3.5 LEARNING DELIVERY MODULE
-- =============================================

CREATE TABLE IF NOT EXISTS learning_classes (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255)    NOT NULL,
    code                VARCHAR(64),
    course_version_id   UUID,
    course_id           UUID            NOT NULL,
    teacher_id          UUID,
    start_date          TIMESTAMPTZ,
    end_date            TIMESTAMPTZ,
    schedule_type       VARCHAR(20)     DEFAULT 'CUSTOM'
                                        CHECK (schedule_type IN ('SEMESTER', 'CUSTOM')),
    semester            VARCHAR(50),
    status              VARCHAR(20)     NOT NULL DEFAULT 'OPEN'
                                        CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED', 'CANCELLED')),
    max_students        INTEGER         DEFAULT 9999,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,

    CONSTRAINT uq_learning_classes_code UNIQUE (code),
    CONSTRAINT fk_learning_classes_course  FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_learning_classes_version FOREIGN KEY (course_version_id) REFERENCES course_versions(id) ON DELETE SET NULL
);

COMMENT ON TABLE learning_classes IS 'Delivery instances of a course. A course can have many classes (semesters). Tracks enrollment limits and schedules.';

CREATE TABLE IF NOT EXISTS enrollments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id            UUID            NOT NULL,
    student_id          UUID            NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE'
                                        CHECK (status IN ('ACTIVE', 'COMPLETED', 'DROPPED', 'EXPIRED', 'SUSPENDED')),
    progress            JSONB,
    completion_percent  INTEGER         DEFAULT 0,
    completed_at        TIMESTAMPTZ,
    enrolled_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    joined_at           TIMESTAMPTZ,
    last_accessed_at    TIMESTAMPTZ,

    CONSTRAINT uq_enrollments_student_class UNIQUE (student_id, class_id),
    CONSTRAINT fk_enrollments_class   FOREIGN KEY (class_id)   REFERENCES learning_classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE enrollments IS 'Student enrollments in learning classes. Tracks progress as JSONB map of lessonId -> {status, watchSeconds, grade, lastActivity}.';
COMMENT ON COLUMN enrollments.progress IS 'JSONB map: {lessonId: {status, watchSeconds, grade, lastActivity}}. Updated as student progresses.';

CREATE TABLE IF NOT EXISTS student_lesson_progress (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID            NOT NULL,
    lesson_id           UUID            NOT NULL,
    enrollment_id       UUID,
    status              VARCHAR(20)     NOT NULL DEFAULT 'NOT_STARTED'
                                        CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
    watch_time_seconds  INTEGER         DEFAULT 0,
    completion_percent  INTEGER         DEFAULT 0,
    completed_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_accessed_at    TIMESTAMPTZ,

    CONSTRAINT fk_slp_student    FOREIGN KEY (student_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_slp_lesson     FOREIGN KEY (lesson_id)     REFERENCES lessons(id) ON DELETE CASCADE,
    CONSTRAINT fk_slp_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL
);

COMMENT ON TABLE student_lesson_progress IS 'Per-lesson progress tracking. Separate from enrollment-level progress for granular analytics.';


-- =============================================
-- 3.6 ASSESSMENT MODULE - Packages & Questions
-- =============================================

CREATE TABLE IF NOT EXISTS packages (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    subject         VARCHAR(100),
    owner_id        UUID            NOT NULL,
    visibility      VARCHAR(20)     NOT NULL DEFAULT 'PRIVATE'
                                    CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    capacity        INTEGER,
    price           NUMERIC(19, 2),
    duration_days   INTEGER         DEFAULT 365,
    is_active       BOOLEAN         DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_packages_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

COMMENT ON TABLE packages IS 'Question bank packages. Teachers organize questions into packages for reuse across quizzes.';

CREATE TABLE IF NOT EXISTS questions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    content_blocks  JSONB,
    difficulty      VARCHAR(10)     NOT NULL DEFAULT 'MEDIUM'
                                    CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    tags            TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                                    CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
    correct_option  VARCHAR(10)     NOT NULL,
    created_by      UUID            NOT NULL,
    course_id       UUID,
    package_id      UUID,
    usage_count     INTEGER         NOT NULL DEFAULT 0,
    correct_rate    NUMERIC(5, 2)   DEFAULT 0.00,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_questions_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_questions_course  FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE SET NULL,
    CONSTRAINT fk_questions_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

COMMENT ON TABLE questions IS 'Question bank. Content stored as JSONB ContentBlocks (supports text, images, formulas, code). Tracks usage stats.';
COMMENT ON COLUMN questions.content_blocks IS 'JSONB array of ContentBlock: [{id, type, data}]. Supports rich content including LaTeX formulas.';
COMMENT ON COLUMN questions.correct_rate IS 'Percentage of correct answers (0.00-100.00). Updated after each quiz attempt.';

CREATE TABLE IF NOT EXISTS question_options (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID            NOT NULL,
    option_key      VARCHAR(10)     NOT NULL,
    content         JSONB,
    is_correct      BOOLEAN         DEFAULT FALSE,
    display_order   INTEGER         DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_question_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

COMMENT ON TABLE question_options IS 'Answer options for questions. Content as JSONB ContentBlocks for rich formatting.';


-- =============================================
-- 3.7 ASSESSMENT MODULE - Quizzes
-- =============================================

CREATE TABLE IF NOT EXISTS quizzes (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id                   UUID            NOT NULL,
    title                       VARCHAR(255)    NOT NULL,
    description                 TEXT,
    time_limit_minutes          INTEGER,
    max_attempts                INTEGER         DEFAULT 3,
    passing_score               INTEGER         DEFAULT 60,
    shuffle_questions           BOOLEAN         DEFAULT FALSE,
    shuffle_options             BOOLEAN         DEFAULT FALSE,
    show_results_immediately    BOOLEAN         DEFAULT TRUE,
    show_correct_answers        BOOLEAN         DEFAULT TRUE,
    status                      VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                                                CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ,

    CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

COMMENT ON TABLE quizzes IS 'Quiz definitions attached to lessons. Configurable: time limits, attempts, shuffling, result display.';

CREATE TABLE IF NOT EXISTS quiz_questions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID            NOT NULL,
    question_id     UUID            NOT NULL,
    display_order   INTEGER         DEFAULT 0,
    points          INTEGER         DEFAULT 1,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_quiz_questions_quiz     FOREIGN KEY (quiz_id)     REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_questions_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

COMMENT ON TABLE quiz_questions IS 'Junction: links questions to quizzes with ordering and point values.';

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID            NOT NULL,
    student_id      UUID            NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'IN_PROGRESS'
                                    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED')),
    answers         JSONB,
    score           DOUBLE PRECISION,
    max_score       DOUBLE PRECISION,
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_quiz_attempts_quiz    FOREIGN KEY (quiz_id)    REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_attempts_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE quiz_attempts IS 'Student quiz attempts. Answers stored as JSONB map {questionId: selectedOptionKey}. Graded automatically.';

CREATE TABLE IF NOT EXISTS quiz_assignments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID            NOT NULL,
    class_id        UUID,
    course_id       UUID,
    due_date        TIMESTAMPTZ,
    is_active       BOOLEAN         DEFAULT TRUE,
    assigned_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_quiz_assignments_quiz   FOREIGN KEY (quiz_id)   REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_assignments_class  FOREIGN KEY (class_id)  REFERENCES learning_classes(id) ON DELETE SET NULL,
    CONSTRAINT fk_quiz_assignments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

COMMENT ON TABLE quiz_assignments IS 'Distributes quizzes to specific classes or courses with due dates.';


-- =============================================
-- 3.8 ASSESSMENT MODULE - Assignments
-- =============================================

CREATE TABLE IF NOT EXISTS assignments (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id               UUID,
    course_id               UUID,
    title                   VARCHAR(255)    NOT NULL,
    description             TEXT,
    instructions            TEXT,
    assignment_type         VARCHAR(20)     NOT NULL DEFAULT 'FILE_UPLOAD'
                                            CHECK (assignment_type IN ('FILE_UPLOAD', 'TEXT', 'QUIZ', 'PROJECT', 'ESSAY')),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                                            CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
    max_score               NUMERIC(10, 2)  DEFAULT 100,
    passing_score           INTEGER         DEFAULT 60,
    due_date                TIMESTAMPTZ,
    max_attempts            INTEGER         DEFAULT 1,
    allow_late_submission   BOOLEAN         DEFAULT FALSE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ,

    CONSTRAINT fk_assignments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
    CONSTRAINT fk_assignments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

COMMENT ON TABLE assignments IS 'Assignment definitions. Types: FILE_UPLOAD, TEXT, QUIZ, PROJECT, ESSAY. Configurable scoring and deadlines.';

-- Add FK from lesson_assignments to assignments (deferred because of table ordering)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lesson_assignments_assignment') THEN
        ALTER TABLE lesson_assignments
            ADD CONSTRAINT fk_lesson_assignments_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID            NOT NULL,
    student_id      UUID            NOT NULL,
    course_id       UUID,
    status          VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                                    CHECK (status IN ('DRAFT', 'SUBMITTED', 'LATE', 'GRADED', 'RETURNED', 'RESUBMITTED')),
    content         TEXT,
    file_url        VARCHAR(512),
    file_name       VARCHAR(255),
    grade           DOUBLE PRECISION,
    max_grade       DOUBLE PRECISION,
    feedback        TEXT,
    graded_by       UUID,
    graded_at       TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT uq_submission_assignment_student UNIQUE (assignment_id, student_id),
    CONSTRAINT fk_submissions_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_student    FOREIGN KEY (student_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_grader     FOREIGN KEY (graded_by)     REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE assignment_submissions IS 'Student submissions for assignments. One submission per student per assignment (upsert pattern).';

CREATE TABLE IF NOT EXISTS assignment_attachments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID            NOT NULL,
    submission_id   UUID,
    file_name       VARCHAR(255)    NOT NULL,
    file_url        VARCHAR(512)    NOT NULL,
    file_size       BIGINT,
    file_type       VARCHAR(128),
    storage_key     VARCHAR(512),
    uploaded_by     UUID,
    uploaded_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_assign_attach_assignment  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_attach_submission  FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id) ON DELETE SET NULL,
    CONSTRAINT fk_assign_attach_uploader    FOREIGN KEY (uploaded_by)   REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE assignment_attachments IS 'File attachments for assignments and submissions. Stored in R2/S3.';

CREATE TABLE IF NOT EXISTS assignment_rubrics (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID            NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT,
    max_points      DOUBLE PRECISION,
    criteria        JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_rubrics_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

COMMENT ON TABLE assignment_rubrics IS 'Rubrics for structured assignment grading. Criteria as JSONB: [{name, description, maxPoints, levels: [{label, description, points}]}]';

CREATE TABLE IF NOT EXISTS assignment_allocations (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id       UUID            NOT NULL,
    distribution_type   VARCHAR(50),
    class_id            UUID,
    allocator_id        UUID,
    due_date            TIMESTAMPTZ,
    is_active           BOOLEAN         DEFAULT TRUE,
    allocated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_allocations_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_allocations_class      FOREIGN KEY (class_id)      REFERENCES learning_classes(id) ON DELETE SET NULL,
    CONSTRAINT fk_allocations_allocator  FOREIGN KEY (allocator_id)  REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE assignment_allocations IS 'Distributes assignments to classes with optional custom due dates.';

CREATE TABLE IF NOT EXISTS assignment_allocation_students (
    allocation_id   UUID            NOT NULL,
    student_id      UUID            NOT NULL,
    assigned_at     TIMESTAMPTZ,
    custom_deadline TIMESTAMPTZ,
    note            TEXT,

    CONSTRAINT pk_allocation_students PRIMARY KEY (allocation_id, student_id),
    CONSTRAINT fk_alloc_students_allocation FOREIGN KEY (allocation_id) REFERENCES assignment_allocations(id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_students_student    FOREIGN KEY (student_id)    REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE assignment_allocation_students IS 'Per-student allocation overrides (custom deadlines, notes).';


-- =============================================
-- 3.9 COMMUNICATION MODULE
-- =============================================

CREATE TABLE IF NOT EXISTS conversations (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id     UUID            NOT NULL,
    participant2_id     UUID            NOT NULL,
    last_message_at     TIMESTAMPTZ,
    last_message_preview VARCHAR(500),
    unread_count_1      INTEGER         DEFAULT 0,
    unread_count_2      INTEGER         DEFAULT 0,
    is_archived_1       BOOLEAN         DEFAULT FALSE,
    is_archived_2       BOOLEAN         DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,

    CONSTRAINT fk_conversations_p1 FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversations_p2 FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE conversations IS '1-to-1 messaging conversations between two users. Tracks unread counts and archive state per participant.';

CREATE TABLE IF NOT EXISTS messages (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID            NOT NULL,
    sender_id           UUID            NOT NULL,
    content             TEXT            NOT NULL,
    is_read             BOOLEAN         DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender       FOREIGN KEY (sender_id)       REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE messages IS 'Individual messages within conversations. Ordered by sent_at.';


-- =============================================
-- 3.10 AI ASSISTANT MODULE
-- =============================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    context_type    VARCHAR(50)     DEFAULT 'GENERAL',
    context_id      UUID,
    is_archived     BOOLEAN         DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,

    CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE chat_sessions IS 'AI chat sessions. Context-aware: can be scoped to a course, lesson, or general.';
COMMENT ON COLUMN chat_sessions.context_type IS 'Session context: GENERAL, COURSE, LESSON, ASSIGNMENT, etc.';

CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID            NOT NULL,
    role            VARCHAR(20)     NOT NULL
                                    CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
    content         TEXT            NOT NULL,
    tokens_used     INTEGER         DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

COMMENT ON TABLE chat_messages IS 'Individual messages in AI chat sessions. Tracks token usage for cost accounting.';


-- =============================================
-- 3.11 SHARED MODULE
-- =============================================

CREATE TABLE IF NOT EXISTS file_attachments (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         VARCHAR(50),
    entity_id           UUID,
    file_category       VARCHAR(50)     NOT NULL,
    status              VARCHAR(20),
    stored_filename     VARCHAR(255)    NOT NULL,
    original_filename   VARCHAR(255)    NOT NULL,
    storage_path        VARCHAR(255)    NOT NULL,
    file_size           BIGINT          NOT NULL,
    content_type        VARCHAR(100)    NOT NULL,
    uploaded_by         UUID            NOT NULL,
    uploaded_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_file_attachments_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

COMMENT ON TABLE file_attachments IS 'Generic file attachment registry. Polymorphic via entity_type + entity_id. Files stored in R2/S3.';
COMMENT ON COLUMN file_attachments.entity_type IS 'Polymorphic discriminator: COURSE, LESSON, ASSIGNMENT, SUBMISSION, etc.';
COMMENT ON COLUMN file_attachments.entity_id IS 'ID of the owning entity (course_id, lesson_id, etc.)';

CREATE TABLE IF NOT EXISTS outbox_messages (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(255)    NOT NULL,
    aggregate_id    UUID            NOT NULL,
    event_type      VARCHAR(255)    NOT NULL,
    payload         JSONB           NOT NULL,
    status          VARCHAR(20)     DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DLQ')),
    attempts        INTEGER         DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    last_error      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ
);

COMMENT ON TABLE outbox_messages IS 'Transactional Outbox Pattern: events stored in same transaction as domain changes, published asynchronously.';
COMMENT ON COLUMN outbox_messages.status IS 'Message lifecycle: PENDING -> PROCESSING -> SENT | FAILED -> DLQ';


-- =============================================
-- 4. INDEXES
-- =============================================
-- Organized by type for clarity. Named consistently: idx_{table}_{columns}.

-- =============================================
-- 4.1 B-TREE INDEXES (Foreign keys & common filters)
-- =============================================
-- PostgreSQL does NOT auto-create indexes on FK columns (unlike MySQL).
-- These are critical for JOIN performance.

-- Identity
CREATE INDEX IF NOT EXISTS idx_users_role             ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_email_lower      ON users (LOWER(email));

-- Course Authoring
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id     ON courses (teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id    ON courses (category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status         ON courses (status);
CREATE INDEX IF NOT EXISTS idx_categories_code        ON categories (code);

CREATE INDEX IF NOT EXISTS idx_chapters_course_id     ON chapters (course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_course_order  ON chapters (course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id     ON lessons (chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_order  ON lessons (chapter_id, order_index);

CREATE INDEX IF NOT EXISTS idx_sections_lesson_id     ON sections (lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson_id ON lesson_attachments (lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson_id     ON lesson_assignments (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_assignment_id ON lesson_assignments (assignment_id);

-- Course Management
CREATE INDEX IF NOT EXISTS idx_course_versions_course_id ON course_versions (course_id);

-- Learning Delivery
CREATE INDEX IF NOT EXISTS idx_learning_classes_course_id  ON learning_classes (course_id);
CREATE INDEX IF NOT EXISTS idx_learning_classes_teacher_id ON learning_classes (teacher_id);
CREATE INDEX IF NOT EXISTS idx_learning_classes_status     ON learning_classes (status);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id      ON enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id        ON enrollments (class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status          ON enrollments (status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status  ON enrollments (student_id, status);

CREATE INDEX IF NOT EXISTS idx_slp_student_id     ON student_lesson_progress (student_id);
CREATE INDEX IF NOT EXISTS idx_slp_lesson_id      ON student_lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_slp_enrollment_id  ON student_lesson_progress (enrollment_id);

-- Assessment - Questions
CREATE INDEX IF NOT EXISTS idx_questions_course_id    ON questions (course_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by   ON questions (created_by);
CREATE INDEX IF NOT EXISTS idx_questions_status       ON questions (status);
CREATE INDEX IF NOT EXISTS idx_questions_package_id   ON questions (package_id);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options (question_id);

-- Assessment - Quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id      ON quizzes (lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status         ON quizzes (status);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id     ON quiz_questions (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_id ON quiz_questions (question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id         ON quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id      ON quiz_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz    ON quiz_attempts (student_id, quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id   ON quiz_assignments (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_class_id  ON quiz_assignments (class_id);

-- Assessment - Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id  ON assignments (lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id  ON assignments (course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status     ON assignments (status);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON assignment_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id    ON assignment_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status        ON assignment_submissions (status);

CREATE INDEX IF NOT EXISTS idx_assign_attach_assignment_id ON assignment_attachments (assignment_id);
CREATE INDEX IF NOT EXISTS idx_assign_attach_submission_id ON assignment_attachments (submission_id);

CREATE INDEX IF NOT EXISTS idx_rubrics_assignment_id ON assignment_rubrics (assignment_id);

CREATE INDEX IF NOT EXISTS idx_allocations_assignment_id ON assignment_allocations (assignment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_class_id      ON assignment_allocations (class_id);

CREATE INDEX IF NOT EXISTS idx_alloc_students_allocation_id ON assignment_allocation_students (allocation_id);
CREATE INDEX IF NOT EXISTS idx_alloc_students_student_id    ON assignment_allocation_students (student_id);

-- Communication
CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON conversations (participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON conversations (participant2_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at         ON messages (sent_at);

-- AI Assistant
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id       ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_context_type  ON chat_sessions (context_type);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id    ON chat_messages (session_id);

-- Shared
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity    ON file_attachments (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploader  ON file_attachments (uploaded_by);

-- Security
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by   ON audit_log (changed_by);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email   ON login_attempts (email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip      ON login_attempts (ip_address);


-- =============================================
-- 4.2 PARTIAL INDEXES (Status-filtered queries)
-- =============================================
-- Partial indexes only index rows matching a WHERE clause.
-- 50-80% smaller than full indexes for common status queries.

-- Only index published courses (the most common query for students)
CREATE INDEX IF NOT EXISTS idx_courses_published
    ON courses (created_at DESC)
    WHERE status = 'PUBLISHED';

-- Only index open classes (active enrollment target)
CREATE INDEX IF NOT EXISTS idx_learning_classes_open
    ON learning_classes (course_id)
    WHERE status = 'OPEN';

-- Only active enrollments (skip dropped/expired)
CREATE INDEX IF NOT EXISTS idx_enrollments_active
    ON enrollments (student_id, class_id)
    WHERE status = 'ACTIVE';

-- Pending outbox messages (the polling query)
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_messages (next_attempt_at)
    WHERE status = 'PENDING';

-- Published quizzes only (student-facing queries)
CREATE INDEX IF NOT EXISTS idx_quizzes_published
    ON quizzes (lesson_id)
    WHERE status = 'PUBLISHED';

-- Published assignments only
CREATE INDEX IF NOT EXISTS idx_assignments_published
    ON assignments (course_id)
    WHERE status = 'PUBLISHED';

-- Pending submissions (grading queue)
CREATE INDEX IF NOT EXISTS idx_submissions_pending_grading
    ON assignment_submissions (assignment_id)
    WHERE status = 'SUBMITTED';

-- Active questions only (quiz generation)
CREATE INDEX IF NOT EXISTS idx_questions_active
    ON questions (course_id, difficulty)
    WHERE status = 'ACTIVE';

-- Failed login attempts in last hour (brute force detection)
CREATE INDEX IF NOT EXISTS idx_login_attempts_recent_failures
    ON login_attempts (email, attempted_at DESC)
    WHERE success = FALSE;


-- =============================================
-- 4.3 BRIN INDEXES (Time-ordered append-only data)
-- =============================================
-- BRIN (Block Range INdex) is 100x smaller than B-tree for time-series data.
-- Ideal for large, append-only tables queried by time ranges.
-- Requires data to be physically ordered by the indexed column (naturally true for auto-incrementing timestamps).

CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at_brin
    ON audit_log USING BRIN (changed_at)
    WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_login_attempts_at_brin
    ON login_attempts USING BRIN (attempted_at)
    WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_messages_sent_at_brin
    ON messages USING BRIN (sent_at)
    WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at_brin
    ON chat_messages USING BRIN (created_at)
    WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_outbox_created_at_brin
    ON outbox_messages USING BRIN (created_at)
    WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at_brin
    ON quiz_attempts USING BRIN (created_at)
    WITH (pages_per_range = 32);


-- =============================================
-- 4.4 GIN INDEXES (JSONB & Full-Text Search)
-- =============================================
-- GIN (Generalized Inverted Index) enables fast JSONB containment (@>) queries
-- and pg_trgm trigram similarity searches.

-- JSONB containment queries on progress tracking
CREATE INDEX IF NOT EXISTS idx_enrollments_progress_gin
    ON enrollments USING GIN (progress jsonb_path_ops);

-- JSONB containment queries on lesson content blocks
CREATE INDEX IF NOT EXISTS idx_lessons_content_blocks_gin
    ON lessons USING GIN (content_blocks jsonb_path_ops);

-- JSONB containment queries on question content blocks
CREATE INDEX IF NOT EXISTS idx_questions_content_blocks_gin
    ON questions USING GIN (content_blocks jsonb_path_ops);

-- JSONB on quiz attempt answers
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_answers_gin
    ON quiz_attempts USING GIN (answers jsonb_path_ops);

-- JSONB on rubric criteria
CREATE INDEX IF NOT EXISTS idx_rubrics_criteria_gin
    ON assignment_rubrics USING GIN (criteria jsonb_path_ops);

-- JSONB on course version snapshots
CREATE INDEX IF NOT EXISTS idx_course_versions_snapshot_gin
    ON course_versions USING GIN (snapshot_content jsonb_path_ops);

-- JSONB on outbox payload
CREATE INDEX IF NOT EXISTS idx_outbox_payload_gin
    ON outbox_messages USING GIN (payload jsonb_path_ops);

-- Full-text search: course title + description (trigram similarity)
-- Enables: SELECT * FROM courses WHERE title % 'search term' OR title ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm
    ON courses USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_description_trgm
    ON courses USING GIN (description gin_trgm_ops);

-- Full-text search: question tags
CREATE INDEX IF NOT EXISTS idx_questions_tags_trgm
    ON questions USING GIN (tags gin_trgm_ops);

-- Full-text search: user name
CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm
    ON users USING GIN (full_name gin_trgm_ops);


-- =============================================
-- 5. TRIGGERS
-- =============================================

-- =============================================
-- 5.1 Auto-update updated_at on all tables with that column
-- =============================================

CREATE OR REPLACE TRIGGER trg_users_updated_at             BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_categories_updated_at        BEFORE UPDATE ON categories          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_courses_updated_at           BEFORE UPDATE ON courses             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_chapters_updated_at          BEFORE UPDATE ON chapters            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_lessons_updated_at           BEFORE UPDATE ON lessons             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_sections_updated_at          BEFORE UPDATE ON sections            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_learning_classes_updated_at  BEFORE UPDATE ON learning_classes    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_enrollments_updated_at       BEFORE UPDATE ON enrollments         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_packages_updated_at          BEFORE UPDATE ON packages            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_questions_updated_at         BEFORE UPDATE ON questions           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_question_options_updated_at  BEFORE UPDATE ON question_options    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_quizzes_updated_at           BEFORE UPDATE ON quizzes             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_quiz_questions_updated_at    BEFORE UPDATE ON quiz_questions      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_assignments_updated_at       BEFORE UPDATE ON assignments         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_submissions_updated_at       BEFORE UPDATE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_rubrics_updated_at           BEFORE UPDATE ON assignment_rubrics  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_conversations_updated_at     BEFORE UPDATE ON conversations       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_chat_sessions_updated_at     BEFORE UPDATE ON chat_sessions       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Note: Tables WITHOUT updated_at (append-only): messages, chat_messages, quiz_attempts,
-- lesson_attachments, assignment_attachments, file_attachments, login_attempts, audit_log,
-- outbox_messages, course_versions, lesson_assignments, quiz_assignments, course_tags,
-- assignment_allocation_students, assignment_allocations, student_lesson_progress.
-- student_lesson_progress uses last_accessed_at instead (handled by Hibernate @UpdateTimestamp).

-- =============================================
-- 5.2 Audit triggers on critical tables
-- =============================================
-- Only on high-value tables to avoid excessive audit volume.

CREATE OR REPLACE TRIGGER trg_audit_courses
    AFTER INSERT OR UPDATE OR DELETE ON courses
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE OR REPLACE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE OR REPLACE TRIGGER trg_audit_enrollments
    AFTER INSERT OR UPDATE OR DELETE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE OR REPLACE TRIGGER trg_audit_submissions
    AFTER INSERT OR UPDATE OR DELETE ON assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();


-- =============================================
-- 6. MATERIALIZED VIEWS
-- =============================================
-- Pre-computed aggregates for dashboard queries.
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xxx;
-- CONCURRENTLY allows reads during refresh (requires unique index).

-- 6.1 Course statistics for admin analytics dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_course_stats AS
SELECT
    c.id                    AS course_id,
    c.title                 AS course_title,
    c.status                AS course_status,
    c.teacher_id,
    u.full_name             AS teacher_name,
    cat.name                AS category_name,
    c.created_at            AS course_created_at,
    COUNT(DISTINCT ch.id)   AS chapter_count,
    COUNT(DISTINCT l.id)    AS lesson_count,
    COUNT(DISTINCT lc.id)   AS class_count,
    COUNT(DISTINCT e.id)    AS total_enrollments,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE')    AS active_enrollments,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'COMPLETED') AS completed_enrollments,
    ROUND(AVG(e.completion_percent) FILTER (WHERE e.status = 'ACTIVE'), 1) AS avg_completion_percent,
    COUNT(DISTINCT q.id)    AS quiz_count,
    COUNT(DISTINCT a.id)    AS assignment_count
FROM courses c
LEFT JOIN users u           ON u.id = c.teacher_id
LEFT JOIN categories cat    ON cat.id = c.category_id
LEFT JOIN chapters ch       ON ch.course_id = c.id
LEFT JOIN lessons l         ON l.chapter_id = ch.id
LEFT JOIN learning_classes lc ON lc.course_id = c.id
LEFT JOIN enrollments e     ON e.class_id = lc.id
LEFT JOIN quizzes q         ON q.lesson_id = l.id
LEFT JOIN assignments a     ON a.course_id = c.id
GROUP BY c.id, c.title, c.status, c.teacher_id, u.full_name, cat.name, c.created_at
WITH NO DATA;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_course_stats_id ON mv_course_stats (course_id);

COMMENT ON MATERIALIZED VIEW mv_course_stats IS 'Pre-computed course statistics for admin dashboard. Refresh periodically: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_course_stats;';

-- 6.2 Teacher performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_teacher_performance AS
SELECT
    u.id                    AS teacher_id,
    u.full_name             AS teacher_name,
    u.email                 AS teacher_email,
    COUNT(DISTINCT c.id)    AS total_courses,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'PUBLISHED') AS published_courses,
    COUNT(DISTINCT lc.id)   AS total_classes,
    COUNT(DISTINCT e.id)    AS total_students,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ACTIVE')    AS active_students,
    ROUND(AVG(e.completion_percent) FILTER (WHERE e.status IN ('ACTIVE', 'COMPLETED')), 1) AS avg_student_completion,
    COUNT(DISTINCT q.id)    AS total_quizzes,
    COUNT(DISTINCT a.id)    AS total_assignments,
    COUNT(DISTINCT asub.id) FILTER (WHERE asub.status = 'SUBMITTED') AS pending_gradings
FROM users u
LEFT JOIN courses c         ON c.teacher_id = u.id
LEFT JOIN learning_classes lc ON lc.course_id = c.id
LEFT JOIN enrollments e     ON e.class_id = lc.id
LEFT JOIN chapters ch       ON ch.course_id = c.id
LEFT JOIN lessons l         ON l.chapter_id = ch.id
LEFT JOIN quizzes q         ON q.lesson_id = l.id
LEFT JOIN assignments a     ON a.course_id = c.id
LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id
WHERE u.role = 'TEACHER'
GROUP BY u.id, u.full_name, u.email
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_teacher_perf_id ON mv_teacher_performance (teacher_id);

COMMENT ON MATERIALIZED VIEW mv_teacher_performance IS 'Pre-computed teacher KPIs for teacher dashboard. Refresh periodically: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_performance;';


-- =============================================
-- 7. SEED DATA
-- =============================================

-- 7.1 Maritime course categories
INSERT INTO categories (id, code, name, prefix) VALUES
    (gen_random_uuid(), 'NAVIGATION',   'Hàng hải - Điều khiển tàu biển', 'NAV'),
    (gen_random_uuid(), 'ENGINEERING',  'Kỹ thuật máy tàu biển',          'ENG'),
    (gen_random_uuid(), 'SAFETY',       'An toàn hàng hải',               'SAF'),
    (gen_random_uuid(), 'LOGISTICS',    'Logistics và vận tải biển',      'LOG'),
    (gen_random_uuid(), 'LAW',          'Luật hàng hải',                  'LAW')
ON CONFLICT (code) DO NOTHING;

-- 7.2 Admin user (password: admin123, BCrypt hash)
INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at) VALUES
    (gen_random_uuid(), 'admin', 'admin@maritime.edu',
     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
     'System Administrator', 'ADMIN', TRUE, NOW())
ON CONFLICT (email) DO NOTHING;

-- 7.3 Initial materialized view refresh
-- These must run after seed data is inserted.
REFRESH MATERIALIZED VIEW mv_course_stats;
REFRESH MATERIALIZED VIEW mv_teacher_performance;


-- =============================================
-- SCHEMA SUMMARY
-- =============================================
--
-- Tables (35):
--   security:          audit_log, login_attempts
--   identity:          users
--   course_authoring:  categories, courses, course_tags, chapters, lessons,
--                      sections, lesson_attachments, lesson_assignments
--   course_management: course_versions
--   learning_delivery: learning_classes, enrollments, student_lesson_progress
--   assessment:        packages, questions, question_options, quizzes,
--                      quiz_questions, quiz_attempts, quiz_assignments,
--                      assignments, assignment_submissions, assignment_attachments,
--                      assignment_rubrics, assignment_allocations,
--                      assignment_allocation_students
--   communication:     conversations, messages
--   ai_assistant:      chat_sessions, chat_messages
--   shared:            file_attachments, outbox_messages
--
-- Index Types:
--   B-tree:  60+ indexes on FKs, status columns, common query patterns
--   Partial: 9 indexes on status-filtered queries (50-80% smaller)
--   BRIN:    6 indexes on time-series columns (100x smaller than B-tree)
--   GIN:     12 indexes on JSONB + trigram full-text search
--
-- Triggers:
--   updated_at: 18 tables with auto-timestamp
--   audit:      4 critical tables (courses, users, enrollments, submissions)
--
-- Materialized Views:
--   mv_course_stats:         Admin analytics dashboard
--   mv_teacher_performance:  Teacher KPI dashboard
--
-- Extensions:
--   pgcrypto:  UUID generation, password hashing
--   pg_trgm:   Trigram similarity for full-text search
--
-- =============================================
-- END OF SCHEMA
-- =============================================
