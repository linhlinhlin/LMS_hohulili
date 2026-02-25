-- V54.1: Production Schema Catch-Up
-- ==================================
-- Production baseline V53 skips V1-V53 migrations.
-- Production DB was created from V1 only (34 base tables).
-- This migration creates ALL missing objects from V26-V53.
-- 100% idempotent: IF NOT EXISTS / DO $$ blocks everywhere.

-- =============================================
-- 1. MISSING COLUMNS ON EXISTING TABLES
-- =============================================

-- V37: courses.thumbnail_url
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);

-- V35: questions.question_type + answer_key
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) NOT NULL DEFAULT 'SINGLE_CHOICE';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_key JSONB;

-- V35: questions.correct_option DROP NOT NULL (multi-type support: ESSAY, SHORT_ANSWER)
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'correct_option' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE questions ALTER COLUMN correct_option DROP NOT NULL;
    END IF;
END $$;

-- V36: questions.category_id
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category_id UUID;

-- V36: packages.bank_type, status, question_count
ALTER TABLE packages ADD COLUMN IF NOT EXISTS bank_type VARCHAR(20) DEFAULT 'PERSONAL';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;

-- V39: users.career_goal, daily_goal_minutes
ALTER TABLE users ADD COLUMN IF NOT EXISTS career_goal VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER DEFAULT 30;

-- V40: users.role CHECK to include ORG_ADMIN
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
                   AND conrelid = 'users'::regclass) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('ADMIN', 'ORG_ADMIN', 'TEACHER', 'STUDENT'));
    END IF;
END $$;

-- V41: assignment_rubrics.teacher_id + assignment_id nullable
ALTER TABLE assignment_rubrics ADD COLUMN IF NOT EXISTS teacher_id UUID;
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assignment_rubrics' AND column_name = 'assignment_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE assignment_rubrics ALTER COLUMN assignment_id DROP NOT NULL;
    END IF;
END $$;

-- V42: quiz_attempts.version (optimistic locking)
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- V47: payment_transactions VNPay columns (table created below, but IF NOT EXISTS safe)
-- Applied after table creation in section 2.

-- V51: quiz_attempts.is_passed
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS is_passed BOOLEAN;

-- V52: quizzes.available_from, due_at, lock_at
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS lock_at TIMESTAMPTZ;


-- =============================================
-- 2. MISSING TABLES (V31-V50)
-- =============================================

-- V31: payment_transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount            NUMERIC(19,2) NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'VND',
    payment_method    VARCHAR(50) NOT NULL DEFAULT 'SIMULATED',
    transaction_id    VARCHAR(255) UNIQUE NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vnp_transaction_no VARCHAR(50),
    vnp_bank_code     VARCHAR(20),
    vnp_response_code VARCHAR(5),
    vnp_card_type     VARCHAR(20),
    CONSTRAINT check_payment_amount CHECK (amount >= 0)
);

-- V31: course_reviews
CREATE TABLE IF NOT EXISTS course_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    CONSTRAINT uq_review_course_student UNIQUE (course_id, student_id)
);

-- V31: certificates
CREATE TABLE IF NOT EXISTS certificates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id       UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    verification_token  UUID UNIQUE DEFAULT gen_random_uuid(),
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cert_enrollment UNIQUE (enrollment_id)
);

-- V36: question_bank_categories
CREATE TABLE IF NOT EXISTS question_bank_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES question_bank_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- V38: video_progress
CREATE TABLE IF NOT EXISTS video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID NOT NULL,
    section_id VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    watched_segments BYTEA,
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    progress_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    last_position DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, section_id)
);

-- V38: learning_events
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID NOT NULL,
    section_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- V39: learning_streaks
CREATE TABLE IF NOT EXISTS learning_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES users(id),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    streak_frozen_until DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- V39: achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    threshold INTEGER NOT NULL DEFAULT 1
);

-- V39: student_achievements
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, achievement_id)
);

-- V39: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- V43: teacher_invitations
CREATE TABLE IF NOT EXISTS teacher_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    invited_by_id UUID NOT NULL REFERENCES users(id),
    invited_teacher_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    message TEXT,
    can_edit_content BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_students BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_analytics BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_settings BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    responded_at TIMESTAMP,
    UNIQUE(course_id, invited_teacher_id)
);

-- V45: ai_insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL,
    insight_type    VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ai_insights_user FOREIGN KEY (student_id) REFERENCES users(id)
);

-- V45: ai_alerts
CREATE TABLE IF NOT EXISTS ai_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID,
    alert_type      VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    student_ids     JSONB DEFAULT '[]',
    metadata        JSONB DEFAULT '{}',
    is_resolved     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ai_alerts_course FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- V46: password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reset_token_hash UNIQUE (token_hash)
);

-- V48: bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(1024) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, url)
);

-- V49: student_notes
CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    lesson_id UUID REFERENCES lessons(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- V50: email_verification_tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_verification_token_hash UNIQUE (token_hash)
);


-- =============================================
-- 3. MISSING FOREIGN KEY CONSTRAINTS
-- =============================================

-- V36: questions.category_id -> question_bank_categories
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_questions_category') THEN
        ALTER TABLE questions ADD CONSTRAINT fk_questions_category
            FOREIGN KEY (category_id) REFERENCES question_bank_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- V41: assignment_rubrics.teacher_id -> users
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rubrics_teacher') THEN
        ALTER TABLE assignment_rubrics ADD CONSTRAINT fk_rubrics_teacher
            FOREIGN KEY (teacher_id) REFERENCES users(id);
    END IF;
END $$;

-- V31: enrollments completion percent check
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_enrollment_completion') THEN
        ALTER TABLE enrollments ADD CONSTRAINT check_enrollment_completion
        CHECK (completion_percent >= 0 AND completion_percent <= 100);
    END IF;
END $$;


-- =============================================
-- 4. MISSING INDEXES
-- =============================================

-- V27: Performance indexes on FK columns
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_learning_classes_course_id ON learning_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_classes_teacher_id ON learning_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_learning_classes_status ON learning_classes(status);
CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz ON quiz_attempts(student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- V28: Additional indexes
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson_id ON lesson_attachments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_id ON quiz_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_lesson_id ON student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_course_id ON assignment_submissions(course_id);

-- V30: Communication/AI/allocation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_context_type ON chat_sessions(context_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_assignment_id ON assignment_allocations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_allocations_class_id ON assignment_allocations(class_id);
CREATE INDEX IF NOT EXISTS idx_allocation_students_allocation_id ON assignment_allocation_students(allocation_id);
CREATE INDEX IF NOT EXISTS idx_allocation_students_student_id ON assignment_allocation_students(student_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity_type_id ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);

-- V31: Payment/review/certificate indexes
CREATE INDEX IF NOT EXISTS idx_payment_student_course ON payment_transactions(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student ON course_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_certs_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certs_verify ON certificates(verification_token);

-- V34: Delivery mode index
CREATE INDEX IF NOT EXISTS idx_courses_delivery_mode ON courses(delivery_mode);

-- V35: Question type indexes
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_answer_key ON questions USING GIN (answer_key);

-- V36: Question bank indexes
CREATE INDEX IF NOT EXISTS idx_qbc_bank_id ON question_bank_categories(bank_id);
CREATE INDEX IF NOT EXISTS idx_qbc_parent_id ON question_bank_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_packages_bank_type ON packages(bank_type);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_owner_id ON packages(owner_id);

-- V37: Course review + certificate indexes (duplicates with V31, IF NOT EXISTS safe)
CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_student ON course_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_token ON certificates(verification_token);

-- V38: Video progress + learning events indexes
CREATE INDEX IF NOT EXISTS idx_video_progress_student ON video_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_lesson ON video_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_student_lesson ON video_progress(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_student ON learning_events(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);

-- V39: Gamification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_student ON learning_streaks(student_id);

-- V41: Rubric teacher index
CREATE INDEX IF NOT EXISTS idx_rubrics_teacher_id ON assignment_rubrics(teacher_id);

-- V43: Teacher invitation indexes
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_invited ON teacher_invitations(invited_teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_course ON teacher_invitations(course_id);

-- V45: AI indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_student_id ON ai_insights(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_course_id ON ai_alerts(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_type ON ai_alerts(alert_type);

-- V46: Password reset token indexes
CREATE INDEX IF NOT EXISTS idx_reset_token_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_token_expires ON password_reset_tokens(expires_at);

-- V48: Bookmark indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_course ON bookmarks(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

-- V49: Student notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_course ON student_notes(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON student_notes(user_id);

-- V50: Email verification token indexes
CREATE INDEX IF NOT EXISTS idx_verification_token_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_token_expires ON email_verification_tokens(expires_at);

-- V53: Quiz availability partial indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_available_from ON quizzes(available_from) WHERE available_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_lock_at ON quizzes(lock_at) WHERE lock_at IS NOT NULL;


-- =============================================
-- 5. MATERIALIZED VIEWS (from V1, skipped by baseline)
-- =============================================

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_course_stats_id ON mv_course_stats (course_id);

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


-- =============================================
-- 6. SEED DATA
-- =============================================

-- V39: Achievement definitions (gamification)
INSERT INTO achievements (id, code, name, description, icon, category, threshold) VALUES
    (gen_random_uuid(), 'STREAK_3',     'Kiên trì 3 ngày',     'Học liên tục 3 ngày',          'fire',    'STREAK',     3),
    (gen_random_uuid(), 'STREAK_7',     'Tuần lễ chăm chỉ',    'Học liên tục 7 ngày',          'fire',    'STREAK',     7),
    (gen_random_uuid(), 'STREAK_30',    'Siêu kiên trì',       'Học liên tục 30 ngày',         'fire',    'STREAK',     30),
    (gen_random_uuid(), 'COURSE_1',     'Khởi đầu',            'Hoàn thành khóa đầu tiên',     'book',    'COMPLETION', 1),
    (gen_random_uuid(), 'COURSE_5',     'Học giả',             'Hoàn thành 5 khóa học',        'book',    'COMPLETION', 5),
    (gen_random_uuid(), 'QUIZ_PERFECT', 'Hoàn hảo',            'Đạt 100% bài kiểm tra',       'star',    'QUIZ',       1),
    (gen_random_uuid(), 'TIME_10H',     'Cần cù',              'Học tổng cộng 10 giờ',         'clock',   'TIME',       10),
    (gen_random_uuid(), 'TIME_50H',     'Chuyên gia',          'Học tổng cộng 50 giờ',         'clock',   'TIME',       50),
    (gen_random_uuid(), 'FIRST_LESSON', 'Bước đầu tiên',       'Hoàn thành bài học đầu tiên',  'check',   'COMPLETION', 1)
ON CONFLICT (code) DO NOTHING;

-- V26: Normalize enum values to UPPERCASE (idempotent)
UPDATE courses SET status = UPPER(status) WHERE status <> UPPER(status);
UPDATE users SET role = UPPER(role) WHERE role <> UPPER(role);
UPDATE enrollments SET status = UPPER(status) WHERE status <> UPPER(status);
UPDATE learning_classes SET status = UPPER(status) WHERE status <> UPPER(status);
UPDATE assignments SET status = UPPER(status) WHERE status <> UPPER(status);
UPDATE assignment_submissions SET status = UPPER(status) WHERE status <> UPPER(status);
UPDATE quizzes SET status = UPPER(status) WHERE status <> UPPER(status);
UPDATE questions SET status = UPPER(status) WHERE status <> UPPER(status);
UPDATE questions SET difficulty = UPPER(difficulty) WHERE difficulty <> UPPER(difficulty);
