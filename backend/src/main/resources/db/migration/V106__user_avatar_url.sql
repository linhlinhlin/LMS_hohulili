-- V106: Add avatar_url to users table for profile photo support
-- Uses presigned upload flow (same as course thumbnails)

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

COMMENT ON COLUMN users.avatar_url IS 'URL ảnh đại diện (presigned upload to R2/S3)';
