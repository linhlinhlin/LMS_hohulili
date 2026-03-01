-- Per-user token expiry override (nullable = use org default)
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expiry_days INT;
-- App-layer validates: 1 <= user.tokenExpiryDays <= org.tokenExpiryDays

-- Raise org token expiry max from 730 to 1095 (maritime crews at sea up to 3 years)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_refresh_token_expiry;
ALTER TABLE organizations ADD CONSTRAINT chk_refresh_token_expiry
    CHECK (refresh_token_expiry_days >= 7 AND refresh_token_expiry_days <= 1095);
