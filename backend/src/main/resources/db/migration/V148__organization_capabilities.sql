CREATE TABLE IF NOT EXISTS organization_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    capability_key VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_organization_capabilities_key UNIQUE (organization_id, capability_key),
    CONSTRAINT chk_organization_capabilities_key CHECK (capability_key ~ '^[a-z][a-z0-9_]{1,63}$')
);

CREATE INDEX IF NOT EXISTS idx_org_capabilities_org_enabled
    ON organization_capabilities(organization_id, enabled, capability_key);

INSERT INTO organization_capabilities (organization_id, capability_key, enabled)
SELECT org.id, capability.key, TRUE
FROM organizations org
CROSS JOIN (
    VALUES
        ('academic_catalog'),
        ('curriculum_plan'),
        ('learning_packages'),
        ('org_payment_config'),
        ('org_payout_approval')
) AS capability(key)
WHERE org.is_default = TRUE
ON CONFLICT (organization_id, capability_key)
DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = CURRENT_TIMESTAMP;
