-- V137: Direct organization ownership for learning classes.
--
-- Class ownership used to be inferred through learning_classes.course_id -> courses.
-- Store it directly so ORG_ADMIN class workflows stay stable even if teacher
-- assignments change later.

ALTER TABLE learning_classes
    ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE learning_classes lc
SET organization_id = c.organization_id
FROM courses c
WHERE lc.course_id = c.id
  AND lc.organization_id IS NULL;

UPDATE learning_classes lc
SET organization_id = u.organization_id
FROM users u
WHERE lc.teacher_id = u.id
  AND lc.organization_id IS NULL;

UPDATE learning_classes
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_learning_classes_organization'
          AND conrelid = 'learning_classes'::regclass
    ) THEN
        ALTER TABLE learning_classes
            ADD CONSTRAINT fk_learning_classes_organization
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'learning_classes'
          AND column_name = 'organization_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE learning_classes ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learning_classes_organization_id
    ON learning_classes(organization_id);

CREATE INDEX IF NOT EXISTS idx_learning_classes_org_status_updated
    ON learning_classes(organization_id, status, updated_at DESC);
