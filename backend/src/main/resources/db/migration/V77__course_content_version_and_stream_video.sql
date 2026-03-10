-- Phase 2: Smart Cleanup + Cloudflare Stream prep
-- content_version: Auto-incremented on course content changes (chapter/lesson CRUD)
-- stream_video_uid: Cloudflare Stream video UID for multi-quality transcoding

ALTER TABLE courses ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS stream_video_uid VARCHAR(255);

COMMENT ON COLUMN courses.content_version IS 'Incremented on course content changes (chapter/lesson CRUD). Used by PWA to detect stale offline content.';
COMMENT ON COLUMN lessons.stream_video_uid IS 'Cloudflare Stream video UID for multi-quality video transcoding (Phase 2).';
