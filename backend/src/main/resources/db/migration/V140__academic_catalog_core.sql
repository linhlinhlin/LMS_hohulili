CREATE TABLE IF NOT EXISTS academic_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_departments_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uq_academic_departments_org_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS academic_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    department_id UUID,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(32),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_programs_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_programs_department
        FOREIGN KEY (department_id) REFERENCES academic_departments(id) ON DELETE SET NULL,
    CONSTRAINT uq_academic_programs_org_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS academic_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_year INTEGER NOT NULL,
    graduation_year INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_cohorts_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uq_academic_cohorts_org_code UNIQUE (organization_id, code),
    CONSTRAINT chk_academic_cohorts_years
        CHECK (graduation_year IS NULL OR graduation_year >= start_year)
);

CREATE TABLE IF NOT EXISTS academic_class_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    program_id UUID NOT NULL,
    cohort_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_class_groups_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_class_groups_program
        FOREIGN KEY (program_id) REFERENCES academic_programs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_academic_class_groups_cohort
        FOREIGN KEY (cohort_id) REFERENCES academic_cohorts(id) ON DELETE RESTRICT,
    CONSTRAINT uq_academic_class_groups_org_code UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS academic_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    department_id UUID,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_subjects_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_subjects_department
        FOREIGN KEY (department_id) REFERENCES academic_departments(id) ON DELETE SET NULL,
    CONSTRAINT uq_academic_subjects_org_code UNIQUE (organization_id, code),
    CONSTRAINT chk_academic_subjects_credits CHECK (credits >= 0)
);

CREATE TABLE IF NOT EXISTS academic_subject_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    course_id UUID NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_subject_courses_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_subject_courses_subject
        FOREIGN KEY (subject_id) REFERENCES academic_subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_subject_courses_course
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT uq_academic_subject_courses_subject_course UNIQUE (subject_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_academic_departments_org ON academic_departments(organization_id, status, name);
CREATE INDEX IF NOT EXISTS idx_academic_programs_org ON academic_programs(organization_id, status, name);
CREATE INDEX IF NOT EXISTS idx_academic_programs_department ON academic_programs(department_id);
CREATE INDEX IF NOT EXISTS idx_academic_cohorts_org ON academic_cohorts(organization_id, status, start_year DESC);
CREATE INDEX IF NOT EXISTS idx_academic_class_groups_org ON academic_class_groups(organization_id, status, name);
CREATE INDEX IF NOT EXISTS idx_academic_class_groups_program ON academic_class_groups(program_id);
CREATE INDEX IF NOT EXISTS idx_academic_class_groups_cohort ON academic_class_groups(cohort_id);
CREATE INDEX IF NOT EXISTS idx_academic_subjects_org ON academic_subjects(organization_id, status, name);
CREATE INDEX IF NOT EXISTS idx_academic_subjects_department ON academic_subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_academic_subject_courses_org ON academic_subject_courses(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_academic_subject_courses_course ON academic_subject_courses(course_id);
