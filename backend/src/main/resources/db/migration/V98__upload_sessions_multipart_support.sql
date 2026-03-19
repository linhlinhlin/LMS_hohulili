ALTER TABLE upload_sessions
    ADD COLUMN IF NOT EXISTS upload_strategy VARCHAR(20) NOT NULL DEFAULT 'SINGLE_PUT',
    ADD COLUMN IF NOT EXISTS multipart_upload_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS multipart_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_upload_sessions_strategy_status
    ON upload_sessions(upload_strategy, status);
