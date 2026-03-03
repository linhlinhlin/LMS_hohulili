-- V71: Rename course tags element collection table to avoid conflict with V70 controlled vocabulary
-- V70 created 'course_tags' as controlled vocabulary (id, name, slug, created_at)
-- The @ElementCollection in CourseJpaEntity needs a separate table for freeform tags

-- Create the new element collection table
CREATE TABLE IF NOT EXISTS course_embedded_tags (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tag_name  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_course_embedded_tags_course ON course_embedded_tags(course_id);
