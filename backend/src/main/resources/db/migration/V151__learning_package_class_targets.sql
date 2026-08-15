DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_learning_classes_id_org'
    ) THEN
        ALTER TABLE learning_classes
            ADD CONSTRAINT uq_learning_classes_id_org UNIQUE (id, organization_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS learning_package_class_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    package_id UUID NOT NULL,
    course_id UUID NOT NULL,
    learning_class_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_learning_package_class_targets_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_class_targets_package_org
        FOREIGN KEY (package_id, organization_id) REFERENCES learning_packages(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_class_targets_course_org
        FOREIGN KEY (course_id, organization_id) REFERENCES courses(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_learning_package_class_targets_class_org
        FOREIGN KEY (learning_class_id, organization_id) REFERENCES learning_classes(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT uq_learning_package_class_targets_package_course UNIQUE (package_id, course_id),
    CONSTRAINT chk_learning_package_class_targets_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX IF NOT EXISTS idx_learning_package_class_targets_org
    ON learning_package_class_targets(organization_id, package_id, status);

CREATE INDEX IF NOT EXISTS idx_learning_package_class_targets_class
    ON learning_package_class_targets(learning_class_id);

COMMENT ON TABLE learning_package_class_targets IS 'Organization-scoped package-to-class placement for instructor-led course entitlements.';
