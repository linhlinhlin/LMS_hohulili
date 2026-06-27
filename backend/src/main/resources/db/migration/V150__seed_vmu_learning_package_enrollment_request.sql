WITH package_candidate AS (
    SELECT id AS package_id, organization_id
    FROM learning_packages
    WHERE code = 'VMU-DKT-K63-FOUNDATION'
    ORDER BY created_at
    LIMIT 1
),
student_candidate AS (
    SELECT u.id AS student_id, p.package_id, p.organization_id
    FROM package_candidate p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE u.role = 'STUDENT'
      AND u.enabled = TRUE
    ORDER BY u.created_at
    LIMIT 1
)
INSERT INTO learning_package_enrollments (
    organization_id,
    package_id,
    student_id,
    status
)
SELECT
    organization_id,
    package_id,
    student_id,
    'PENDING_APPROVAL'
FROM student_candidate
ON CONFLICT (package_id, student_id) DO NOTHING;
