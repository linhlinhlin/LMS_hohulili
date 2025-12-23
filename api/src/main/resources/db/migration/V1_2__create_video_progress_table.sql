-- Video Progress Tracking Table
-- Tracks student's video viewing progress for 75% completion rule

CREATE TABLE IF NOT EXISTS video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    section_id UUID NOT NULL,
    video_url TEXT NOT NULL,
    
    -- Progress tracking
    current_time INTEGER DEFAULT 0,           -- Current playback position (seconds)
    duration INTEGER DEFAULT 0,               -- Total video duration (seconds)
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,  -- 0.00 - 100.00%
    
    -- Completion status
    completed BOOLEAN DEFAULT false,          -- true if progress >= 75%
    first_watched_at TIMESTAMP,              -- First time user watched
    last_watched_at TIMESTAMP,               -- Last update time
    completion_date TIMESTAMP,               -- Date when reached 75%
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT uk_user_section UNIQUE(user_id, section_id),
    CONSTRAINT fk_video_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_video_progress_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    CONSTRAINT chk_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT chk_time_positive CHECK (current_time >= 0 AND duration >= 0)
);

-- Indexes for performance
CREATE INDEX idx_video_progress_user ON video_progress(user_id);
CREATE INDEX idx_video_progress_section ON video_progress(section_id);
CREATE INDEX idx_video_progress_completed ON video_progress(completed);
CREATE INDEX idx_video_progress_last_watched ON video_progress(last_watched_at DESC);

-- Comments
COMMENT ON TABLE video_progress IS 'Tracks student video viewing progress for learning control';
COMMENT ON COLUMN video_progress.progress_percentage IS 'Calculated as (current_time / duration) * 100';
COMMENT ON COLUMN video_progress.completed IS 'Set to true when progress_percentage >= 75.0';
