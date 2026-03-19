CREATE TABLE IF NOT EXISTS client_offline_storage_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    availability VARCHAR(30) NOT NULL,
    recovery_action VARCHAR(30) NOT NULL DEFAULT 'none',
    db_name VARCHAR(255) NOT NULL,
    requires_redownload BOOLEAN NOT NULL DEFAULT FALSE,
    error_name VARCHAR(255),
    error_message TEXT,
    route VARCHAR(1024),
    user_agent TEXT,
    platform VARCHAR(255),
    connection_type VARCHAR(64),
    occurred_at TIMESTAMPTZ NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_offline_storage_telemetry_created_at
    ON client_offline_storage_telemetry (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_offline_storage_telemetry_user_id
    ON client_offline_storage_telemetry (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_offline_storage_telemetry_event_type
    ON client_offline_storage_telemetry (event_type, created_at DESC);
