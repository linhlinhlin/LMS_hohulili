-- V47: VNPay-specific columns on payment_transactions
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS vnp_transaction_no VARCHAR(50);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS vnp_bank_code VARCHAR(20);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS vnp_response_code VARCHAR(5);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS vnp_card_type VARCHAR(20);
