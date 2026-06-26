DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_courses_id_org'
    ) THEN
        ALTER TABLE courses
            ADD CONSTRAINT uq_courses_id_org UNIQUE (id, organization_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS learning_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    curriculum_plan_id UUID,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_type VARCHAR(32) NOT NULL DEFAULT 'CURRICULUM_BUNDLE',
    price NUMERIC(19, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    enrollment_policy VARCHAR(32) NOT NULL DEFAULT 'ORG_APPROVAL',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_learning_packages_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_packages_curriculum_plan_org
        FOREIGN KEY (curriculum_plan_id, organization_id) REFERENCES curriculum_plans(id, organization_id) ON DELETE SET NULL (curriculum_plan_id),
    CONSTRAINT uq_learning_packages_org_code UNIQUE (organization_id, code),
    CONSTRAINT uq_learning_packages_id_org UNIQUE (id, organization_id),
    CONSTRAINT chk_learning_packages_price CHECK (price >= 0),
    CONSTRAINT chk_learning_packages_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_learning_packages_type CHECK (package_type IN ('CURRICULUM_BUNDLE', 'SUBJECT_BUNDLE', 'COURSE_BUNDLE')),
    CONSTRAINT chk_learning_packages_enrollment_policy CHECK (enrollment_policy IN ('OPEN', 'ORG_APPROVAL', 'PAYMENT_REQUIRED', 'INVITE_ONLY'))
);

CREATE TABLE IF NOT EXISTS learning_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    package_id UUID NOT NULL,
    subject_id UUID,
    course_id UUID,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_learning_package_items_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_items_package_org
        FOREIGN KEY (package_id, organization_id) REFERENCES learning_packages(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_items_subject_org
        FOREIGN KEY (subject_id, organization_id) REFERENCES academic_subjects(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_learning_package_items_course_org
        FOREIGN KEY (course_id, organization_id) REFERENCES courses(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT chk_learning_package_items_target
        CHECK (((subject_id IS NOT NULL)::int + (course_id IS NOT NULL)::int) = 1),
    CONSTRAINT chk_learning_package_items_display_order CHECK (display_order >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_package_items_subject
    ON learning_package_items(package_id, subject_id)
    WHERE subject_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_package_items_course
    ON learning_package_items(package_id, course_id)
    WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_packages_org
    ON learning_packages(organization_id, status, package_type, name);

CREATE INDEX IF NOT EXISTS idx_learning_packages_curriculum_plan
    ON learning_packages(curriculum_plan_id);

CREATE INDEX IF NOT EXISTS idx_learning_package_items_package
    ON learning_package_items(package_id, display_order);

CREATE INDEX IF NOT EXISTS idx_learning_package_items_subject
    ON learning_package_items(subject_id);

CREATE INDEX IF NOT EXISTS idx_learning_package_items_course
    ON learning_package_items(course_id);

COMMENT ON TABLE learning_packages IS 'Organization-scoped learning/tuition packages. Separate from assessment question-bank packages.';
COMMENT ON COLUMN learning_packages.enrollment_policy IS 'OPEN, ORG_APPROVAL, PAYMENT_REQUIRED, or INVITE_ONLY.';
COMMENT ON TABLE learning_package_items IS 'Subjects or LMS courses included in a learning package.';
