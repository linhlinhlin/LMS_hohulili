-- Migration V14: Update lesson_type column comment to include QUIZ type
-- Note: lesson_type is a VARCHAR column, not an ENUM, so it already supports any value including 'QUIZ'

-- Update comment to clarify that QUIZ is now a valid lesson type
COMMENT ON COLUMN lessons.lesson_type IS 'Type of lesson: LECTURE (Bài giảng), ASSIGNMENT (Bài tập), QUIZ (Trắc nghiệm)';
