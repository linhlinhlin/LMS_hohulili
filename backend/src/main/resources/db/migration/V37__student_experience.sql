-- V37: Student Experience - Course Reviews, Certificates, thumbnail_url
-- Created: 2026-02-08

-- ================================================
-- 1. Course Reviews table
-- ================================================
CREATE TABLE IF NOT EXISTS course_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_student ON course_reviews(student_id);

-- ================================================
-- 2. Certificates table
-- ================================================
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL UNIQUE REFERENCES enrollments(id),
    student_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    verification_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    issued_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_token ON certificates(verification_token);

-- ================================================
-- 3. Add thumbnail_url to courses (missing column)
-- ================================================
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);
