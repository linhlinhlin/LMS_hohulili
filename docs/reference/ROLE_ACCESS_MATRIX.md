# Ma trận vai trò

## Vai trò chính

| Vai trò | Mô tả ngắn |
|--------|------------|
| `ADMIN` | Toàn quyền hệ thống |
| `ORG_ADMIN` | Quản trị vận hành trong phạm vi tổ chức |
| `TEACHER` | Biên soạn nội dung, chấm điểm, theo dõi học viên |
| `STUDENT` | Học tập, làm bài, thanh toán, theo dõi tiến độ |

## Quy tắc nền

- `ADMIN` có quyền hệ thống đầy đủ
- `ORG_ADMIN` không phải system admin toàn cục
- `ORG_ADMIN` chỉ được thao tác trong phạm vi tổ chức nếu flow có org scope
- `TEACHER` không được thao tác như admin hệ thống
- `STUDENT` chỉ thao tác trên dữ liệu học tập và giao dịch của chính mình

## Một số lưu ý quan trọng

- payment/payout/admin finance phải có business guard, không chỉ dựa vào role string
- payout của teacher phải giữ audit trail
- learner access phải phụ thuộc entitlement/enrollment thực, không chỉ UI state

Khi role behavior thay đổi, cập nhật tài liệu này cùng changelog.
