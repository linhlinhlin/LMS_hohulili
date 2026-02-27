-- V63: Add partial index on refund_status for admin refund queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_refund_status
    ON payment_transactions(refund_status) WHERE refund_status != 'NONE';
