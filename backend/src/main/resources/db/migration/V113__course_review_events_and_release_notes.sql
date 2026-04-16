-- V113: Course review audit trail + publication release notes
-- Addresses Gap 1 (audit trail) and Gap 5 (release notes) from 2026-04-16 SOTA analysis

-- 1. Review event history table (replaces single-value storage on courses table)
CREATE TABLE course_review_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    reviewer_id     UUID REFERENCES users(id),
    action          VARCHAR(30) NOT NULL,  -- SUBMITTED, APPROVED, REJECTED, REVOKED, CHANGES_REQUESTED, RESUBMITTED
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_review_events_course_id ON course_review_events(course_id, created_at DESC);

-- 2. Release notes on publications
ALTER TABLE course_publications ADD COLUMN IF NOT EXISTS release_notes TEXT;

-- 3. Release notes on courses (teacher writes when submitting for review)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS pending_release_notes TEXT;
