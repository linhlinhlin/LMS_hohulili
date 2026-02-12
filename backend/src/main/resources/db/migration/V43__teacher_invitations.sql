-- V43: Teacher invitation system for co-teaching collaboration
CREATE TABLE IF NOT EXISTS teacher_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    invited_by_id UUID NOT NULL REFERENCES users(id),
    invited_teacher_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    message TEXT,
    -- Permissions
    can_edit_content BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_students BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_analytics BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_settings BOOLEAN NOT NULL DEFAULT FALSE,
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    responded_at TIMESTAMP,
    UNIQUE(course_id, invited_teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_invitations_invited ON teacher_invitations(invited_teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_course ON teacher_invitations(course_id);
