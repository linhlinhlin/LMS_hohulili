-- V146 selected VMU by org code/name, but the existing VMU demo catalog is seeded
-- under the default organization. Seed from the curriculum plan itself so the
-- package always belongs to the same org as the plan.

WITH plan AS (
    SELECT cp.id AS curriculum_plan_id, cp.organization_id
    FROM curriculum_plans cp
    WHERE cp.code = 'DKT-K63-CDIO'
    ORDER BY cp.created_at
    LIMIT 1
),
pkg AS (
    INSERT INTO learning_packages (
        organization_id,
        curriculum_plan_id,
        code,
        name,
        description,
        package_type,
        price,
        currency,
        enrollment_policy
    )
    SELECT
        organization_id,
        curriculum_plan_id,
        'VMU-DKT-K63-FOUNDATION',
        'Gói nền tảng Điều khiển tàu biển K63',
        'Gói học mẫu theo khung chương trình Điều khiển tàu biển K63, dùng để trình diễn quản lý học phí và ghi danh theo tổ chức.',
        'CURRICULUM_BUNDLE',
        0,
        'VND',
        'ORG_APPROVAL'
    FROM plan
    ON CONFLICT (organization_id, code) DO UPDATE
    SET curriculum_plan_id = EXCLUDED.curriculum_plan_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        package_type = EXCLUDED.package_type,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        enrollment_policy = EXCLUDED.enrollment_policy,
        status = 'ACTIVE',
        updated_at = CURRENT_TIMESTAMP
    RETURNING id AS package_id, organization_id
),
subject_candidates AS (
    SELECT s.id AS subject_id, s.organization_id, row_number() OVER (ORDER BY s.code) AS display_order
    FROM academic_subjects s
    JOIN plan p ON p.organization_id = s.organization_id
    WHERE s.code IN ('HH-SAF101', 'HH-NAV101', 'HH-ENG102', 'HH-LAW101', 'HH-NAV201', 'HH-NAV301')
)
INSERT INTO learning_package_items (
    organization_id,
    package_id,
    subject_id,
    display_order,
    is_required
)
SELECT
    p.organization_id,
    p.package_id,
    s.subject_id,
    s.display_order,
    TRUE
FROM pkg p
JOIN subject_candidates s ON s.organization_id = p.organization_id
ON CONFLICT DO NOTHING;
