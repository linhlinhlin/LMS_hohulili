-- =====================================================
-- LMS PAYMENT SYSTEM - FULL MIGRATION SCRIPT
-- Version: 1.0.0
-- Date: 2025-12-24
-- Database: PostgreSQL
-- =====================================================
-- IMPORTANT: Backup database before running this script!
-- Run each section separately and verify before proceeding
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: CREATE NEW TABLES
-- =====================================================

-- 1.1 Payment Refunds Table
CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    payment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    processed_by UUID,
    
    -- Refund Data
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    refund_type VARCHAR(20) DEFAULT 'FULL',
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING',
    rejection_reason TEXT,
    
    -- Gateway response
    gateway_refund_id VARCHAR(100),
    gateway_response JSONB,
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    -- Foreign Keys
    CONSTRAINT fk_refund_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    CONSTRAINT fk_refund_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_refund_processor FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE payment_refunds IS 'Payment refund requests and history';
COMMENT ON COLUMN payment_refunds.refund_type IS 'FULL or PARTIAL';
COMMENT ON COLUMN payment_refunds.status IS 'PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED';

-- 1.2 Payment Methods Configuration Table
CREATE TABLE IF NOT EXISTS payment_methods_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    method_code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url TEXT,
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    is_sandbox BOOLEAN DEFAULT false,
    
    -- Configuration (store encrypted in production)
    config_json JSONB,
    
    -- Limits
    min_amount DECIMAL(15, 2) DEFAULT 10000,
    max_amount DECIMAL(15, 2) DEFAULT 500000000,
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE payment_methods_config IS 'Payment gateway configuration';

-- =====================================================
-- STEP 2: EXTEND PAYMENTS TABLE
-- =====================================================

-- 2.1 Add enrollment reference
ALTER TABLE payments ADD COLUMN IF NOT EXISTS enrollment_id UUID;

-- 2.2 Add financial fields
ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'VND';

-- 2.3 Add gateway integration fields
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- 2.4 Add status reason
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- 2.5 Add expiration
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- 2.6 Add audit fields
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2.7 Rename payment_method column type if needed (optional)
-- The existing column is VARCHAR(50) which is compatible

-- =====================================================
-- STEP 3: EXTEND ENROLLMENTS TABLE
-- =====================================================

-- 3.1 Add payment tracking fields
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_id UUID;

-- =====================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- 4.1 Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_tx_id ON payments(gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON payments(gateway_order_id);

-- Unique constraint for gateway transactions (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_unique 
ON payments(payment_method, gateway_transaction_id) 
WHERE gateway_transaction_id IS NOT NULL;

-- 4.2 Refunds indexes
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON payment_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON payment_refunds(status);

-- 4.3 Enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_is_paid ON enrollments(is_paid);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_id ON enrollments(payment_id);

-- =====================================================
-- STEP 5: DATA MIGRATION
-- =====================================================

-- 5.1 Mark enrollments as paid for FREE courses
UPDATE enrollments e
SET is_paid = true, 
    paid_at = e.enrolled_at
FROM learning_classes lc
JOIN courses c ON lc.course_id = c.id
WHERE e.class_id = lc.id
  AND (c.price_type = 'FREE' OR c.price = 0 OR c.price IS NULL)
  AND e.is_paid = false;

-- 5.2 Mark enrollments as paid where payment already exists
UPDATE enrollments e
SET is_paid = true,
    paid_at = p.paid_at,
    payment_id = p.id
FROM payments p
WHERE p.student_id = e.student_id
  AND p.status = 'COMPLETED'
  AND e.is_paid = false
  AND EXISTS (
    SELECT 1 FROM learning_classes lc 
    WHERE lc.id = e.class_id 
    AND lc.course_id = p.course_id
  );

-- 5.3 Insert default payment methods
INSERT INTO payment_methods_config (method_code, display_name, description, is_enabled, is_sandbox, sort_order)
VALUES 
    ('VNPAY', 'VNPay', 'Thanh toán qua VNPay - Thẻ ATM, Visa, Mastercard', true, false, 1),
    ('ZALOPAY', 'ZaloPay', 'Thanh toán qua ví ZaloPay', true, false, 2),
    ('MOMO', 'MoMo', 'Thanh toán qua ví MoMo', true, false, 3),
    ('BANK_TRANSFER', 'Chuyển khoản ngân hàng', 'Chuyển khoản trực tiếp qua ngân hàng', true, false, 4),
    ('SIMULATED', 'Thanh toán giả lập', 'Chế độ test - chỉ dùng trong development', false, true, 99)
ON CONFLICT (method_code) DO NOTHING;

-- =====================================================
-- STEP 6: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- 6.1 Payments -> Enrollments FK (optional, may fail if data inconsistent)
-- ALTER TABLE payments 
-- ADD CONSTRAINT fk_payment_enrollment 
-- FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL;

-- 6.2 Enrollments -> Payments FK
-- ALTER TABLE enrollments
-- ADD CONSTRAINT fk_enrollment_payment
-- FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check new tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('payment_refunds', 'payment_methods_config');

-- Check new columns in payments
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'payments' ORDER BY ordinal_position;

-- Check new columns in enrollments
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'enrollments' 
AND column_name IN ('is_paid', 'paid_at', 'payment_id');

-- Check indexes created
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('payments', 'payment_refunds', 'enrollments')
AND indexname LIKE 'idx_%';

-- Check payment methods inserted
SELECT method_code, display_name, is_enabled FROM payment_methods_config ORDER BY sort_order;

-- Count enrollments marked as paid
SELECT 
    COUNT(*) as total_enrollments,
    SUM(CASE WHEN is_paid = true THEN 1 ELSE 0 END) as paid_enrollments,
    SUM(CASE WHEN is_paid = false THEN 1 ELSE 0 END) as unpaid_enrollments
FROM enrollments;

COMMIT;

-- =====================================================
-- ROLLBACK SCRIPT (Use in case of issues)
-- =====================================================
/*
BEGIN;

-- Remove columns from enrollments
ALTER TABLE enrollments DROP COLUMN IF EXISTS is_paid;
ALTER TABLE enrollments DROP COLUMN IF EXISTS paid_at;
ALTER TABLE enrollments DROP COLUMN IF EXISTS payment_id;

-- Remove columns from payments (keep backward compatible)
ALTER TABLE payments DROP COLUMN IF EXISTS enrollment_id;
ALTER TABLE payments DROP COLUMN IF EXISTS original_amount;
ALTER TABLE payments DROP COLUMN IF EXISTS currency;
ALTER TABLE payments DROP COLUMN IF EXISTS gateway_transaction_id;
ALTER TABLE payments DROP COLUMN IF EXISTS gateway_order_id;
ALTER TABLE payments DROP COLUMN IF EXISTS gateway_response;
ALTER TABLE payments DROP COLUMN IF EXISTS status_reason;
ALTER TABLE payments DROP COLUMN IF EXISTS expires_at;
ALTER TABLE payments DROP COLUMN IF EXISTS ip_address;
ALTER TABLE payments DROP COLUMN IF EXISTS user_agent;
ALTER TABLE payments DROP COLUMN IF EXISTS metadata;

-- Drop new tables
DROP TABLE IF EXISTS payment_refunds;
DROP TABLE IF EXISTS payment_methods_config;

COMMIT;
*/
