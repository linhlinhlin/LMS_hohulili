-- V157: Immutable revenue split ledger for organization-scoped learning package payments.
--
-- Package tuition is not a single course payment. Split package revenue per package item
-- after payment confirmation, using the explicit learning_package_items.revenue_weight.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_learning_package_items_id_org'
          AND conrelid = 'learning_package_items'::regclass
    ) THEN
        ALTER TABLE learning_package_items
            ADD CONSTRAINT uq_learning_package_items_id_org UNIQUE (id, organization_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS learning_package_revenue_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,
    package_id UUID NOT NULL,
    package_item_id UUID NOT NULL,
    subject_id UUID,
    course_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    gross_amount NUMERIC(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    platform_fee_pct NUMERIC(5, 2) NOT NULL,
    teacher_share_pct NUMERIC(5, 2) NOT NULL,
    org_share_pct NUMERIC(5, 2) NOT NULL,
    platform_amount NUMERIC(19, 2) NOT NULL,
    teacher_amount NUMERIC(19, 2) NOT NULL,
    org_amount NUMERIC(19, 2) NOT NULL,
    payment_reference VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_learning_package_revenue_splits_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_revenue_splits_enrollment_org
        FOREIGN KEY (enrollment_id, organization_id)
        REFERENCES learning_package_enrollments(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_revenue_splits_package_org
        FOREIGN KEY (package_id, organization_id)
        REFERENCES learning_packages(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_revenue_splits_item_org
        FOREIGN KEY (package_item_id, organization_id)
        REFERENCES learning_package_items(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_learning_package_revenue_splits_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_learning_package_revenue_splits_amounts
        CHECK (gross_amount >= 0 AND platform_amount >= 0 AND teacher_amount >= 0 AND org_amount >= 0),
    CONSTRAINT chk_learning_package_revenue_splits_currency
        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT uq_learning_package_revenue_split_enrollment_item
        UNIQUE (enrollment_id, package_item_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_package_revenue_splits_enrollment
    ON learning_package_revenue_splits(organization_id, enrollment_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_learning_package_revenue_splits_teacher
    ON learning_package_revenue_splits(teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_package_revenue_splits_org
    ON learning_package_revenue_splits(organization_id, created_at DESC);

COMMENT ON TABLE learning_package_revenue_splits IS
    'Append-only package revenue split ledger. One row per confirmed enrollment package item with positive revenue_weight.';
COMMENT ON COLUMN learning_package_revenue_splits.package_item_id IS
    'The package item whose revenue_weight determined this gross allocation.';
