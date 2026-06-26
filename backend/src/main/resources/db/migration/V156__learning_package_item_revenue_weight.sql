-- V156: Revenue allocation weight for organization-scoped learning package items.
--
-- Package revenue must not be split implicitly. Store an explicit per-item
-- weight first; later revenue/refund/payout logic can use this as source data.

ALTER TABLE learning_package_items
    ADD COLUMN IF NOT EXISTS revenue_weight NUMERIC(10, 4) NOT NULL DEFAULT 1.0000;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_learning_package_items_revenue_weight'
          AND conrelid = 'learning_package_items'::regclass
    ) THEN
        ALTER TABLE learning_package_items
            ADD CONSTRAINT chk_learning_package_items_revenue_weight
            CHECK (revenue_weight >= 0);
    END IF;
END $$;

COMMENT ON COLUMN learning_package_items.revenue_weight IS
    'Relative allocation weight for future package-level revenue/refund/payout calculations.';
