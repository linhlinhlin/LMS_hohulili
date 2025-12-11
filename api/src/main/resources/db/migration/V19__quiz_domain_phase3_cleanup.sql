-- ============================================
-- Phase 3: Cleanup and Constraints
-- Add NOT NULL constraints and remove deprecated columns
-- ONLY RUN AFTER NEW CODE IS DEPLOYED AND TESTED
-- ============================================
-- 1. Add NOT NULL constraints to new columns (now that data is populated)
ALTER TABLE quizzes
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN title SET NOT NULL,
ALTER COLUMN created_by SET NOT NULL;
-- 2. Add check constraint for quiz type
ALTER TABLE quizzes
ADD CONSTRAINT chk_quiz_type 
    CHECK (type IN ('LESSON_QUIZ', 'ASSIGNMENT'));
-- 3. Add check constraint: LESSON_QUIZ must have lesson_id
ALTER TABLE quizzes
ADD CONSTRAINT chk_lesson_quiz_has_lesson
    CHECK (
        (type = 'LESSON_QUIZ' AND lesson_id IS NOT NULL) OR
        (type = 'ASSIGNMENT' AND lesson_id IS NULL)
    );
-- 4. Add check constraint: ASSIGNMENT must have course_id
ALTER TABLE quizzes
ADD CONSTRAINT chk_assignment_has_course
    CHECK (
        (type = 'ASSIGNMENT' AND course_id IS NOT NULL) OR
        (type = 'LESSON_QUIZ' AND course_id IS NULL)
    );
-- 5. Add check constraint for assignment status
ALTER TABLE quiz_assignments
ADD CONSTRAINT chk_assignment_status
    CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'));
-- 6. Optional: Remove deprecated question_ids column (if fully migrated to quiz_questions)
-- ONLY UNCOMMENT AFTER VERIFYING ALL QUIZZES USE quiz_questions TABLE
-- ALTER TABLE quizzes DROP COLUMN IF EXISTS question_ids;
-- 7. Verify final state
DO $$
DECLARE
    invalid_quizzes INTEGER;
BEGIN
    -- Check for quizzes violating new constraints
    SELECT COUNT(*) INTO invalid_quizzes
    FROM quizzes
    WHERE (type = 'LESSON_QUIZ' AND lesson_id IS NULL)
       OR (type = 'ASSIGNMENT' AND course_id IS NULL);
    
    IF invalid_quizzes > 0 THEN
        RAISE EXCEPTION 'Found % quizzes violating type constraints', invalid_quizzes;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;