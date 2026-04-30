-- V129: File attachment storage descriptor + FK references from consumer entities
--
-- Eliminates the orphan-cleanup bug at the schema level:
--   1. Adds storage descriptor columns (bucket_name, storage_key, sha256_hex, visibility, deleted_at).
--   2. Adds *_attachment_id FK from consumer entities (courses, users, assignment_submissions)
--      pointing to file_attachments(id) ON DELETE RESTRICT — Postgres now physically blocks
--      deletion of any file_attachment that is still referenced by an entity.
--   3. Backfills FK from existing entity_id linkage and from URL-equality match for
--      records that the V129-deploy code has not yet wired.
--
-- After this migration the cleanup scheduler's referential check (Phase 2.4) replaces the
-- date-based orphan query, removing the need for the PENDING_LINK_REVIEW sentinel.
--
-- Idempotent: safe to run multiple times. Adds nothing if columns/constraints exist.

-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Storage descriptor columns on file_attachments
-- ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE file_attachments
    ADD COLUMN IF NOT EXISTS bucket_name  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS storage_key  VARCHAR(500),
    ADD COLUMN IF NOT EXISTS sha256_hex   CHAR(64),
    ADD COLUMN IF NOT EXISTS visibility   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

-- Backfill bucket_name + storage_key from the legacy single-string columns.
-- For data uploaded under LocalStorage: bucket_name='local'.
-- For data already on R2 (URL contains cdn.holilihu.online or *.r2.dev): bucket_name='lms-cdn'.
-- For raw videos / adaptive segments: bucket_name='lms-storage'.
UPDATE file_attachments
SET bucket_name = CASE
        WHEN storage_path LIKE 'https://cdn.holilihu.online/%' THEN 'lms-cdn'
        WHEN storage_path LIKE 'https://%.r2.dev/%' THEN 'lms-cdn'
        WHEN file_category = 'VIDEO' THEN 'lms-storage'
        ELSE 'local'
    END,
    storage_key = CASE
        WHEN storage_path LIKE 'http%://%' THEN
            -- Strip the leading scheme + host from absolute URLs to recover the in-bucket key.
            regexp_replace(storage_path, '^https?://[^/]+/', '')
        ELSE storage_path
    END,
    visibility = CASE
        WHEN file_category IN ('VIDEO') THEN 'PRIVATE'
        ELSE 'PUBLIC'
    END
WHERE bucket_name IS NULL;

-- ───────────────────────────────────────────────────────────────────────────────
-- 2. FK columns on consumer entities — courses
-- ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS thumbnail_attachment_id  UUID,
    ADD COLUMN IF NOT EXISTS intro_video_attachment_id UUID;

-- Backfill from existing entity link (set by Phase 0c tactical SQL + Phase 1 hotfix).
UPDATE courses c
SET thumbnail_attachment_id = fa.id
FROM file_attachments fa
WHERE c.thumbnail_attachment_id IS NULL
  AND fa.entity_id = c.id
  AND fa.entity_type = 'COURSE'
  AND fa.file_category = 'COURSE_THUMBNAIL'
  AND fa.storage_path = c.thumbnail_url;

UPDATE courses c
SET intro_video_attachment_id = fa.id
FROM file_attachments fa
WHERE c.intro_video_attachment_id IS NULL
  AND fa.entity_id = c.id
  AND fa.entity_type = 'COURSE'
  AND fa.file_category = 'VIDEO'
  AND fa.storage_path = c.intro_video_url;

-- ───────────────────────────────────────────────────────────────────────────────
-- 3. FK columns on consumer entities — users
-- ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_attachment_id UUID;

UPDATE users u
SET avatar_attachment_id = fa.id
FROM file_attachments fa
WHERE u.avatar_attachment_id IS NULL
  AND fa.entity_id = u.id
  AND fa.entity_type = 'USER'
  AND fa.file_category = 'AVATAR'
  AND fa.storage_path = u.avatar_url;

-- ───────────────────────────────────────────────────────────────────────────────
-- 4. FK columns on consumer entities — assignment submissions
-- ───────────────────────────────────────────────────────────────────────────────
ALTER TABLE assignment_submissions
    ADD COLUMN IF NOT EXISTS file_attachment_id UUID;

UPDATE assignment_submissions s
SET file_attachment_id = fa.id
FROM file_attachments fa
WHERE s.file_attachment_id IS NULL
  AND fa.entity_id = s.id
  AND fa.entity_type = 'SUBMISSION'
  AND fa.storage_path = s.file_url;

-- ───────────────────────────────────────────────────────────────────────────────
-- 5. FK constraints — ON DELETE RESTRICT prevents accidental cleanup deletion
-- ───────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_courses_thumbnail_attachment') THEN
        ALTER TABLE courses
            ADD CONSTRAINT fk_courses_thumbnail_attachment
            FOREIGN KEY (thumbnail_attachment_id) REFERENCES file_attachments(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_courses_intro_video_attachment') THEN
        ALTER TABLE courses
            ADD CONSTRAINT fk_courses_intro_video_attachment
            FOREIGN KEY (intro_video_attachment_id) REFERENCES file_attachments(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_avatar_attachment') THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_avatar_attachment
            FOREIGN KEY (avatar_attachment_id) REFERENCES file_attachments(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_submissions_file_attachment') THEN
        ALTER TABLE assignment_submissions
            ADD CONSTRAINT fk_submissions_file_attachment
            FOREIGN KEY (file_attachment_id) REFERENCES file_attachments(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────────
-- 6. Indexes — speed up referential cleanup query (Phase 2.4)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_thumbnail_attachment      ON courses(thumbnail_attachment_id) WHERE thumbnail_attachment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_intro_video_attachment    ON courses(intro_video_attachment_id) WHERE intro_video_attachment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_avatar_attachment           ON users(avatar_attachment_id) WHERE avatar_attachment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_file_attachment       ON assignment_submissions(file_attachment_id) WHERE file_attachment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_file_attachments_storage_key      ON file_attachments(storage_key)  WHERE storage_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_attachments_sha256           ON file_attachments(sha256_hex)   WHERE sha256_hex IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_attachments_deleted          ON file_attachments(deleted_at)   WHERE deleted_at IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────────
-- 7. Optional: clean up the PENDING_LINK_REVIEW sentinel for records that we now have
--    a proper link for. Leave the rest tagged for future manual review.
-- ───────────────────────────────────────────────────────────────────────────────
UPDATE file_attachments fa
SET entity_id = (SELECT c.id FROM courses c WHERE c.thumbnail_attachment_id = fa.id LIMIT 1),
    entity_type = 'COURSE'
WHERE fa.entity_type = 'PENDING_LINK_REVIEW'
  AND EXISTS (SELECT 1 FROM courses c WHERE c.thumbnail_attachment_id = fa.id);

UPDATE file_attachments fa
SET entity_id = (SELECT c.id FROM courses c WHERE c.intro_video_attachment_id = fa.id LIMIT 1),
    entity_type = 'COURSE'
WHERE fa.entity_type = 'PENDING_LINK_REVIEW'
  AND EXISTS (SELECT 1 FROM courses c WHERE c.intro_video_attachment_id = fa.id);

UPDATE file_attachments fa
SET entity_id = (SELECT u.id FROM users u WHERE u.avatar_attachment_id = fa.id LIMIT 1),
    entity_type = 'USER'
WHERE fa.entity_type = 'PENDING_LINK_REVIEW'
  AND EXISTS (SELECT 1 FROM users u WHERE u.avatar_attachment_id = fa.id);

UPDATE file_attachments fa
SET entity_id = (SELECT s.id FROM assignment_submissions s WHERE s.file_attachment_id = fa.id LIMIT 1),
    entity_type = 'SUBMISSION'
WHERE fa.entity_type = 'PENDING_LINK_REVIEW'
  AND EXISTS (SELECT 1 FROM assignment_submissions s WHERE s.file_attachment_id = fa.id);
