-- Seed one VMU-style curriculum plan for demo/review. This remains data, not VMU-specific code.

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
term_seed(code, name, academic_year, term_number) AS (
    VALUES
        ('2022-HK1', 'Học kỳ 1 năm học 2022-2023', '2022-2023', 1),
        ('2022-HK2', 'Học kỳ 2 năm học 2022-2023', '2022-2023', 2),
        ('2023-HK1', 'Học kỳ 1 năm học 2023-2024', '2023-2024', 1)
)
INSERT INTO academic_terms (organization_id, code, name, academic_year, term_number)
SELECT target_org.id, term_seed.code, term_seed.name, term_seed.academic_year, term_seed.term_number
FROM target_org
CROSS JOIN term_seed
ON CONFLICT (organization_id, code) DO UPDATE
SET name = EXCLUDED.name,
    academic_year = EXCLUDED.academic_year,
    term_number = EXCLUDED.term_number,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
plan_seed(program_code, cohort_code, code, name, total_credits) AS (
    VALUES
        ('DKT', 'K63', 'DKT-K63-CDIO', 'Khung chương trình Điều khiển tàu biển K63', 16)
)
INSERT INTO curriculum_plans (organization_id, program_id, cohort_id, code, name, total_credits)
SELECT target_org.id, program.id, cohort.id, plan_seed.code, plan_seed.name, plan_seed.total_credits
FROM target_org
JOIN plan_seed ON TRUE
JOIN academic_programs program
    ON program.organization_id = target_org.id
   AND program.code = plan_seed.program_code
JOIN academic_cohorts cohort
    ON cohort.organization_id = target_org.id
   AND cohort.code = plan_seed.cohort_code
ON CONFLICT (organization_id, code) DO UPDATE
SET program_id = EXCLUDED.program_id,
    cohort_id = EXCLUDED.cohort_id,
    name = EXCLUDED.name,
    total_credits = EXCLUDED.total_credits,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
curriculum_seed(plan_code, subject_code, term_code, display_order, is_required) AS (
    VALUES
        ('DKT-K63-CDIO', 'HH-SAF101', '2022-HK1', 10, TRUE),
        ('DKT-K63-CDIO', 'HH-NAV101', '2022-HK1', 20, TRUE),
        ('DKT-K63-CDIO', 'HH-ENG102', '2022-HK2', 30, TRUE),
        ('DKT-K63-CDIO', 'HH-LAW101', '2022-HK2', 40, TRUE),
        ('DKT-K63-CDIO', 'HH-NAV201', '2023-HK1', 50, TRUE),
        ('DKT-K63-CDIO', 'HH-NAV301', '2023-HK1', 60, TRUE)
)
INSERT INTO curriculum_subjects (
    organization_id,
    curriculum_plan_id,
    subject_id,
    term_id,
    display_order,
    is_required
)
SELECT target_org.id, plan.id, subject.id, term.id, curriculum_seed.display_order, curriculum_seed.is_required
FROM target_org
JOIN curriculum_seed ON TRUE
JOIN curriculum_plans plan
    ON plan.organization_id = target_org.id
   AND plan.code = curriculum_seed.plan_code
JOIN academic_subjects subject
    ON subject.organization_id = target_org.id
   AND subject.code = curriculum_seed.subject_code
JOIN academic_terms term
    ON term.organization_id = target_org.id
   AND term.code = curriculum_seed.term_code
ON CONFLICT (curriculum_plan_id, subject_id) DO UPDATE
SET term_id = EXCLUDED.term_id,
    display_order = EXCLUDED.display_order,
    is_required = EXCLUDED.is_required,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;
