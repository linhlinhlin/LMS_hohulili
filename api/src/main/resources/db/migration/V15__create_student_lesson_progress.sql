    -- Migration V15: Create student lesson progress table
    -- This table tracks individual student's progress on lessons

    -- Create stu_lesson_progress table
    CREATE TABLE stu_lesson_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        time_spent_minutes INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        -- Ensure one progress record per student-lesson pair
        UNIQUE(student_id, lesson_id)
    );

    -- Create indexes for performance
    CREATE INDEX idx_stu_lesson_progress_student_id ON stu_lesson_progress(student_id);
    CREATE INDEX idx_stu_lesson_progress_lesson_id ON stu_lesson_progress(lesson_id);
    CREATE INDEX idx_stu_lesson_progress_status ON stu_lesson_progress(status);
    CREATE INDEX idx_stu_lesson_progress_completed_at ON stu_lesson_progress(completed_at);

    -- Create trigger to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_stu_lesson_progress_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_stu_lesson_progress_updated_at
        BEFORE UPDATE ON stu_lesson_progress
        FOR EACH ROW
        EXECUTE FUNCTION update_stu_lesson_progress_updated_at();

    -- Add comments
    COMMENT ON TABLE stu_lesson_progress IS 'Tracks individual student progress on lessons';
    COMMENT ON COLUMN stu_lesson_progress.status IS 'Progress status: NOT_STARTED, IN_PROGRESS, COMPLETED';
    COMMENT ON COLUMN stu_lesson_progress.started_at IS 'Timestamp when student first started the lesson';
    COMMENT ON COLUMN stu_lesson_progress.completed_at IS 'Timestamp when lesson was marked as completed';
    COMMENT ON COLUMN stu_lesson_progress.time_spent_minutes IS 'Optional tracking of time spent on lesson';