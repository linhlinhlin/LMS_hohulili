-- V29: Create teacher revenue and payout tables
-- Purpose: Track teacher earnings from course sales and manage payout requests
-- Revenue Model (Udemy-style):
--   - REFERRAL (coupon/direct link): Teacher 97%, Platform 3%
--   - ORGANIC (marketplace): Teacher 70%, Platform 30%

-- ============================================================
-- Table: teacher_revenues
-- Tracks revenue generated from each payment for the course teacher
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_revenues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Financial amounts
    gross_amount DECIMAL(19,2) NOT NULL,   -- Original payment amount
    platform_fee DECIMAL(19,2) NOT NULL,   -- Platform commission
    net_amount DECIMAL(19,2) NOT NULL,     -- Amount teacher receives
    
    -- Revenue classification
    sale_type VARCHAR(20) NOT NULL DEFAULT 'ORGANIC',  -- 'REFERRAL' | 'ORGANIC'
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',     -- 'PENDING' | 'AVAILABLE' | 'PAID_OUT'
    
    -- Timing
    available_at TIMESTAMP,              -- When revenue becomes available (after hold period)
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Each payment can only generate one revenue record
    CONSTRAINT uq_teacher_revenues_payment UNIQUE(payment_id)
);

-- ============================================================
-- Table: teacher_payouts
-- Manages payout requests from teachers and approval workflow
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id),  -- Admin who approved/rejected
    
    -- Financial
    amount DECIMAL(19,2) NOT NULL,
    
    -- Status workflow: REQUESTED -> APPROVED/REJECTED -> PROCESSING -> COMPLETED
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    
    -- Payout method
    payout_method VARCHAR(50) NOT NULL,  -- 'BANK_TRANSFER' | 'PAYPAL' | 'MOMO'
    
    -- Timing
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Additional info
    notes TEXT,
    rejection_reason TEXT
);

-- ============================================================
-- Indexes for fast lookups
-- ============================================================

-- teacher_revenues indexes
CREATE INDEX IF NOT EXISTS idx_teacher_revenues_teacher ON teacher_revenues(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_revenues_status ON teacher_revenues(status);
CREATE INDEX IF NOT EXISTS idx_teacher_revenues_teacher_status ON teacher_revenues(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_revenues_available_at ON teacher_revenues(available_at);

-- teacher_payouts indexes
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_teacher ON teacher_payouts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_status ON teacher_payouts(status);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_requested_at ON teacher_payouts(requested_at);

-- ============================================================
-- Documentation comments
-- ============================================================
COMMENT ON TABLE teacher_revenues IS 'Tracks teacher earnings from course sales. Each payment generates one revenue record.';
COMMENT ON COLUMN teacher_revenues.sale_type IS 'REFERRAL = teacher promoted (97% share), ORGANIC = marketplace sale (70% share)';
COMMENT ON COLUMN teacher_revenues.status IS 'PENDING = hold period, AVAILABLE = ready for payout, PAID_OUT = included in a payout';
COMMENT ON COLUMN teacher_revenues.available_at IS 'Revenue becomes available 30 days after payment for refund protection';

COMMENT ON TABLE teacher_payouts IS 'Payout requests from teachers, requiring admin approval before processing';
COMMENT ON COLUMN teacher_payouts.status IS 'REQUESTED -> APPROVED/REJECTED -> PROCESSING -> COMPLETED';
COMMENT ON COLUMN teacher_payouts.payout_method IS 'BANK_TRANSFER, PAYPAL, MOMO, etc.';
