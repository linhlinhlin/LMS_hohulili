-- V50: Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_verification_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_verification_token_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_token_expires ON email_verification_tokens(expires_at);
