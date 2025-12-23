-- V27: Ensure course_id column exists in learning_classes table
-- This is a safety migration in case V25 or V26 failed partially

-- Step 1: Add course_id column if missing
ALTER TABLE learning_classes ADD COLUMN IF NOT EXISTS course_id UUID;

-- Step 2: Add foreign key if not exists (PostgreSQL 9.6+)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_course'
    ) THEN
        ALTER TABLE learning_classes 
        ADD CONSTRAINT fk_class_course 
        FOREIGN KEY (course_id) REFERENCES courses(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Constraint already exists, ignore
END $$;
