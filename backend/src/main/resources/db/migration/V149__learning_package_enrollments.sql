CREATE TABLE IF NOT EXISTS learning_package_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    package_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    decision_note TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    decided_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_learning_package_enrollments_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_enrollments_package_org
        FOREIGN KEY (package_id, organization_id) REFERENCES learning_packages(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_enrollments_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_package_enrollments_decided_by
        FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_learning_package_enrollments_package_student UNIQUE (package_id, student_id),
    CONSTRAINT chk_learning_package_enrollments_status CHECK (status IN (
        'PENDING_APPROVAL',
        'PENDING_PAYMENT',
        'ACTIVE',
        'REJECTED',
        'CANCELLED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_learning_package_enrollments_org_status
    ON learning_package_enrollments(organization_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_package_enrollments_student
    ON learning_package_enrollments(student_id, status, requested_at DESC);

COMMENT ON TABLE learning_package_enrollments IS 'Student registration state for organization-scoped learning packages.';
COMMENT ON COLUMN learning_package_enrollments.status IS 'PENDING_APPROVAL, PENDING_PAYMENT, ACTIVE, REJECTED, or CANCELLED.';
