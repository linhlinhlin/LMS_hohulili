-- V103: Diversify quiz_type for seed quizzes
-- "Thi cuoi khoa" quizzes → EXAM (final exams)
UPDATE quizzes SET quiz_type = 'EXAM'
WHERE title = 'Thi cuoi khoa' AND status = 'PUBLISHED';

-- A few "Kiem tra chuong" quizzes → PRACTICE (chapter practice)
UPDATE quizzes SET quiz_type = 'PRACTICE'
WHERE id IN (
    SELECT id FROM quizzes
    WHERE title LIKE 'Kiem tra chuong%' AND status = 'PUBLISHED'
    ORDER BY title
    LIMIT 3
);

-- Remaining "Kiem tra chuong" stay as ASSESSMENT (graded quizzes)
-- "Quiz theo lop" stays as ASSESSMENT (class-assigned quiz)
