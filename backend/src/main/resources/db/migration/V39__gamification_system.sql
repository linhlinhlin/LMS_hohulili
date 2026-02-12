-- V39: Gamification & Notification System
-- Duolingo-inspired streaks, achievements, daily goals, notifications

-- Learning streaks
CREATE TABLE IF NOT EXISTS learning_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES users(id),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    streak_frozen_until DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    threshold INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, achievement_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_student_achievements_student ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_student ON learning_streaks(student_id);

-- Career goal & daily goal on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS career_goal VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER DEFAULT 30;

-- Seed achievements
INSERT INTO achievements (id, code, name, description, icon, category, threshold) VALUES
(gen_random_uuid(), 'STREAK_3', 'Hoc 3 ngay lien tiep', 'Hoan thanh muc tieu 3 ngay lien tiep', 'flame', 'STREAK', 3),
(gen_random_uuid(), 'STREAK_7', 'Tuan le cham chi', 'Hoc lien tiep 7 ngay', 'fire', 'STREAK', 7),
(gen_random_uuid(), 'STREAK_30', 'Thuy thu kien tri', 'Hoc lien tiep 30 ngay', 'trophy', 'STREAK', 30),
(gen_random_uuid(), 'COURSE_1', 'Khoi dau', 'Hoan thanh khoa hoc dau tien', 'star', 'COMPLETION', 1),
(gen_random_uuid(), 'COURSE_5', 'Si quan tap su', 'Hoan thanh 5 khoa hoc', 'anchor', 'COMPLETION', 5),
(gen_random_uuid(), 'QUIZ_PERFECT', 'Diem tuyet doi', 'Dat 100% trong mot bai quiz', 'bullseye', 'QUIZ', 100),
(gen_random_uuid(), 'TIME_10H', '10 gio hoc tap', 'Tich luy 10 gio hoc', 'clock', 'TIME', 600),
(gen_random_uuid(), 'TIME_50H', 'Nha hang hai', 'Tich luy 50 gio hoc', 'ship', 'TIME', 3000),
(gen_random_uuid(), 'FIRST_LESSON', 'Buoc chan dau tien', 'Hoan thanh bai hoc dau tien', 'footsteps', 'COMPLETION', 1)
ON CONFLICT (code) DO NOTHING;
