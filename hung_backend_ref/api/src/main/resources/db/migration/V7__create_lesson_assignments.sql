-- V7: Create lesson_assignments table to assign a lesson to specific students

CREATE TABLE IF NOT EXISTS lesson_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson ON lesson_assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_student ON lesson_assignments(student_id);
