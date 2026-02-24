-- V46: Password reset tokens table (OWASP pattern: separate table, SHA-256 hash, expiry)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reset_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_reset_token_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_token_expires ON password_reset_tokens(expires_at);
