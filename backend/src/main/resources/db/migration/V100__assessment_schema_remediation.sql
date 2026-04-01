-- V100: Assessment module schema remediation
-- Fixes: DB-C1 (duplicate FK conflict), TIMESTAMP→TIMESTAMPTZ, missing FK, performance indexes
-- Safe: Uses IF EXISTS / IF NOT EXISTS patterns

-- =====================================================
-- 1. DB-C1: Drop duplicate CASCADE FK on assignments.course_id
--    V1 created fk_assignments_course with ON DELETE SET NULL
--    V28 added fk_assignments_course_id with ON DELETE CASCADE (conflict!)
--    CASCADE wins on delete → assignments lost instead of SET NULL
-- =====================================================
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS fk_assignments_course_id;

-- =====================================================
-- 2. Fix TIMESTAMP → TIMESTAMPTZ for timezone-aware columns
--    V29 used TIMESTAMP (without timezone) for graded_at, submitted_at
-- =====================================================
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assignment_submissions'
          AND column_name = 'graded_at'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE assignment_submissions
            ALTER COLUMN graded_at TYPE TIMESTAMPTZ USING graded_at AT TIME ZONE 'UTC';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assignment_submissions'
          AND column_name = 'submitted_at'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE assignment_submissions
            ALTER COLUMN submitted_at TYPE TIMESTAMPTZ USING submitted_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- =====================================================
-- 3. Add missing FK on assignment_submissions.course_id
--    V29 added column but no FK constraint
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_submissions_course'
                     AND table_name = 'assignment_submissions') THEN
        ALTER TABLE assignment_submissions ADD CONSTRAINT fk_submissions_course
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 4. Performance indexes for common query patterns
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_submissions_status_assignment
    ON assignment_submissions(status, assignment_id);

CREATE INDEX IF NOT EXISTS idx_submissions_course_status
    ON assignment_submissions(course_id, status)
    WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_status_due_date
    ON assignments(due_date)
    WHERE status = 'PUBLISHED' AND due_date IS NOT NULL;
