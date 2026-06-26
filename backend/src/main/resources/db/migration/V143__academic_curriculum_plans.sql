DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_academic_programs_id_org'
    ) THEN
        ALTER TABLE academic_programs
            ADD CONSTRAINT uq_academic_programs_id_org UNIQUE (id, organization_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_academic_cohorts_id_org'
    ) THEN
        ALTER TABLE academic_cohorts
            ADD CONSTRAINT uq_academic_cohorts_id_org UNIQUE (id, organization_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_academic_subjects_id_org'
    ) THEN
        ALTER TABLE academic_subjects
            ADD CONSTRAINT uq_academic_subjects_id_org UNIQUE (id, organization_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(16) NOT NULL,
    term_number INTEGER NOT NULL,
    starts_on DATE,
    ends_on DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_academic_terms_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uq_academic_terms_org_code UNIQUE (organization_id, code),
    CONSTRAINT uq_academic_terms_id_org UNIQUE (id, organization_id),
    CONSTRAINT chk_academic_terms_number CHECK (term_number BETWEEN 1 AND 12),
    CONSTRAINT chk_academic_terms_dates CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS curriculum_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    program_id UUID NOT NULL,
    cohort_id UUID,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    total_credits INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_curriculum_plans_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_curriculum_plans_program_org
        FOREIGN KEY (program_id, organization_id) REFERENCES academic_programs(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_curriculum_plans_cohort_org
        FOREIGN KEY (cohort_id, organization_id) REFERENCES academic_cohorts(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT uq_curriculum_plans_org_code UNIQUE (organization_id, code),
    CONSTRAINT uq_curriculum_plans_id_org UNIQUE (id, organization_id),
    CONSTRAINT chk_curriculum_plans_total_credits CHECK (total_credits >= 0)
);

CREATE TABLE IF NOT EXISTS curriculum_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    curriculum_plan_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    term_id UUID,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    credits_override INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT fk_curriculum_subjects_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_curriculum_subjects_plan_org
        FOREIGN KEY (curriculum_plan_id, organization_id) REFERENCES curriculum_plans(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_curriculum_subjects_subject_org
        FOREIGN KEY (subject_id, organization_id) REFERENCES academic_subjects(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_curriculum_subjects_term_org
        FOREIGN KEY (term_id, organization_id) REFERENCES academic_terms(id, organization_id) ON DELETE SET NULL (term_id),
    CONSTRAINT uq_curriculum_subjects_plan_subject UNIQUE (curriculum_plan_id, subject_id),
    CONSTRAINT chk_curriculum_subjects_display_order CHECK (display_order >= 0),
    CONSTRAINT chk_curriculum_subjects_credits_override CHECK (credits_override IS NULL OR credits_override >= 0)
);

CREATE INDEX IF NOT EXISTS idx_academic_terms_org ON academic_terms(organization_id, status, academic_year, term_number);
CREATE INDEX IF NOT EXISTS idx_curriculum_plans_org ON curriculum_plans(organization_id, status, program_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_plan ON curriculum_subjects(curriculum_plan_id, display_order);
CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_subject ON curriculum_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_term ON curriculum_subjects(term_id);
