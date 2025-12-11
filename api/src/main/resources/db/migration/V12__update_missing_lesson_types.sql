-- Update all lessons that don't have a lessonType to be LECTURE by default
UPDATE lessons 
SET lesson_type = 'LECTURE' 
WHERE lesson_type IS NULL;

-- Update lessons that have assignments to be ASSIGNMENT type
UPDATE lessons l
SET lesson_type = 'ASSIGNMENT'
WHERE EXISTS (
    SELECT 1 FROM lesson_assignments la
    WHERE la.lesson_id = l.id
);