-- Migration V3: Create course content structure (sections, lessons, assignments, submissions)

-- Create Sections table (phần/chương trong khóa học)
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE, 
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create Lessons table (bài học trong từng section)
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE, 
    title VARCHAR(255) NOT NULL,
    content TEXT,
    video_url VARCHAR(500),
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create Assignments table (bài tập)
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE, 
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMP,
    max_score DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create Submissions table (bài nộp của học viên)
-- CREATE TABLE submissions (
--     id VARCHAR(36) PRIMARY KEY,
--     assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
--     student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     content TEXT NOT NULL,
--     file_url VARCHAR(500),
--     submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     score DECIMAL(5,2),
--     feedback TEXT,
--     graded_at TIMESTAMP,
--     graded_by VARCHAR(36) REFERENCES users(id),
--     UNIQUE(assignment_id, student_id)
-- );

-- Create indexes for performance
CREATE INDEX idx_sections_course_id ON sections(course_id);
CREATE INDEX idx_sections_order ON sections(course_id, order_index);
CREATE INDEX idx_lessons_section_id ON lessons(section_id);
CREATE INDEX idx_lessons_order ON lessons(section_id, order_index);
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
-- CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
-- CREATE INDEX idx_submissions_student_id ON submissions(student_id);
-- CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- Insert sample sections for JAVA101 course
INSERT INTO sections (course_id, title, description, order_index)
SELECT c.id, 'Giới thiệu Java', 'Tổng quan về ngôn ngữ lập trình Java', 1
FROM courses c WHERE c.code = 'JAVA101';

INSERT INTO sections (course_id, title, description, order_index)
SELECT c.id, 'Cú pháp cơ bản', 'Biến, kiểu dữ liệu, toán tử', 2
FROM courses c WHERE c.code = 'JAVA101';

-- Insert sample lessons
INSERT INTO lessons (section_id, title, content, duration_minutes, order_index)
SELECT s.id, 'Cài đặt môi trường Java', 'Hướng dẫn cài đặt JDK và IDE', 30, 1
FROM sections s JOIN courses c ON s.course_id = c.id 
WHERE c.code = 'JAVA101' AND s.title = 'Giới thiệu Java';

INSERT INTO lessons (section_id, title, content, duration_minutes, order_index)
SELECT s.id, 'Hello World program', 'Viết chương trình Java đầu tiên', 20, 2
FROM sections s JOIN courses c ON s.course_id = c.id 
WHERE c.code = 'JAVA101' AND s.title = 'Giới thiệu Java';

-- Insert sample assignment
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT c.id, 'Bài tập 1: Hello World', 'Viết chương trình in ra "Hello World"', 
       CURRENT_TIMESTAMP + INTERVAL '7 days', 10.00
FROM courses c WHERE c.code = 'JAVA101';