-- V44: Seed TEACHER and STUDENT test accounts
-- These accounts are required for development/testing
-- Uses ON CONFLICT DO NOTHING to be idempotent

-- TEACHER account: teacher@maritime.edu / teacher123
INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES (
    gen_random_uuid(),
    'teacher',
    'teacher@maritime.edu',
    '$2a$10$KgAFHytuuPUkN6Te.8X7puvHQ7e3rMfTFAuS50oKfKrZ9Gs54ZeBW',
    'Giảng viên Mẫu',
    'TEACHER',
    TRUE,
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- STUDENT account: student@maritime.edu / student123
INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES (
    gen_random_uuid(),
    'student',
    'student@maritime.edu',
    '$2a$10$53HVcz4vuYp8/h7I2R0HreO0SYJiLpRRkmv6CiR3txaNvsoiq3Oku',
    'Học viên Mẫu',
    'STUDENT',
    TRUE,
    NOW()
)
ON CONFLICT (email) DO NOTHING;
