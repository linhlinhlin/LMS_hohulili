-- V41: Rubric library support
-- Allow rubrics to exist independently (not tied to an assignment)
-- Add teacher_id for rubric ownership

ALTER TABLE assignment_rubrics ADD COLUMN teacher_id UUID REFERENCES users(id);
ALTER TABLE assignment_rubrics ALTER COLUMN assignment_id DROP NOT NULL;
CREATE INDEX idx_rubrics_teacher_id ON assignment_rubrics(teacher_id);
