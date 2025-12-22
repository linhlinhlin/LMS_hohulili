-- V28: SOTA Performance Indexes (Dec 2025)
-- Reference: Google/Amazon database optimization patterns
-- Based on actual schema from SQL team (schema.md - 2025-12-21)

-- =============================================
-- COURSES TABLE INDEXES
-- =============================================
-- Index for course queries by teacher
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);

-- Index for course status filtering (draft, published, etc.)
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Index for course category filtering
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);

-- =============================================
-- CHAPTERS & LESSONS TABLE INDEXES
-- =============================================
-- Index for chapter ordering within courses
CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);

-- Index for lesson ordering within chapters
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);

-- =============================================
-- ENROLLMENTS TABLE INDEXES
-- Note: enrollments uses class_id + student_id (NOT user_id + course_id)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);

-- =============================================
-- LEARNING CLASSES TABLE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_learning_classes_course_id ON learning_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_classes_teacher_id ON learning_classes(teacher_id);

-- =============================================
-- STUDENT LESSON PROGRESS TABLE INDEXES
-- Table name is student_lesson_progress (NOT lesson_progress)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_student_id ON student_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_lesson_id ON student_lesson_progress(lesson_id);

-- =============================================
-- USERS TABLE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- ASSIGNMENT & QUIZ SYSTEM INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
