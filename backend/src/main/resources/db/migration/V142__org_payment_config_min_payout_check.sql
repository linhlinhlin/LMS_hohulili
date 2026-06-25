-- V142: Enforce non-negative minimum payout for organization payment configs.
--
-- V81 already constrains revenue percentages and their sum. This closes the
-- remaining financial invariant at the database boundary.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_org_payment_configs_min_payout_nonnegative'
          AND conrelid = 'org_payment_configs'::regclass
    ) THEN
        ALTER TABLE org_payment_configs
            ADD CONSTRAINT chk_org_payment_configs_min_payout_nonnegative
            CHECK (min_payout_amount >= 0);
    END IF;
END $$;
