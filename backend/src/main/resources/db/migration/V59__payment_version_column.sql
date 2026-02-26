-- V59: Add version column for optimistic locking on payment_transactions
-- Prevents race conditions from concurrent VNPay IPN callbacks

ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
