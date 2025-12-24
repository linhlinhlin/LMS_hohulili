-- Migration V1002: Fix assignment type constraints and normalize data
-- Drop the old constraint that is causing "violates check constraint assignments_type_check"
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_type_check;

-- Ensure we don't have a legacy 'type' column interfering (referenced in V1001)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assignments' AND column_name='type') THEN
        ALTER TABLE assignments ALTER COLUMN type DROP NOT NULL;
    END IF;
END $$;

-- Update existing data to uppercase to match Java Enum AssignmentType
-- This ensures 'file_submission' becomes 'FILE_SUBMISSION', etc.
UPDATE assignments 
SET assignment_type = UPPER(assignment_type) 
WHERE assignment_type IS NOT NULL;

-- Add a fresh, comprehensive constraint with all current types from AssignmentType enum
ALTER TABLE assignments ADD CONSTRAINT assignments_type_check 
CHECK (assignment_type IN ('ESSAY', 'QUIZ', 'PROGRAMMING', 'PROJECT', 'FILE_SUBMISSION'));

-- Add comment to clarify the purpose of the column
COMMENT ON COLUMN assignments.assignment_type IS 'Type of assignment: ESSAY, QUIZ, PROGRAMMING, PROJECT, FILE_SUBMISSION (Uppercase to match Java Enum)';
