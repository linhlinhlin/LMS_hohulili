-- Seed a small VMU-style academic catalog for the default organization.
-- Keep this data-driven: no application code branches on VMU/HOLILIHU.

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
department_seed(code, name) AS (
    VALUES
        ('KHOA-HH', 'Khoa Hàng hải'),
        ('KHOA-MTB', 'Khoa Máy tàu biển'),
        ('KHOA-KT', 'Khoa Kinh tế'),
        ('KHOA-CNTT', 'Khoa Công nghệ thông tin')
)
INSERT INTO academic_departments (organization_id, code, name)
SELECT target_org.id, department_seed.code, department_seed.name
FROM target_org
CROSS JOIN department_seed
ON CONFLICT (organization_id, code) DO UPDATE
SET name = EXCLUDED.name,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
program_seed(department_code, code, name, level) AS (
    VALUES
        ('KHOA-HH', 'DKT', 'Điều khiển tàu biển', 'Đại học'),
        ('KHOA-MTB', 'MTB', 'Máy tàu biển', 'Đại học'),
        ('KHOA-KT', 'LOG', 'Logistics và vận tải biển', 'Đại học'),
        ('KHOA-CNTT', 'CNTT-HH', 'Công nghệ thông tin hàng hải', 'Đại học')
)
INSERT INTO academic_programs (organization_id, department_id, code, name, level)
SELECT target_org.id, department.id, program_seed.code, program_seed.name, program_seed.level
FROM target_org
JOIN program_seed ON TRUE
JOIN academic_departments department
    ON department.organization_id = target_org.id
   AND department.code = program_seed.department_code
ON CONFLICT (organization_id, code) DO UPDATE
SET department_id = EXCLUDED.department_id,
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
cohort_seed(code, name, start_year, graduation_year) AS (
    VALUES
        ('K63', 'Khoa 63', 2022, 2026),
        ('K64', 'Khoa 64', 2023, 2027),
        ('K65', 'Khoa 65', 2024, 2028)
)
INSERT INTO academic_cohorts (organization_id, code, name, start_year, graduation_year)
SELECT target_org.id, cohort_seed.code, cohort_seed.name, cohort_seed.start_year, cohort_seed.graduation_year
FROM target_org
CROSS JOIN cohort_seed
ON CONFLICT (organization_id, code) DO UPDATE
SET name = EXCLUDED.name,
    start_year = EXCLUDED.start_year,
    graduation_year = EXCLUDED.graduation_year,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
class_seed(program_code, cohort_code, code, name) AS (
    VALUES
        ('DKT', 'K63', 'DKT63DH', 'Lớp Điều khiển tàu biển K63'),
        ('MTB', 'K63', 'MTB63DH', 'Lớp Máy tàu biển K63'),
        ('LOG', 'K63', 'LOG63DH', 'Lớp Logistics và vận tải biển K63'),
        ('CNTT-HH', 'K63', 'CNT63DH', 'Lớp Công nghệ thông tin K63')
)
INSERT INTO academic_class_groups (organization_id, program_id, cohort_id, code, name)
SELECT target_org.id, program.id, cohort.id, class_seed.code, class_seed.name
FROM target_org
JOIN class_seed ON TRUE
JOIN academic_programs program
    ON program.organization_id = target_org.id
   AND program.code = class_seed.program_code
JOIN academic_cohorts cohort
    ON cohort.organization_id = target_org.id
   AND cohort.code = class_seed.cohort_code
ON CONFLICT (organization_id, code) DO UPDATE
SET program_id = EXCLUDED.program_id,
    cohort_id = EXCLUDED.cohort_id,
    name = EXCLUDED.name,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
subject_seed(department_code, code, name, credits) AS (
    VALUES
        ('KHOA-HH', 'HH-SAF101', 'An toàn cơ bản STCW', 2),
        ('KHOA-HH', 'HH-NAV101', 'Hàng hải địa văn và la bàn từ', 3),
        ('KHOA-HH', 'HH-NAV201', 'ECDIS và Radar/ARPA', 3),
        ('KHOA-HH', 'HH-LAW101', 'Luật hàng hải quốc tế và Việt Nam', 2),
        ('KHOA-MTB', 'MTB-ENG101', 'Máy Diesel tàu biển', 3),
        ('KHOA-MTB', 'MTB-ENG201', 'Hệ thống điện và tự động hóa tàu biển', 3),
        ('KHOA-KT', 'LOG-101', 'Quản lý chuỗi cung ứng và vận tải biển', 3),
        ('KHOA-HH', 'HH-NAV301', 'Khí tượng hải dương và điều động tàu', 3),
        ('KHOA-HH', 'HH-ENG102', 'Tiếng Anh hàng hải chuyên ngành', 3)
)
INSERT INTO academic_subjects (organization_id, department_id, code, name, credits)
SELECT target_org.id, department.id, subject_seed.code, subject_seed.name, subject_seed.credits
FROM target_org
JOIN subject_seed ON TRUE
JOIN academic_departments department
    ON department.organization_id = target_org.id
   AND department.code = subject_seed.department_code
ON CONFLICT (organization_id, code) DO UPDATE
SET department_id = EXCLUDED.department_id,
    name = EXCLUDED.name,
    credits = EXCLUDED.credits,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
subject_course_seed(subject_code, course_code, is_primary) AS (
    VALUES
        ('HH-SAF101', 'SAF-101', TRUE),
        ('HH-NAV101', 'NAV-101', TRUE),
        ('HH-NAV201', 'NAV-201', TRUE),
        ('HH-LAW101', 'LAW-101', TRUE),
        ('MTB-ENG101', 'ENG-101', TRUE),
        ('MTB-ENG201', 'ENG-201', TRUE),
        ('LOG-101', 'LOG-101', TRUE),
        ('HH-NAV301', 'NAV-301', TRUE),
        ('HH-ENG102', 'NAV-102', TRUE)
)
INSERT INTO academic_subject_courses (organization_id, subject_id, course_id, is_primary)
SELECT target_org.id, subject.id, course.id, subject_course_seed.is_primary
FROM target_org
JOIN subject_course_seed ON TRUE
JOIN academic_subjects subject
    ON subject.organization_id = target_org.id
   AND subject.code = subject_course_seed.subject_code
JOIN courses course
    ON course.organization_id = target_org.id
   AND course.code = subject_course_seed.course_code
ON CONFLICT (subject_id, course_id) DO UPDATE
SET organization_id = EXCLUDED.organization_id,
    is_primary = EXCLUDED.is_primary,
    status = 'ACTIVE',
    updated_at = CURRENT_TIMESTAMP;
