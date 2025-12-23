-- V31: Create course_instructors table for teacher hierarchy
-- Purpose: Allow multiple instructors per course with different roles and permissions
-- 
-- Role types:
--   OWNER: Course creator, full control
--   CO_INSTRUCTOR: Invited teacher with limited permissions

CREATE TABLE IF NOT EXISTS course_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role and permissions
    role VARCHAR(20) NOT NULL DEFAULT 'CO_INSTRUCTOR',
    can_manage BOOLEAN DEFAULT FALSE,             -- Can edit course content
    can_view_performance BOOLEAN DEFAULT FALSE,   -- Can view analytics/grades
    is_visible BOOLEAN DEFAULT FALSE,             -- Show in course page
    can_grade_assignments BOOLEAN DEFAULT FALSE,  -- Can grade student work
    
    -- Revenue sharing
    revenue_share_percent INTEGER DEFAULT 0 CHECK (revenue_share_percent >= 0 AND revenue_share_percent <= 100),
    
    -- Invitation status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, REMOVED
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    
    -- Each user can only be instructor once per course
    CONSTRAINT uq_course_instructors_course_user UNIQUE(course_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_course_instructors_course ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_user ON course_instructors(user_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_status ON course_instructors(status);
CREATE INDEX IF NOT EXISTS idx_course_instructors_role ON course_instructors(role);

-- Documentation
COMMENT ON TABLE course_instructors IS 'Manages multiple instructors per course with roles and permissions';
COMMENT ON COLUMN course_instructors.role IS 'OWNER = course creator, CO_INSTRUCTOR = invited teacher';
COMMENT ON COLUMN course_instructors.status IS 'PENDING = awaiting acceptance, ACCEPTED = active, REJECTED = declined, REMOVED = removed by owner';
COMMENT ON COLUMN course_instructors.revenue_share_percent IS 'Percentage of course revenue shared with this instructor (0-100)';
