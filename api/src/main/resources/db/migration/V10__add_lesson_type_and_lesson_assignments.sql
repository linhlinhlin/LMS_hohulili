-- Migration V10: Add lesson_type and lesson-assignment relationship
-- Following Approach 3: Integrate assignments as a special type of lesson

-- Add lesson_type column to lessons table
ALTER TABLE lessons ADD COLUMN lesson_type VARCHAR(20) DEFAULT 'LECTURE';

-- Add comment for lesson_type
COMMENT ON COLUMN lessons.lesson_type IS 'Type of lesson: LECTURE, ASSIGNMENT, QUIZ';

-- Drop existing lesson_assignments table if it exists (from V7)
DROP TABLE IF EXISTS lesson_assignments;

-- Create lesson_assignments bridge table for 1-1 relationship between lessons and assignments
CREATE TABLE lesson_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lesson_id), -- One lesson can only have one assignment
    UNIQUE(assignment_id) -- One assignment can only belong to one lesson
);

-- Add indexes for performance
CREATE INDEX idx_lesson_assignments_lesson_id ON lesson_assignments(lesson_id);
CREATE INDEX idx_lesson_assignments_assignment_id ON lesson_assignments(assignment_id);

-- Add comment
COMMENT ON TABLE lesson_assignments IS 'Bridge table linking lessons to assignments for assignment-type lessons';