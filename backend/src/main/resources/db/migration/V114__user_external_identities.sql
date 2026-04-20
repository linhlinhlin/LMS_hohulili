CREATE TABLE IF NOT EXISTS user_external_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    external_subject VARCHAR(255) NOT NULL,
    email_at_link VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_external_identities_provider_subject
    ON user_external_identities (provider, external_subject);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_external_identities_user_provider
    ON user_external_identities (user_id, provider);

CREATE INDEX IF NOT EXISTS idx_user_external_identities_user_id
    ON user_external_identities (user_id);
