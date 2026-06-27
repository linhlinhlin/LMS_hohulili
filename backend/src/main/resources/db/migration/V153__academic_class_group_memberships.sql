DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_id_org'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT uq_users_id_org UNIQUE (id, organization_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_academic_class_groups_id_org'
    ) THEN
        ALTER TABLE academic_class_groups
            ADD CONSTRAINT uq_academic_class_groups_id_org UNIQUE (id, organization_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS academic_class_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    class_group_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_class_group_memberships_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_class_group_memberships_class_group_org
        FOREIGN KEY (class_group_id, organization_id)
        REFERENCES academic_class_groups(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_class_group_memberships_student_org
        FOREIGN KEY (student_id, organization_id)
        REFERENCES users(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT chk_academic_class_group_memberships_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_class_group_memberships_active_student
    ON academic_class_group_memberships(organization_id, student_id)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_academic_class_group_memberships_class_group
    ON academic_class_group_memberships(organization_id, class_group_id, status);

ALTER TABLE learning_package_class_targets
    ADD COLUMN IF NOT EXISTS class_group_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_learning_package_class_targets_class_group_org'
    ) THEN
        ALTER TABLE learning_package_class_targets
            ADD CONSTRAINT fk_learning_package_class_targets_class_group_org
            FOREIGN KEY (class_group_id, organization_id)
            REFERENCES academic_class_groups(id, organization_id) ON DELETE SET NULL (class_group_id);
    END IF;
END $$;

ALTER TABLE learning_package_class_targets
    DROP CONSTRAINT IF EXISTS uq_learning_package_class_targets_package_course;

CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_package_class_targets_default
    ON learning_package_class_targets(package_id, course_id)
    WHERE class_group_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_package_class_targets_class_group
    ON learning_package_class_targets(package_id, course_id, class_group_id)
    WHERE class_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_package_class_targets_class_group
    ON learning_package_class_targets(organization_id, class_group_id, status);

COMMENT ON TABLE academic_class_group_memberships
    IS 'Organization-scoped student membership in academic administrative class groups.';

COMMENT ON COLUMN learning_package_class_targets.class_group_id
    IS 'Optional academic class group override. Null keeps the package course target as the default fallback.';
