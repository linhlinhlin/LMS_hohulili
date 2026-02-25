-- V56: Ensure default test accounts exist on production
-- Production baseline V53 skips V1/V40/V44 which create these accounts
-- Idempotent: ON CONFLICT DO NOTHING

INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES
  (gen_random_uuid(), 'admin', 'admin@maritime.edu',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Admin User', 'ADMIN', true, NOW()),
  (gen_random_uuid(), 'orgadmin', 'orgadmin@maritime.edu',
   '$2a$10$0SYY4C5mj0Wp7DZAcNGqRehLI8DbQajklOCgz0W7YuJW2kOI/Atfq',
   'Chuyên viên Quản lý', 'ORG_ADMIN', true, NOW()),
  (gen_random_uuid(), 'teacher', 'teacher@maritime.edu',
   '$2a$10$KgAFHytuuPUkN6Te.8X7puvHQ7e3rMfTFAuS50oKfKrZ9Gs54ZeBW',
   'Teacher User', 'TEACHER', true, NOW()),
  (gen_random_uuid(), 'student', 'student@maritime.edu',
   '$2a$10$53HVcz4vuYp8/h7I2R0HreO0SYJiLpRRkmv6CiR3txaNvsoiq3Oku',
   'Student User', 'STUDENT', true, NOW())
ON CONFLICT (email) DO NOTHING;
