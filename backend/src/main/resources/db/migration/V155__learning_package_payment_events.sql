-- V155: Immutable payment event ledger for organization-scoped learning packages.
--
-- Package tuition is intentionally separate from course-centric payment_transactions.
-- This ledger records package payment side effects without changing course revenue logic.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_learning_package_enrollments_id_org'
          AND conrelid = 'learning_package_enrollments'::regclass
    ) THEN
        ALTER TABLE learning_package_enrollments
            ADD CONSTRAINT uq_learning_package_enrollments_id_org UNIQUE (id, organization_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS learning_package_payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,
    package_id UUID NOT NULL,
    student_id UUID NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    reference VARCHAR(128),
    actor_id UUID,
    note TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_learning_package_payment_events_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_payment_events_enrollment_org
        FOREIGN KEY (enrollment_id, organization_id)
        REFERENCES learning_package_enrollments(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_payment_events_package_org
        FOREIGN KEY (package_id, organization_id)
        REFERENCES learning_packages(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_payment_events_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_payment_events_actor
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_learning_package_payment_events_type
        CHECK (event_type IN ('QR_CREATED', 'PAYMENT_CONFIRMED')),
    CONSTRAINT chk_learning_package_payment_events_amount
        CHECK (amount >= 0),
    CONSTRAINT chk_learning_package_payment_events_currency
        CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX IF NOT EXISTS idx_learning_package_payment_events_enrollment
    ON learning_package_payment_events(organization_id, enrollment_id, occurred_at ASC);

CREATE INDEX IF NOT EXISTS idx_learning_package_payment_events_org_time
    ON learning_package_payment_events(organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_package_payment_events_reference
    ON learning_package_payment_events(reference)
    WHERE reference IS NOT NULL;

COMMENT ON TABLE learning_package_payment_events IS
    'Append-only audit ledger for organization-scoped learning package payment events.';
COMMENT ON COLUMN learning_package_payment_events.reference IS
    'SePay transfer content, gateway transaction code, receipt id, or reconciliation reference.';
