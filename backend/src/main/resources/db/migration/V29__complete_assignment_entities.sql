-- V29: Complete skeleton assignment entities with proper columns
-- Safe: Uses IF NOT EXISTS / DO blocks

-- =====================================================
-- 1. assignment_submissions - Add missing columns
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'course_id') THEN
        ALTER TABLE assignment_submissions ADD COLUMN course_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'status') THEN
        ALTER TABLE assignment_submissions ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'DRAFT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'content') THEN
        ALTER TABLE assignment_submissions ADD COLUMN content TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'file_url') THEN
        ALTER TABLE assignment_submissions ADD COLUMN file_url VARCHAR(512);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'file_name') THEN
        ALTER TABLE assignment_submissions ADD COLUMN file_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'grade') THEN
        ALTER TABLE assignment_submissions ADD COLUMN grade DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'max_grade') THEN
        ALTER TABLE assignment_submissions ADD COLUMN max_grade DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'feedback') THEN
        ALTER TABLE assignment_submissions ADD COLUMN feedback TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'graded_by') THEN
        ALTER TABLE assignment_submissions ADD COLUMN graded_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'graded_at') THEN
        ALTER TABLE assignment_submissions ADD COLUMN graded_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_submissions' AND column_name = 'submitted_at') THEN
        ALTER TABLE assignment_submissions ADD COLUMN submitted_at TIMESTAMP;
    END IF;
END $$;

-- Unique constraint: one submission per student per assignment
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'uq_submission_assignment_student' AND table_name = 'assignment_submissions') THEN
        ALTER TABLE assignment_submissions ADD CONSTRAINT uq_submission_assignment_student
            UNIQUE (assignment_id, student_id);
    END IF;
END $$;

-- =====================================================
-- 2. assignment_attachments - Add missing columns
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'submission_id') THEN
        ALTER TABLE assignment_attachments ADD COLUMN submission_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'file_name') THEN
        ALTER TABLE assignment_attachments ADD COLUMN file_name VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'file_url') THEN
        ALTER TABLE assignment_attachments ADD COLUMN file_url VARCHAR(512) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'file_size') THEN
        ALTER TABLE assignment_attachments ADD COLUMN file_size BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'file_type') THEN
        ALTER TABLE assignment_attachments ADD COLUMN file_type VARCHAR(128);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'storage_key') THEN
        ALTER TABLE assignment_attachments ADD COLUMN storage_key VARCHAR(512);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'uploaded_by') THEN
        ALTER TABLE assignment_attachments ADD COLUMN uploaded_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_attachments' AND column_name = 'uploaded_at') THEN
        ALTER TABLE assignment_attachments ADD COLUMN uploaded_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 3. assignment_rubrics - Add missing columns
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_rubrics' AND column_name = 'title') THEN
        ALTER TABLE assignment_rubrics ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_rubrics' AND column_name = 'description') THEN
        ALTER TABLE assignment_rubrics ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_rubrics' AND column_name = 'max_points') THEN
        ALTER TABLE assignment_rubrics ADD COLUMN max_points DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_rubrics' AND column_name = 'criteria') THEN
        ALTER TABLE assignment_rubrics ADD COLUMN criteria JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_rubrics' AND column_name = 'created_at') THEN
        ALTER TABLE assignment_rubrics ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'assignment_rubrics' AND column_name = 'updated_at') THEN
        ALTER TABLE assignment_rubrics ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 4. Indexes for new columns
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_assignment_attachments_submission_id ON assignment_attachments(submission_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_assignment_id ON assignment_rubrics(assignment_id);
