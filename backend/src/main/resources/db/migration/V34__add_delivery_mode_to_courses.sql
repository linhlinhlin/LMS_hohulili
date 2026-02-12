-- V34: Add delivery_mode column to courses table
-- Supports dual-mode course architecture:
--   SELF_PACED: Online course (Coursera-like), no class management
--   INSTRUCTOR_LED: University-style with classes, assignments, gradebook
--
-- Default: SELF_PACED (backward compatible - all existing courses remain self-paced)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'delivery_mode'
    ) THEN
        ALTER TABLE courses
            ADD COLUMN delivery_mode VARCHAR(20) NOT NULL DEFAULT 'SELF_PACED'
                CHECK (delivery_mode IN ('SELF_PACED', 'INSTRUCTOR_LED'));

        COMMENT ON COLUMN courses.delivery_mode IS
            'Course delivery mode: SELF_PACED (online, no classes) or INSTRUCTOR_LED (university-style with classes, assignments, gradebook)';
    END IF;
END $$;

-- Index for filtering by delivery mode (useful for catalog queries)
CREATE INDEX IF NOT EXISTS idx_courses_delivery_mode ON courses (delivery_mode);
