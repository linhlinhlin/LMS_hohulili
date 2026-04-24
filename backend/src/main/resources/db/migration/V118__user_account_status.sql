-- =============================================================================
-- V118__user_account_status.sql
-- Date: 2026-04-24
-- Purpose: Persist admin-facing account status (ACTIVE/BLOCKED/RESTRICTED)
--          plus free-text reason so the UI contract matches what the backend
--          actually stores. Until now the `/users/{id}/status` endpoint only
--          toggled the boolean `enabled` column, so RESTRICTED and `reason`
--          were UI illusions (issue #73).
-- Reference: https://github.com/linhlinhlin/LMS_hohulili/issues/73
-- =============================================================================

BEGIN;

-- 1) Add the new columns. Kept nullable-by-default-value to avoid touching
--    every INSERT path (most callers still use only `enabled`).
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(16);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- 2) Backfill from existing boolean: enabled=true → ACTIVE, enabled=false → BLOCKED.
--    RESTRICTED is admin-chosen going forward; no historical rows are assumed
--    to be RESTRICTED.
UPDATE users
   SET account_status = CASE
           WHEN enabled IS NULL OR enabled = TRUE THEN 'ACTIVE'
           ELSE 'BLOCKED'
       END
 WHERE account_status IS NULL;

-- 3) Lock the column to NOT NULL + constrained enum after backfill.
ALTER TABLE users
    ALTER COLUMN account_status SET NOT NULL,
    ALTER COLUMN account_status SET DEFAULT 'ACTIVE';

ALTER TABLE users
    ADD CONSTRAINT users_account_status_check
        CHECK (account_status IN ('ACTIVE', 'BLOCKED', 'RESTRICTED'));

-- 4) Optional index — admin list/filter may eventually query by status. Cheap
--    partial index on non-ACTIVE rows since ACTIVE is the common case.
CREATE INDEX IF NOT EXISTS idx_users_account_status_non_active
    ON users (account_status)
    WHERE account_status <> 'ACTIVE';

COMMIT;
