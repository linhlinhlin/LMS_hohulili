-- V101: Grading audit log for STCW compliance
-- Captures immutable grading events with old/new values and teacher identity snapshot.
-- Separate from generic audit_log (V1) which only tracks DB-level INSERT/UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS grading_audit_log (
    id                  BIGSERIAL       PRIMARY KEY,
    assignment_id       UUID            NOT NULL,
    submission_id       UUID            NOT NULL,
    student_id          UUID            NOT NULL,
    event_type          VARCHAR(50)     NOT NULL,
    graded_by           UUID            NOT NULL,
    graded_by_name      VARCHAR(255),
    old_grade           DOUBLE PRECISION,
    new_grade           DOUBLE PRECISION,
    old_feedback        TEXT,
    new_feedback        TEXT,
    occurred_at         TIMESTAMPTZ     NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_grading_event_type CHECK (event_type IN (
        'GRADE_CREATED', 'GRADE_UPDATED', 'FEEDBACK_ADDED',
        'RUBRIC_CHANGED', 'DEADLINE_EXTENDED', 'ASSIGNMENT_DISTRIBUTED'
    ))
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_grading_audit_assignment
    ON grading_audit_log(assignment_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_grading_audit_submission
    ON grading_audit_log(submission_id);

CREATE INDEX IF NOT EXISTS idx_grading_audit_student
    ON grading_audit_log(student_id, occurred_at DESC);
