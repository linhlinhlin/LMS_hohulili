-- V152: Payment audit snapshot for organization-scoped learning package enrollments.
--
-- Learning-package tuition is separate from the existing course-centric payment_transactions
-- ledger. Snapshot the payable amount on enrollment so package price changes do not rewrite
-- historical student obligations.

ALTER TABLE learning_package_enrollments
    ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(128),
    ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID;

UPDATE learning_package_enrollments e
SET payment_amount = COALESCE(e.payment_amount, p.price, 0),
    payment_currency = COALESCE(e.payment_currency, p.currency, 'VND')
FROM learning_packages p
WHERE p.id = e.package_id
  AND p.organization_id = e.organization_id
  AND (e.payment_amount IS NULL OR e.payment_currency IS NULL);

UPDATE learning_package_enrollments
SET payment_amount = COALESCE(payment_amount, 0),
    payment_currency = COALESCE(payment_currency, 'VND');

ALTER TABLE learning_package_enrollments
    ALTER COLUMN payment_amount SET DEFAULT 0,
    ALTER COLUMN payment_amount SET NOT NULL,
    ALTER COLUMN payment_currency SET DEFAULT 'VND',
    ALTER COLUMN payment_currency SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_learning_package_enrollments_payment_confirmed_by'
          AND conrelid = 'learning_package_enrollments'::regclass
    ) THEN
        ALTER TABLE learning_package_enrollments
            ADD CONSTRAINT fk_learning_package_enrollments_payment_confirmed_by
            FOREIGN KEY (payment_confirmed_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_learning_package_enrollments_payment_amount'
          AND conrelid = 'learning_package_enrollments'::regclass
    ) THEN
        ALTER TABLE learning_package_enrollments
            ADD CONSTRAINT chk_learning_package_enrollments_payment_amount
            CHECK (payment_amount >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_learning_package_enrollments_payment_currency'
          AND conrelid = 'learning_package_enrollments'::regclass
    ) THEN
        ALTER TABLE learning_package_enrollments
            ADD CONSTRAINT chk_learning_package_enrollments_payment_currency
            CHECK (payment_currency ~ '^[A-Z]{3}$');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learning_package_enrollments_payment_confirmed
    ON learning_package_enrollments(organization_id, payment_confirmed_at DESC)
    WHERE payment_confirmed_at IS NOT NULL;

COMMENT ON COLUMN learning_package_enrollments.payment_amount IS
    'Snapshot payable amount from learning_packages.price at enrollment request time.';
COMMENT ON COLUMN learning_package_enrollments.payment_reference IS
    'Offline bank transfer, SePay, receipt, or reconciliation reference used when ORG confirms package payment.';
