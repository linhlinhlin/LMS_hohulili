-- V74: Upload sessions table for presigned URL upload tracking
-- Tracks the lifecycle of presigned uploads: PENDING → CONFIRMED | EXPIRED

CREATE TABLE IF NOT EXISTS upload_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key   VARCHAR(500) NOT NULL,
    user_id       UUID NOT NULL REFERENCES users(id),
    content_type  VARCHAR(100) NOT NULL,
    declared_size BIGINT NOT NULL,
    folder        VARCHAR(100) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at  TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ
);

-- Index for cleanup scheduler: find expired PENDING sessions
CREATE INDEX idx_upload_sessions_expires ON upload_sessions(expires_at) WHERE status = 'PENDING';

-- Index for confirmUpload: lookup by key + user + status
CREATE INDEX idx_upload_sessions_key_user ON upload_sessions(storage_key, user_id, status);
