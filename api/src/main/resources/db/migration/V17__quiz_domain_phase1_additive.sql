-- ============================================
-- Phase 1: Additive Changes (Safe Migration)
-- Add new columns and tables without breaking existing code
-- ============================================
-- 1. Add new columns to quizzes table (all nullable for backward compatibility)
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'LESSON_QUIZ',
ADD COLUMN IF NOT EXISTS course_id UUID,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
-- 2. Add foreign key constraints for new columns
ALTER TABLE quizzes
ADD CONSTRAINT fk_quiz_course 
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_quiz_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
-- 3. Make lesson_id nullable (to support ASSIGNMENT type quizzes)
ALTER TABLE quizzes
ALTER COLUMN lesson_id DROP NOT NULL;
-- 4. Create quiz_assignments table (NEW aggregate)
CREATE TABLE IF NOT EXISTS quiz_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL,
    student_id UUID NOT NULL,
    assigned_by UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_assignment_quiz 
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_student 
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_assigned_by 
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraint: one assignment per quiz per student
    CONSTRAINT uq_quiz_student UNIQUE (quiz_id, student_id)
);
-- 5. Add assignment_id to quiz_attempts (nullable for backward compatibility)
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS assignment_id UUID;
ALTER TABLE quiz_attempts
ADD CONSTRAINT fk_attempt_assignment 
    FOREIGN KEY (assignment_id) REFERENCES quiz_assignments(id) ON DELETE CASCADE;
-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_type ON quizzes(type);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz ON quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student ON quiz_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_status ON quiz_assignments(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_assignment ON quiz_attempts(assignment_id);
-- 7. Add comments for documentation
COMMENT ON COLUMN quizzes.type IS 'LESSON_QUIZ or ASSIGNMENT';
COMMENT ON COLUMN quizzes.course_id IS 'Only for ASSIGNMENT type quizzes';
COMMENT ON COLUMN quizzes.lesson_id IS 'Only for LESSON_QUIZ type quizzes (now nullable)';
COMMENT ON TABLE quiz_assignments IS 'Aggregate root for quiz assignment lifecycle';