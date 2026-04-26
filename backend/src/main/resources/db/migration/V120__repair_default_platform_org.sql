-- V120: Repair default platform organization after Phase 1 multi-org rollout.
--
-- PR #232 introduced V119 and the HoLiLiHu PLATFORM default org contract.
-- Do not edit V119 after merge because environments may have already recorded
-- its Flyway checksum. This forward-only migration repairs drift safely:
-- - ensures the default org row exists before any user backfill
-- - guarantees only that row is marked is_default=true
-- - backfills any remaining users with organization_id IS NULL

DO $$
DECLARE
    v_default_org_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    IF EXISTS (
        SELECT 1
        FROM organizations
        WHERE code = 'HOLILIHU'
          AND id <> v_default_org_id
    ) THEN
        RAISE EXCEPTION
            'Cannot repair default organization: code HOLILIHU belongs to a different id';
    END IF;

    INSERT INTO organizations (
        id,
        name,
        code,
        description,
        enabled,
        token_expiry_days,
        created_at,
        updated_at,
        type,
        is_default
    )
    VALUES (
        v_default_org_id,
        'HoLiLiHu Org',
        'HOLILIHU',
        'Default platform organization for LMS Maritime and individual registrations',
        TRUE,
        30,
        NOW(),
        NOW(),
        'PLATFORM',
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE organizations
    SET is_default = FALSE,
        updated_at = NOW()
    WHERE is_default = TRUE
      AND id <> v_default_org_id;

    UPDATE organizations
    SET name = 'HoLiLiHu Org',
        code = 'HOLILIHU',
        enabled = TRUE,
        type = 'PLATFORM',
        is_default = TRUE,
        updated_at = CASE
            WHEN (name, code, enabled, type, is_default)
                 IS DISTINCT FROM ('HoLiLiHu Org', 'HOLILIHU', TRUE, 'PLATFORM', TRUE)
            THEN NOW()
            ELSE updated_at
        END
    WHERE id = v_default_org_id;

    UPDATE users
    SET organization_id = v_default_org_id
    WHERE organization_id IS NULL;
END $$;
