ALTER TABLE quizzes
    ADD COLUMN IF NOT EXISTS quiz_type VARCHAR(30) NOT NULL DEFAULT 'ASSESSMENT',
    ADD COLUMN IF NOT EXISTS counts_toward_certificate BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE quizzes
SET counts_toward_certificate = FALSE
WHERE quiz_type <> 'EXAM'
  AND counts_toward_certificate = TRUE;

ALTER TABLE quizzes
    DROP CONSTRAINT IF EXISTS quizzes_quiz_type_check;

ALTER TABLE quizzes
    ADD CONSTRAINT quizzes_quiz_type_check
        CHECK (quiz_type IN ('PRACTICE', 'ASSESSMENT', 'EXAM'));

ALTER TABLE quizzes
    DROP CONSTRAINT IF EXISTS quizzes_certificate_exam_check;

ALTER TABLE quizzes
    ADD CONSTRAINT quizzes_certificate_exam_check
        CHECK (NOT counts_toward_certificate OR quiz_type = 'EXAM');
