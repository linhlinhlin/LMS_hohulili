-- V154: Seed organization-scoped payout demo data.
--
-- Purpose:
-- - Give ORG_ADMIN a realistic payout queue for review demos.
-- - Keep the workflow tenant-safe by storing payout_requests.organization_id.
-- - Do not hardcode VMU logic in Java code; this is demo data for the configured default org.

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
teacher_user AS (
    SELECT u.id AS teacher_id
    FROM users u
    JOIN target_org org ON org.id = u.organization_id
    WHERE u.role = 'TEACHER'
      AND u.email IN ('teacher@maritime.edu', 'tranngocdai@maritime.edu')
    ORDER BY CASE u.email
        WHEN 'teacher@maritime.edu' THEN 0
        WHEN 'tranngocdai@maritime.edu' THEN 1
        ELSE 2
    END
    LIMIT 1
)
UPDATE teacher_bank_accounts
SET is_default = FALSE
WHERE teacher_id IN (SELECT teacher_id FROM teacher_user);

WITH target_org AS (
    SELECT id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
teacher_user AS (
    SELECT u.id AS teacher_id, u.full_name
    FROM users u
    JOIN target_org org ON org.id = u.organization_id
    WHERE u.role = 'TEACHER'
      AND u.email IN ('teacher@maritime.edu', 'tranngocdai@maritime.edu')
    ORDER BY CASE u.email
        WHEN 'teacher@maritime.edu' THEN 0
        WHEN 'tranngocdai@maritime.edu' THEN 1
        ELSE 2
    END
    LIMIT 1
)
INSERT INTO teacher_bank_accounts (
    id,
    teacher_id,
    bank_code,
    account_number,
    account_name,
    is_default,
    verified,
    created_at
)
SELECT
    'b1540000-0000-4000-8000-000000000001'::uuid,
    teacher_id,
    'VCB',
    '0123456789',
    COALESCE(full_name, 'VMU Demo Teacher'),
    TRUE,
    TRUE,
    NOW() - INTERVAL '10 days'
FROM teacher_user
ON CONFLICT (teacher_id, bank_code, account_number)
DO UPDATE SET
    is_default = TRUE,
    verified = TRUE,
    account_name = EXCLUDED.account_name;

WITH target_org AS (
    SELECT id AS organization_id
    FROM organizations
    WHERE is_default = TRUE
    ORDER BY created_at
    LIMIT 1
),
teacher_user AS (
    SELECT u.id AS teacher_id, u.organization_id
    FROM users u
    JOIN target_org org ON org.organization_id = u.organization_id
    WHERE u.role = 'TEACHER'
      AND u.email IN ('teacher@maritime.edu', 'tranngocdai@maritime.edu')
    ORDER BY CASE u.email
        WHEN 'teacher@maritime.edu' THEN 0
        WHEN 'tranngocdai@maritime.edu' THEN 1
        ELSE 2
    END
    LIMIT 1
),
admin_user AS (
    SELECT u.id AS admin_id
    FROM users u
    JOIN target_org org ON org.organization_id = u.organization_id
    WHERE u.role IN ('ADMIN', 'ORG_ADMIN')
      AND u.email IN ('admin@maritime.edu', 'orgadmin@maritime.edu', 'nguyenlanhuong@maritime.edu')
    ORDER BY CASE u.email
        WHEN 'admin@maritime.edu' THEN 0
        WHEN 'orgadmin@maritime.edu' THEN 1
        WHEN 'nguyenlanhuong@maritime.edu' THEN 2
        ELSE 3
    END
    LIMIT 1
),
bank_account AS (
    SELECT tba.id AS bank_account_id
    FROM teacher_bank_accounts tba
    JOIN teacher_user teacher ON teacher.teacher_id = tba.teacher_id
    WHERE tba.bank_code = 'VCB'
      AND tba.account_number = '0123456789'
    LIMIT 1
),
demo_rows AS (
    SELECT *
    FROM (
        VALUES
            (
                'b1540000-0000-4000-8000-000000000101'::uuid,
                1250000.00::numeric,
                'PENDING',
                'Demo VMU: giảng viên yêu cầu rút tiền học phí khóa ECDIS.',
                NULL,
                NULL,
                NOW() - INTERVAL '5 days',
                NULL
            ),
            (
                'b1540000-0000-4000-8000-000000000102'::uuid,
                2100000.00::numeric,
                'APPROVED',
                'Demo VMU: payout đã được ORG_ADMIN duyệt, chờ ADMIN xác nhận chuyển khoản.',
                'Đã kiểm tra doanh thu và tài khoản ngân hàng.',
                (SELECT admin_id FROM admin_user),
                NOW() - INTERVAL '4 days',
                NOW() - INTERVAL '2 days'
            ),
            (
                'b1540000-0000-4000-8000-000000000103'::uuid,
                980000.00::numeric,
                'COMPLETED',
                'Demo VMU: payout đã chuyển khoản thành công.',
                'Đã hoàn tất chuyển khoản mẫu.',
                (SELECT admin_id FROM admin_user),
                NOW() - INTERVAL '8 days',
                NOW() - INTERVAL '6 days'
            ),
            (
                'b1540000-0000-4000-8000-000000000104'::uuid,
                650000.00::numeric,
                'REJECTED',
                'Demo VMU: payout bị từ chối do cần bổ sung thông tin.',
                'Yêu cầu bổ sung sao kê đối soát.',
                (SELECT admin_id FROM admin_user),
                NOW() - INTERVAL '7 days',
                NOW() - INTERVAL '5 days'
            )
    ) AS row(id, amount, status, teacher_note, admin_note, processed_by, requested_at, processed_at)
)
INSERT INTO payout_requests (
    id,
    organization_id,
    teacher_id,
    bank_account_id,
    amount,
    status,
    teacher_note,
    admin_note,
    processed_by,
    requested_at,
    processed_at
)
SELECT
    row.id,
    target_org.organization_id,
    teacher.teacher_id,
    bank.bank_account_id,
    row.amount,
    row.status,
    row.teacher_note,
    row.admin_note,
    row.processed_by,
    row.requested_at,
    row.processed_at
FROM demo_rows row
CROSS JOIN target_org
CROSS JOIN teacher_user teacher
CROSS JOIN bank_account bank
ON CONFLICT (id) DO NOTHING;
