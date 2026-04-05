-- V100: Add access_password to quizzes table
-- Canvas/Moodle pattern: teacher sets an access code, students must enter it to start the quiz.
-- Even if the quiz is available and within the time window, students cannot start without the correct code.

ALTER TABLE quizzes
    ADD COLUMN IF NOT EXISTS access_password VARCHAR(50);

COMMENT ON COLUMN quizzes.access_password IS 'Optional access code students must enter before starting this quiz. NULL = no password required.';
