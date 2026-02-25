-- V49: Student notes for course learning
CREATE TABLE IF NOT EXISTS student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    lesson_id UUID REFERENCES lessons(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user_course ON student_notes(user_id, course_id);
CREATE INDEX idx_notes_user ON student_notes(user_id);
