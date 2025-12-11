-- Update existing lessons that are in lesson_assignments to have lessonType = 'ASSIGNMENT'
UPDATE lessons l
SET lesson_type = 'ASSIGNMENT'
WHERE EXISTS (
  SELECT 1 
  FROM lesson_assignments la 
  WHERE la.lesson_id = l.id
);

-- Create lessons for standalone assignments that don't have an associated lesson
WITH new_lessons AS (
    INSERT INTO lessons (section_id, title, content, lesson_type, created_at, updated_at)
    SELECT 
        s.id as section_id,
        a.title,
        a.description as content,
        'ASSIGNMENT' as lesson_type,
        a.created_at,
        a.updated_at
    FROM assignments a
    LEFT JOIN lesson_assignments la ON la.assignment_id = a.id
    LEFT JOIN lessons l ON l.id = la.lesson_id
    JOIN sections s ON s.course_id = a.course_id
    WHERE la.id IS NULL
    RETURNING id
)

-- Link the newly created lessons to their assignments
INSERT INTO lesson_assignments (lesson_id, assignment_id)
SELECT l.id, a.id
FROM assignments a
JOIN sections s ON s.course_id = a.course_id
JOIN lessons l ON l.section_id = s.id 
    AND l.title = a.title 
    AND l.lesson_type = 'ASSIGNMENT'
LEFT JOIN lesson_assignments la ON la.assignment_id = a.id
WHERE la.id IS NULL;

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_type ON lessons(lesson_type);