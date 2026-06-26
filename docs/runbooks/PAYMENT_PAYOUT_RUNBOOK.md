# Payment / Payout Runbook

## Payment Smoke Tối Thiểu

- Mở course trả phí khi học viên chưa có entitlement.
- Thấy CTA thanh toán.
- Mở được payment modal.
- Callback/success dẫn tới entitlement đúng.
- Refund thu hồi quyền truy cập đúng.

## Payout Smoke Tối Thiểu

- Teacher thấy payout history.
- Cancel payout giữ lại row với trạng thái `Đã hủy`.
- Admin thấy đúng dữ liệu theo role.
- `ORG_ADMIN` không thấy dữ liệu ngoài org.
- Masking bank account đúng.

## Review Runtime Demo Data - 2026-06-26

Runtime `https://holilihu.online` có payout demo rows được gắn nhãn:

```text
[DEMO-ORG-PAYOUT-20260626]
```

Backup trước khi seed:

```text
/home/Admin/apps/LMS_hohulili/backups/lms-before-demo-payout-20260626-081335.dump
```

Demo status mix:

- `PENDING`: 2 rows để ORG_ADMIN demo approve/reject.
- `APPROVED`: 1 row để system ADMIN demo complete.
- `COMPLETED`: 1 historical completed row.
- `REJECTED`: 1 historical rejected row.

Boundary hiện tại:

- `ORG_ADMIN` được approve/reject payout cùng tổ chức.
- `ADMIN` complete payout sau khi thao tác chuyển khoản thủ công đã thực hiện thật.
- Không đổi boundary này trừ khi quy trình tài chính giao rõ quyền settlement cho `ORG_ADMIN`.

Cleanup SQL nếu cần dọn demo data:

```sql
BEGIN;

DELETE FROM payout_requests
WHERE teacher_note LIKE '[DEMO-ORG-PAYOUT-20260626]%'
   OR admin_note LIKE '[DEMO-ORG-PAYOUT-20260626]%';

DELETE FROM teacher_bank_accounts
WHERE account_number IN (
  '970400000001',
  '970400000002',
  '970400000003',
  '970400000004',
  '970400000005'
);

COMMIT;
```

## Cảnh Báo

- Tránh tạo side effect tài chính thật trên production nếu không cần.
- Ưu tiên fixture account đã biết trạng thái ban đầu.
- Backup DB trước khi seed hoặc mutate payout demo trên review runtime.
