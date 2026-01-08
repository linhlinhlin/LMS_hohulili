-- Migration to fix JSON formatting issues in Question and QuestionOption entities
-- 1. Clean up legacy data
DELETE FROM question_options;
DELETE FROM quiz_questions;
DELETE FROM questions;

-- 2. Alter Question Options to use JSONB
-- Note: 'questions' table already has 'content_blocks' (jsonb) column per schema, so we do not alter 'questions.content'.
-- We only alter 'question_options.content' to support rich text.
ALTER TABLE question_options 
  ALTER COLUMN content TYPE jsonb 
  USING NULLIF(content, '')::jsonb;
