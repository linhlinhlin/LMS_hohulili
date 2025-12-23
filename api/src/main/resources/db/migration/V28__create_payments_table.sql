-- V28: Create payments table for course payment tracking
-- Logic: 
--   - COMPLETED status = full course access
--   - PENDING/FAILED = only first 2 lessons accessible

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount DECIMAL(19,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notes VARCHAR(500),
    
    -- Each student can only have one payment record per course
    CONSTRAINT uq_payments_student_course UNIQUE(student_id, course_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Comment for documentation
COMMENT ON TABLE payments IS 'Course payment records - tracks which students have paid for which courses';
COMMENT ON COLUMN payments.status IS 'PENDING, COMPLETED, FAILED, REFUNDED';
