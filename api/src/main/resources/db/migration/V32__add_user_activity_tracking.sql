-- V32: Add user activity tracking fields
-- Adds last_login and login_count to users table for admin dashboard analytics

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Add index for efficient querying by last login (for "recently active" filters)
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC NULLS LAST);

COMMENT ON COLUMN users.last_login IS 'Timestamp of the last successful login';
COMMENT ON COLUMN users.login_count IS 'Total number of successful logins';
