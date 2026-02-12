-- V40: Add ORG_ADMIN role for multi-tier admin system
-- ADMIN = System Admin (infrastructure, settings, destructive ops)
-- ORG_ADMIN = Organization Admin / Maritime Specialist (course review, user management, analytics)

-- 1. Widen users role CHECK constraint to include ORG_ADMIN
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN', 'ORG_ADMIN', 'TEACHER', 'STUDENT'));

-- 2. Seed ORG_ADMIN test account (password: orgadmin123)
-- BCrypt hash generated with BCryptPasswordEncoder (strength=10)
INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES (
    gen_random_uuid(),
    'orgadmin',
    'orgadmin@maritime.edu',
    '$2a$10$0SYY4C5mj0Wp7DZAcNGqRehLI8DbQajklOCgz0W7YuJW2kOI/Atfq',
    'Chuyên viên Quản lý',
    'ORG_ADMIN',
    TRUE,
    NOW()
)
ON CONFLICT (email) DO NOTHING;
