-- Prevent duplicate VideoAssets for the same source attachment (race condition guard)
CREATE UNIQUE INDEX IF NOT EXISTS uq_video_assets_source_attachment
    ON video_assets (source_attachment_id)
    WHERE source_attachment_id IS NOT NULL;
