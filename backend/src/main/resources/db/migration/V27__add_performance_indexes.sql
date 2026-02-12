-- V2: Add missing indexes for foreign key columns
-- This migration improves query performance for JOIN operations
-- Date: 2026-02-05

-- =====================================================
-- ENROLLMENTS TABLE - Most critical for student queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON enrollments(student_id, status);

-- =====================================================
-- LEARNING_CLASSES TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_learning_classes_course_id ON learning_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_classes_teacher_id ON learning_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_learning_classes_status ON learning_classes(status);

-- =====================================================
-- CHAPTERS TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(course_id, order_index);

-- =====================================================
-- LESSONS TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(chapter_id, order_index);

-- =====================================================
-- QUIZZES TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);

-- =====================================================
-- QUIZ_ATTEMPTS TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);

-- Composite for common lookup
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz ON quiz_attempts(student_id, quiz_id);

-- =====================================================
-- QUESTIONS TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

-- =====================================================
-- ASSIGNMENTS TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- =====================================================
-- ASSIGNMENT_SUBMISSIONS TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);

-- =====================================================
-- COURSES TABLE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
