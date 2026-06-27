ALTER TABLE learning_package_enrollments
    DROP CONSTRAINT IF EXISTS uq_learning_package_enrollments_package_student;

DROP INDEX IF EXISTS ux_learning_package_enrollments_current_package_student;

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_package_enrollments_current_package_student
    ON learning_package_enrollments(package_id, student_id)
    WHERE status IN ('PENDING_APPROVAL', 'PENDING_PAYMENT', 'ACTIVE');

COMMENT ON INDEX ux_learning_package_enrollments_current_package_student IS
    'Only one current package enrollment per student/package. Terminal rows such as REJECTED, CANCELLED, and REFUNDED remain as audit history and do not block re-enrollment.';
