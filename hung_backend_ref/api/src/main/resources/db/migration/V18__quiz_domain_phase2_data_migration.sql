-- ============================================
-- Phase 2: Data Migration
-- Populate new columns with data from existing records
-- ============================================
-- 1. Update existing quizzes with default values
UPDATE quizzes
SET 
    type = 'LESSON_QUIZ',
    title = COALESCE(
        (SELECT l.title FROM lessons l WHERE l.id = quizzes.lesson_id),
        'Quiz'
    ),
    description = 'Migrated from legacy quiz',
    created_by = (
        SELECT c.teacher_id 
        FROM lessons l 
        JOIN sections s ON l.section_id = s.id 
        JOIN courses c ON s.course_id = c.id 
        WHERE l.id = quizzes.lesson_id
    )
WHERE type IS NULL OR type = 'LESSON_QUIZ';
-- 2. Set published_at for existing quizzes (assume all are published)
UPDATE quizzes
SET published_at = created_at
WHERE published_at IS NULL;
-- 3. Migrate existing quiz_attempts to use assignment_id (if needed)
-- Note: This is optional since old attempts can work without assignment_id
-- Uncomment if you want to create retroactive assignments:
/*
INSERT INTO quiz_assignments (quiz_id, student_id, assigned_by, status, assigned_at, completed_at)
SELECT DISTINCT
    qa.quiz_id,
    qa.student_id,
    q.created_by,
    CASE 
        WHEN qa.status = 'SUBMITTED' THEN 'COMPLETED'
        WHEN qa.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
        ELSE 'ASSIGNED'
    END,
    MIN(qa.start_time),
    MAX(qa.end_time)
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
WHERE qa.assignment_id IS NULL
GROUP BY qa.quiz_id, qa.student_id, q.created_by, qa.status
ON CONFLICT (quiz_id, student_id) DO NOTHING;
-- Link attempts to assignments
UPDATE quiz_attempts qa
SET assignment_id = qas.id
FROM quiz_assignments qas
WHERE qa.quiz_id = qas.quiz_id
  AND qa.student_id = qas.student_id
  AND qa.assignment_id IS NULL;
*/
-- 4. Verify data integrity
DO $$
DECLARE
    quiz_count INTEGER;
    assignment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO quiz_count FROM quizzes WHERE type IS NULL;
    IF quiz_count > 0 THEN
        RAISE WARNING 'Found % quizzes with NULL type', quiz_count;
    END IF;
    
    SELECT COUNT(*) INTO assignment_count FROM quiz_assignments;
    RAISE NOTICE 'Created % quiz assignments', assignment_count;
END $$;