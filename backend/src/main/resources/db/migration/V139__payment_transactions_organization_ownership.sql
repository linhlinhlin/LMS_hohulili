-- V139: Tenant ownership for payment transactions.
--
-- Payment admin/refund previously scoped ORG_ADMIN through course/teacher relationships.
-- Store the organization snapshot directly on each transaction for stable financial audit.

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE payment_transactions pt
SET organization_id = c.organization_id
FROM courses c
WHERE c.id = pt.course_id
  AND pt.organization_id IS NULL;

UPDATE payment_transactions pt
SET organization_id = u.organization_id
FROM courses c
JOIN users u ON u.id = c.teacher_id
WHERE c.id = pt.course_id
  AND pt.organization_id IS NULL;

UPDATE payment_transactions
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_payment_transactions_organization'
          AND conrelid = 'payment_transactions'::regclass
    ) THEN
        ALTER TABLE payment_transactions
            ADD CONSTRAINT fk_payment_transactions_organization
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'payment_transactions'
          AND column_name = 'organization_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE payment_transactions ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization_status_created
    ON payment_transactions(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization_paid_at
    ON payment_transactions(organization_id, paid_at DESC);
