-- V26: Ensure course_id column exists in learning_classes table
-- This migration fixes the case where the column might be missing

-- Add course_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'learning_classes' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE learning_classes ADD COLUMN course_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE learning_classes 
        ADD CONSTRAINT fk_class_course 
        FOREIGN KEY (course_id) REFERENCES courses(id);
    END IF;
END $$;

-- Make course_id NOT NULL if there are no null values
-- First, update any null course_id values if possible
UPDATE learning_classes lc
SET course_id = (
    SELECT c.id FROM courses c LIMIT 1
)
WHERE lc.course_id IS NULL;

-- Now make it NOT NULL (only if all rows have values)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM learning_classes WHERE course_id IS NULL
    ) THEN
        ALTER TABLE learning_classes ALTER COLUMN course_id SET NOT NULL;
    END IF;
END $$;
