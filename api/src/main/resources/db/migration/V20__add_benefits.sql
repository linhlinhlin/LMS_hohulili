-- Add remaining missing columns to courses table (benefits added in V20)

ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id UUID;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_information TEXT;
-- benefits is in V20
ALTER TABLE courses ADD COLUMN IF NOT EXISTS intro_video_url VARCHAR(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS credits INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS visibility VARCHAR(255) DEFAULT 'PUBLIC';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price_type VARCHAR(255) DEFAULT 'FREE';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price DECIMAL(19, 2);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sale_price DECIMAL(19, 2);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS review_comment TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reviewed_by_id UUID;

-- Create course_tags table
CREATE TABLE IF NOT EXISTS course_tags (
    course_id UUID NOT NULL,
    tag_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Create course_teaching_staff table
CREATE TABLE IF NOT EXISTS course_teaching_staff (
    course_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
