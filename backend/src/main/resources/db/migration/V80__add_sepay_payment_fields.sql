-- V80: Add SePay payment gateway fields
-- SePay is a Vietnamese bank QR transfer payment gateway (sepay.vn)

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS sepay_transaction_code VARCHAR(100);

COMMENT ON COLUMN payment_transactions.sepay_transaction_code IS 'SePay transaction code returned in webhook (e.g. MBVCB.3800004456...)';
