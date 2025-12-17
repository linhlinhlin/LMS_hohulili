-- 1. Enable UUID extension if not enabled (usually standard)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the Learning Class table
CREATE TABLE IF NOT EXISTS learning_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    teacher_id UUID,
    course_version_id UUID, -- Snapshot of course content version
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    schedule_type VARCHAR(20) DEFAULT 'CUSTOM',
    semester VARCHAR(50),
    max_students INTEGER DEFAULT 9999,
    status VARCHAR(20) DEFAULT 'OPEN',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_class_course FOREIGN KEY (course_id) REFERENCES courses(id),
    CONSTRAINT fk_class_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 3. Create the new Enrollment entity table
-- Replacing the old Many-to-Many 'course_enrollments' join table with a full entity
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    class_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    progress JSONB, -- Storing lesson progress as JSON map
    completion_percent INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT fk_enrollment_class FOREIGN KEY (class_id) REFERENCES learning_classes(id),
    CONSTRAINT uq_student_class UNIQUE (student_id, class_id)
);

-- 4. DATA MIGRATION: Create Default Classes for existing courses
-- Only create if no classes exist for the course (avoid duplicates if script re-runs partial)
INSERT INTO learning_classes (id, course_id, teacher_id, course_version_id, name, code, created_at)
SELECT 
    gen_random_uuid(), 
    c.id, 
    c.teacher_id,
    (SELECT id FROM course_versions cv WHERE cv.course_id = c.id ORDER BY cv.version_number DESC LIMIT 1),
    'Lớp mặc định', 
    'DEF-' || substring(cast(c.id as text), 1, 8), -- Generate a simple code
    NOW()
FROM courses c
WHERE NOT EXISTS (SELECT 1 FROM learning_classes lc WHERE lc.course_id = c.id);

-- 5. DATA MIGRATION: Move old enrollments to new table
-- Assuming old table was 'course_enrollments(student_id, course_id)' based on User entity
INSERT INTO enrollments (student_id, class_id, enrolled_at)
SELECT 
    ce.student_id,
    lc.id,
    NOW() -- Migration timestamp
FROM course_enrollments ce
JOIN learning_classes lc ON ce.course_id = lc.course_id
WHERE lc.code LIKE 'DEF-%' -- Ensure we map to the default class we just created
ON CONFLICT (student_id, class_id) DO NOTHING;
