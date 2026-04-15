-- =====================================================================
-- V100: Class Teachers — co-teacher assignment at class level
-- Pattern: Google Classroom / Canvas LMS section-level teacher assignment
-- =====================================================================

CREATE TABLE IF NOT EXISTS class_teachers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id        UUID NOT NULL REFERENCES learning_classes(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'CO_TEACHER',  -- PRIMARY, CO_TEACHER
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_class_teacher UNIQUE (class_id, teacher_id)
);

CREATE INDEX idx_class_teachers_class ON class_teachers(class_id);
CREATE INDEX idx_class_teachers_teacher ON class_teachers(teacher_id);

-- Backfill: insert PRIMARY teacher for all existing classes that have a teacher_id
INSERT INTO class_teachers (class_id, teacher_id, role)
SELECT id, teacher_id, 'PRIMARY'
FROM learning_classes
WHERE teacher_id IS NOT NULL
ON CONFLICT (class_id, teacher_id) DO NOTHING;
