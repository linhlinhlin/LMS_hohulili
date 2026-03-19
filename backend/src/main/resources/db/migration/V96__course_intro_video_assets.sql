ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS intro_video_asset_id UUID REFERENCES video_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_intro_video_asset_id
    ON courses (intro_video_asset_id);
