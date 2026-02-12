-- V31: Student MVP enhancements
-- Adds payment_transactions, course_reviews, and certificates tables

-- 1. Payment transactions table (replaces in-memory HashMap)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount            NUMERIC(19,2) NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'VND',
    payment_method    VARCHAR(50) NOT NULL DEFAULT 'SIMULATED',
    transaction_id    VARCHAR(255) UNIQUE NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_payment_amount CHECK (amount >= 0)
);
CREATE INDEX IF NOT EXISTS idx_payment_student_course ON payment_transactions(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_id ON payment_transactions(transaction_id);

-- 2. Course reviews table
CREATE TABLE IF NOT EXISTS course_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    CONSTRAINT uq_review_course_student UNIQUE (course_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student ON course_reviews(student_id);

-- 3. Certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id       UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    verification_token  UUID UNIQUE DEFAULT gen_random_uuid(),
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cert_enrollment UNIQUE (enrollment_id)
);
CREATE INDEX IF NOT EXISTS idx_certs_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certs_verify ON certificates(verification_token);

-- 4. Add CHECK constraint on enrollments completion_percent (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_enrollment_completion') THEN
        ALTER TABLE enrollments ADD CONSTRAINT check_enrollment_completion
        CHECK (completion_percent >= 0 AND completion_percent <= 100);
    END IF;
END $$;
