-- V56: Ensure default test accounts exist on production
-- Production baseline V53 skips V1/V40/V44 which create these accounts
-- Idempotent: ON CONFLICT DO UPDATE to fix stale password hashes

INSERT INTO users (id, username, email, password, full_name, role, enabled, created_at)
VALUES
  (gen_random_uuid(), 'admin', 'admin@maritime.edu',
   '$2a$10$eOcX7tyUKBCRnhy0ana3d.XGRbGf/GqzdV9PRLylB.nG2rn9Sab32',
   'Admin User', 'ADMIN', true, NOW()),
  (gen_random_uuid(), 'orgadmin', 'orgadmin@maritime.edu',
   '$2a$10$0SYY4C5mj0Wp7DZAcNGqRehLI8DbQajklOCgz0W7YuJW2kOI/Atfq',
   'Chuyên viên Quản lý', 'ORG_ADMIN', true, NOW()),
  (gen_random_uuid(), 'teacher', 'teacher@maritime.edu',
   '$2a$10$bV6u8f17qGr3vCVVPqTO.eMopGoVjqk1Im5JWEatHwUAYUeIRJvJy',
   'Teacher User', 'TEACHER', true, NOW()),
  (gen_random_uuid(), 'student', 'student@maritime.edu',
   '$2a$10$dq4UWzGO7AJM8Z46qQwkl.Ki5SFXlwqmE16cGGD08H1J8E1pSYldC',
   'Student User', 'STUDENT', true, NOW())
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;
