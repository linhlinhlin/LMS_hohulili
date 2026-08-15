-- V136: Direct organization ownership for courses.
--
-- Previous ORG scoping inferred course ownership via courses.teacher_id -> users.organization_id.
-- That works for basic checks but is fragile when teachers move organizations, payments
-- need stable ownership, or org-admin queries need direct indexes. This migration stores
-- the owning organization on courses and backfills it from the current teacher.

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE courses c
SET organization_id = u.organization_id
FROM users u
WHERE c.teacher_id = u.id
  AND c.organization_id IS NULL;

UPDATE courses
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_courses_organization'
          AND conrelid = 'courses'::regclass
    ) THEN
        ALTER TABLE courses
            ADD CONSTRAINT fk_courses_organization
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'courses'
          AND column_name = 'organization_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE courses ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_organization_id
    ON courses(organization_id);

CREATE INDEX IF NOT EXISTS idx_courses_org_status_updated
    ON courses(organization_id, status, updated_at DESC);
