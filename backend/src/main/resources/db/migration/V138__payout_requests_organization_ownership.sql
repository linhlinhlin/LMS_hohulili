-- V138: Tenant ownership for payout requests.
--
-- Historical payout scoping inferred organization via payout_requests.teacher_id -> users.organization_id.
-- Store the organization snapshot directly so ORG_ADMIN payout review remains stable if a teacher
-- later moves to another organization.

ALTER TABLE payout_requests
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE payout_requests pr
SET organization_id = u.organization_id
FROM users u
WHERE u.id = pr.teacher_id
  AND pr.organization_id IS NULL;

UPDATE payout_requests
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_payout_requests_organization'
          AND conrelid = 'payout_requests'::regclass
    ) THEN
        ALTER TABLE payout_requests
            ADD CONSTRAINT fk_payout_requests_organization
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'payout_requests'
          AND column_name = 'organization_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE payout_requests ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payout_requests_organization_status_requested
    ON payout_requests(organization_id, status, requested_at DESC);
