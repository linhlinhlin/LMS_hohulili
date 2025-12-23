-- V30: Add account_status column to users table
-- Purpose: Allow admins to manage user account status (ACTIVE, BLOCKED, RESTRICTED)

-- Add account_status column
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'ACTIVE';

-- Add status_reason column for storing the reason for blocking/restriction  
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason VARCHAR(500);

-- Create index for fast filtering by status
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Update existing users to have ACTIVE status
UPDATE users SET account_status = 'ACTIVE' WHERE account_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.account_status IS 'User account status: ACTIVE, BLOCKED, RESTRICTED';
COMMENT ON COLUMN users.status_reason IS 'Reason for blocking or restricting the account';
