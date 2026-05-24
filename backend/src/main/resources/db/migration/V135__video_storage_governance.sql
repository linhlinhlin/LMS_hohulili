ALTER TABLE video_assets
    ADD COLUMN IF NOT EXISTS content_sha256 VARCHAR(64),
    ADD COLUMN IF NOT EXISTS content_fingerprint_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS duplicate_of_asset_id UUID REFERENCES video_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS package_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS storage_state VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS storage_deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS source_retained BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_video_assets_content_sha256
    ON video_assets (content_sha256)
    WHERE content_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_assets_duplicate_of_asset_id
    ON video_assets (duplicate_of_asset_id)
    WHERE duplicate_of_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_assets_storage_state
    ON video_assets (storage_state, updated_at DESC);
