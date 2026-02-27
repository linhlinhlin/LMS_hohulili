-- V60: Add refund tracking fields to payment_transactions
-- Required by Vietnamese Consumer Protection Law 19/2023/QH15 for remote transactions
-- Policy: 7-day window, <30% completion, no certificate issued

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'NONE';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMP;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS refund_admin_note TEXT;

-- Add EXPIRED status support for payment expiry cleanup
COMMENT ON COLUMN payment_transactions.refund_status IS 'NONE, REQUESTED, APPROVED, PROCESSING, COMPLETED, DENIED';
