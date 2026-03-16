CREATE TABLE IF NOT EXISTS course_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    publication_number INTEGER NOT NULL,
    content_version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, publication_number)
);

CREATE INDEX IF NOT EXISTS idx_course_publications_course_id
    ON course_publications(course_id);

CREATE INDEX IF NOT EXISTS idx_course_publications_course_id_pub_no
    ON course_publications(course_id, publication_number DESC);

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS draft_change_status VARCHAR(32) NOT NULL DEFAULT 'NONE';

ALTER TABLE learning_classes
    ADD COLUMN IF NOT EXISTS version_mode VARCHAR(32) NOT NULL DEFAULT 'PINNED';
