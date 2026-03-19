CREATE TABLE IF NOT EXISTS video_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_attachment_id UUID NOT NULL REFERENCES file_attachments(id) ON DELETE RESTRICT,
    source_storage_key VARCHAR(500) NOT NULL,
    source_file_url TEXT NOT NULL,
    original_file_name VARCHAR(500) NOT NULL,
    content_type VARCHAR(150) NOT NULL,
    source_file_size BIGINT NOT NULL,
    source_kind VARCHAR(50) NOT NULL DEFAULT 'INTERNAL_UPLOAD',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    stream_video_uid VARCHAR(255),
    playback_url TEXT,
    duration_seconds INTEGER,
    width INTEGER,
    height INTEGER,
    error_message TEXT,
    processing_started_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_assets_source_attachment_id
    ON video_assets (source_attachment_id);

CREATE INDEX IF NOT EXISTS idx_video_assets_owner_id
    ON video_assets (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_assets_status
    ON video_assets (status, created_at ASC);

CREATE TABLE IF NOT EXISTS video_renditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_asset_id UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    playback_kind VARCHAR(30) NOT NULL,
    profile VARCHAR(30) NOT NULL,
    actual_resolution VARCHAR(30),
    file_size_bytes BIGINT,
    storage_key VARCHAR(500),
    file_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_renditions_asset_profile
    ON video_renditions (video_asset_id, profile);

CREATE INDEX IF NOT EXISTS idx_video_renditions_asset_status
    ON video_renditions (video_asset_id, status);

CREATE TABLE IF NOT EXISTS video_ingest_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_asset_id UUID NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_ingest_jobs_asset_id
    ON video_ingest_jobs (video_asset_id);

CREATE INDEX IF NOT EXISTS idx_video_ingest_jobs_status_next_run
    ON video_ingest_jobs (status, next_run_at ASC);
