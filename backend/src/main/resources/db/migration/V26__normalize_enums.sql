-- V26: Normalize all enum values to UPPERCASE for JPA compatibility
-- This migration ensures database enum values match Java enum expectations
-- Safe version: Only runs if tables exist

-- =====================================================
-- COURSES TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courses') THEN
        UPDATE courses SET status = 'DRAFT' WHERE LOWER(status) = 'draft' AND status != 'DRAFT';
        UPDATE courses SET status = 'PENDING' WHERE LOWER(status) = 'pending' AND status != 'PENDING';
        UPDATE courses SET status = 'APPROVED' WHERE LOWER(status) = 'approved' AND status != 'APPROVED';
        UPDATE courses SET status = 'REJECTED' WHERE LOWER(status) = 'rejected' AND status != 'REJECTED';
        UPDATE courses SET status = 'PUBLISHED' WHERE LOWER(status) = 'published' AND status != 'PUBLISHED';
        UPDATE courses SET status = 'ARCHIVED' WHERE LOWER(status) = 'archived' AND status != 'ARCHIVED';

        -- Normalize visibility
        UPDATE courses SET visibility = 'PUBLIC' WHERE LOWER(visibility) = 'public' AND visibility != 'PUBLIC';
        UPDATE courses SET visibility = 'PRIVATE' WHERE LOWER(visibility) = 'private' AND visibility != 'PRIVATE';
        UPDATE courses SET visibility = 'UNLISTED' WHERE LOWER(visibility) = 'unlisted' AND visibility != 'UNLISTED';

        -- Normalize price_type
        UPDATE courses SET price_type = 'FREE' WHERE LOWER(price_type) = 'free' AND price_type != 'FREE';
        UPDATE courses SET price_type = 'PAID' WHERE LOWER(price_type) = 'paid' AND price_type != 'PAID';
        UPDATE courses SET price_type = 'SUBSCRIPTION' WHERE LOWER(price_type) = 'subscription' AND price_type != 'SUBSCRIPTION';
    END IF;
END $$;

-- =====================================================
-- USERS TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        UPDATE users SET role = 'ADMIN' WHERE LOWER(role) = 'admin' AND role != 'ADMIN';
        UPDATE users SET role = 'TEACHER' WHERE LOWER(role) = 'teacher' AND role != 'TEACHER';
        UPDATE users SET role = 'STUDENT' WHERE LOWER(role) = 'student' AND role != 'STUDENT';
    END IF;
END $$;

-- =====================================================
-- ENROLLMENTS TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'enrollments') THEN
        UPDATE enrollments SET status = 'ACTIVE' WHERE LOWER(status) = 'active' AND status != 'ACTIVE';
        UPDATE enrollments SET status = 'COMPLETED' WHERE LOWER(status) = 'completed' AND status != 'COMPLETED';
        UPDATE enrollments SET status = 'DROPPED' WHERE LOWER(status) = 'dropped' AND status != 'DROPPED';
        UPDATE enrollments SET status = 'SUSPENDED' WHERE LOWER(status) = 'suspended' AND status != 'SUSPENDED';
    END IF;
END $$;

-- =====================================================
-- LEARNING_CLASSES TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learning_classes') THEN
        UPDATE learning_classes SET status = 'OPEN' WHERE LOWER(status) IN ('active', 'open') AND status NOT IN ('OPEN');
        UPDATE learning_classes SET status = 'CLOSED' WHERE LOWER(status) = 'closed' AND status != 'CLOSED';
        UPDATE learning_classes SET status = 'ARCHIVED' WHERE LOWER(status) IN ('draft', 'archived') AND status != 'ARCHIVED';
        UPDATE learning_classes SET status = 'CANCELLED' WHERE LOWER(status) = 'cancelled' AND status != 'CANCELLED';
    END IF;
END $$;

-- =====================================================
-- ASSIGNMENTS TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assignments') THEN
        UPDATE assignments SET type = 'FILE_UPLOAD' WHERE LOWER(type) IN ('file_submission', 'file_upload') AND type NOT IN ('FILE_UPLOAD');
        UPDATE assignments SET type = 'ESSAY' WHERE LOWER(type) = 'essay' AND type != 'ESSAY';
        UPDATE assignments SET type = 'QUIZ' WHERE LOWER(type) = 'quiz' AND type != 'QUIZ';
        UPDATE assignments SET type = 'PROJECT' WHERE LOWER(type) = 'project' AND type != 'PROJECT';

        UPDATE assignments SET status = 'DRAFT' WHERE LOWER(status) = 'draft' AND status != 'DRAFT';
        UPDATE assignments SET status = 'PUBLISHED' WHERE LOWER(status) = 'published' AND status != 'PUBLISHED';
        UPDATE assignments SET status = 'CLOSED' WHERE LOWER(status) = 'closed' AND status != 'CLOSED';
    END IF;
END $$;

-- =====================================================
-- ASSIGNMENT_SUBMISSIONS TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assignment_submissions') THEN
        UPDATE assignment_submissions SET status = 'PENDING' WHERE LOWER(status) = 'pending' AND status != 'PENDING';
        UPDATE assignment_submissions SET status = 'SUBMITTED' WHERE LOWER(status) = 'submitted' AND status != 'SUBMITTED';
        UPDATE assignment_submissions SET status = 'GRADED' WHERE LOWER(status) = 'graded' AND status != 'GRADED';
        UPDATE assignment_submissions SET status = 'LATE' WHERE LOWER(status) = 'late' AND status != 'LATE';
    END IF;
END $$;

-- =====================================================
-- LESSONS TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lessons') THEN
        UPDATE lessons SET lesson_type = 'LECTURE' WHERE LOWER(lesson_type) = 'lecture' AND lesson_type != 'LECTURE';
        UPDATE lessons SET lesson_type = 'ASSIGNMENT' WHERE LOWER(lesson_type) = 'assignment' AND lesson_type != 'ASSIGNMENT';
        UPDATE lessons SET lesson_type = 'QUIZ' WHERE LOWER(lesson_type) = 'quiz' AND lesson_type != 'QUIZ';
        UPDATE lessons SET lesson_type = 'VIDEO' WHERE LOWER(lesson_type) = 'video' AND lesson_type != 'VIDEO';
    END IF;
END $$;

-- =====================================================
-- QUIZZES TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quizzes') THEN
        UPDATE quizzes SET status = 'DRAFT' WHERE LOWER(status) = 'draft' AND status != 'DRAFT';
        UPDATE quizzes SET status = 'PUBLISHED' WHERE LOWER(status) = 'published' AND status != 'PUBLISHED';
        UPDATE quizzes SET status = 'ARCHIVED' WHERE LOWER(status) = 'archived' AND status != 'ARCHIVED';
    END IF;
END $$;

-- =====================================================
-- QUESTIONS TABLE (only if exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'questions') THEN
        UPDATE questions SET status = 'DRAFT' WHERE LOWER(status) = 'draft' AND status != 'DRAFT';
        UPDATE questions SET status = 'ACTIVE' WHERE LOWER(status) = 'active' AND status != 'ACTIVE';
        UPDATE questions SET status = 'ARCHIVED' WHERE LOWER(status) = 'archived' AND status != 'ARCHIVED';

        UPDATE questions SET difficulty = 'EASY' WHERE LOWER(difficulty) = 'easy' AND difficulty != 'EASY';
        UPDATE questions SET difficulty = 'MEDIUM' WHERE LOWER(difficulty) = 'medium' AND difficulty != 'MEDIUM';
        UPDATE questions SET difficulty = 'HARD' WHERE LOWER(difficulty) = 'hard' AND difficulty != 'HARD';
    END IF;
END $$;
