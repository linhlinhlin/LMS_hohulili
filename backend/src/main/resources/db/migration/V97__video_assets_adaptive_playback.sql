ALTER TABLE video_assets
    ADD COLUMN IF NOT EXISTS adaptive_packaging_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS hls_manifest_storage_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS dash_manifest_storage_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS adaptive_packaged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS adaptive_error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_video_assets_adaptive_status
    ON video_assets (adaptive_packaging_status, updated_at DESC);
