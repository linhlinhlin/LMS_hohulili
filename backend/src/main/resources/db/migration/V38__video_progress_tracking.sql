-- V38: Video progress with bitmap-based watched segments (Coursera/edX pattern)
CREATE TABLE IF NOT EXISTS video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID NOT NULL,
    section_id VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    watched_segments BYTEA,
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    progress_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    last_position DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, section_id)
);

CREATE INDEX idx_video_progress_student ON video_progress(student_id);
CREATE INDEX idx_video_progress_lesson ON video_progress(lesson_id);
CREATE INDEX idx_video_progress_student_lesson ON video_progress(student_id, lesson_id);

-- Learning events for analytics (lightweight xAPI)
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID NOT NULL,
    section_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_events_student ON learning_events(student_id);
CREATE INDEX idx_learning_events_type ON learning_events(event_type);
CREATE INDEX idx_learning_events_created ON learning_events(created_at);
