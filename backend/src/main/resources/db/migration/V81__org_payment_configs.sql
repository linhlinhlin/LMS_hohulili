-- V81: Per-org revenue split configuration
-- Platform defaults stored in admin_settings (revenue.platform_fee_pct, etc.)
-- Org-specific overrides stored here.

CREATE TABLE org_payment_configs (
    org_id              UUID        PRIMARY KEY
                                    REFERENCES organizations(id) ON DELETE CASCADE,
    platform_fee_pct    NUMERIC(5,2) NOT NULL DEFAULT 20.00
                                    CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 100),
    teacher_share_pct   NUMERIC(5,2) NOT NULL DEFAULT 70.00
                                    CHECK (teacher_share_pct >= 0 AND teacher_share_pct <= 100),
    -- org_share_pct = 100 - platform_fee_pct - teacher_share_pct (derived, stored for clarity)
    min_payout_amount   NUMERIC(19,2) NOT NULL DEFAULT 100000,
    updated_at          TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT chk_org_pct_sum
        CHECK (platform_fee_pct + teacher_share_pct <= 100)
);

COMMENT ON TABLE org_payment_configs IS
    'Per-org revenue split config. Teachers with org_id=NULL use admin_settings platform defaults.';
COMMENT ON COLUMN org_payment_configs.platform_fee_pct IS 'Percentage platform keeps (0-100)';
COMMENT ON COLUMN org_payment_configs.teacher_share_pct IS 'Percentage teacher receives (0-100)';
COMMENT ON COLUMN org_payment_configs.min_payout_amount IS 'Minimum withdrawal amount in VND';

-- Seed platform-wide defaults into admin_settings for null-org (individual) teachers
INSERT INTO admin_settings (setting_key, setting_value) VALUES
    ('revenue.platform_fee_pct',    '20'),
    ('revenue.teacher_share_pct',   '70'),
    ('revenue.min_payout_amount',   '100000')
ON CONFLICT (setting_key) DO NOTHING;
