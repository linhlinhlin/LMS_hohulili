-- V61: Add missing indexes on payment_transactions for admin listing and teacher revenue queries

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_course_id ON payment_transactions(course_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paid_at ON payment_transactions(paid_at);
