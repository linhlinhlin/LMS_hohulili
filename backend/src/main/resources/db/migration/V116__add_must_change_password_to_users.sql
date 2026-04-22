-- Add must_change_password flag so admins can force users to change their password on first login.
-- Default FALSE so existing users are unaffected.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
