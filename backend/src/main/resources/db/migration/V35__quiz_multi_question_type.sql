-- V35: Multi-question-type support for quiz/assessment system
-- Adds question_type enum and answer_key JSONB to questions table.
-- Backward compatible: all existing questions default to SINGLE_CHOICE.
--
-- Reference: Canvas LMS (13 types), Moodle (18+ types), IMS QTI 3.0 standard.
-- Phase 1: 6 question types (SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE,
--          FILL_IN_BLANK, SHORT_ANSWER, ESSAY)

-- 1. Add question_type column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'question_type'
    ) THEN
        ALTER TABLE questions
            ADD COLUMN question_type VARCHAR(30) NOT NULL DEFAULT 'SINGLE_CHOICE'
                CHECK (question_type IN (
                    'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE',
                    'FILL_IN_BLANK', 'SHORT_ANSWER', 'ESSAY'
                ));

        COMMENT ON COLUMN questions.question_type IS
            'Question type: determines rendering, answer format, and grading strategy';
    END IF;
END $$;

-- 2. Add answer_key JSONB column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'answer_key'
    ) THEN
        ALTER TABLE questions
            ADD COLUMN answer_key JSONB;

        COMMENT ON COLUMN questions.answer_key IS
            'Flexible answer key (JSONB). Format varies by question_type:
             SINGLE_CHOICE: {"correctOption": "A"}
             MULTIPLE_CHOICE: {"correctOptions": ["A", "C"]}
             TRUE_FALSE: {"correctOption": "TRUE"}
             FILL_IN_BLANK: {"acceptedAnswers": ["ans1", "ans2"], "caseSensitive": false}
             SHORT_ANSWER: {"acceptedAnswers": ["answer"], "caseSensitive": false}
             ESSAY: {"rubric": "...", "maxScore": 10}';
    END IF;
END $$;

-- 3. Make correct_option nullable (it's now optional when answer_key is used)
DO $$
BEGIN
    -- Check if column is currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'correct_option' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE questions ALTER COLUMN correct_option DROP NOT NULL;
    END IF;
END $$;

-- 4. Migrate existing data: populate answer_key from correct_option for existing questions
UPDATE questions
SET answer_key = jsonb_build_object('correctOption', correct_option)
WHERE answer_key IS NULL AND correct_option IS NOT NULL;

-- 5. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON questions (question_type);
CREATE INDEX IF NOT EXISTS idx_questions_answer_key ON questions USING GIN (answer_key);
