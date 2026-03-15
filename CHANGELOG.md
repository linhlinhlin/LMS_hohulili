# Changelog

> Cập nhật mới nhất: thêm fix learner section quiz cho khóa học miễn phí và case student đã được enroll nhưng chưa có payment record.

Mọi thay đổi đáng chú ý của dự án này sẽ được ghi ở đây.

Định dạng bám theo tinh thần của [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), nhưng dùng tiếng Việt và phù hợp với cách vận hành của repo này.

## [Chưa phát hành]

### Learner / Quiz

- Sửa guard truy cập `section quiz` để không chặn student trong khóa học `FREE`.
- Cho phép truy cập khi student có enrollment hợp lệ (`ACTIVE` hoặc `COMPLETED`) dù không đi qua payment flow.

### Tài liệu

- Dựng lại trục tài liệu chuẩn theo hướng Việt-first.
- Thêm `CONTRIBUTING.md`, nhóm `docs/reference/`, và `docs/runbooks/`.
- Làm sạch docs index, tách rõ tài liệu chuẩn, tài liệu working, và tài liệu historical.

## [2026-03-15]

### Thêm

- Bổ sung spec triển khai video adaptive streaming theo section ở `docs/architecture/2026-03-15-adaptive-video-v1-implementation-plan.md`.

### Cải thiện

- Làm sạch kho tài liệu và xóa bộ export trùng lặp của investigation PWA.

## [2026-03-14]

### Payment / Payout

- Hoàn thiện kiểm soát payment completion, revoke access sau refund, payout guardrails, và soft-cancel payout.
- Chuẩn hóa message `Đã hủy` cho payout teacher/admin.
- Sửa malformed JSON ở login để trả `400` thay vì `500`.

## [2026-03-12] - [2026-03-13]

### Authoring / Learner

- Hardening các luồng curriculum section-level quiz.
- Sửa create/edit question với `text + formula + image`.
- Ổn định learner embedded quiz, media section, và các regression liên quan.

## [2026-03-04]

### Upload / Course Editor

- Nâng cấp upload system sang flow presigned URL 3 bước.
- Redesign course info page và cải thiện course editor consistency.

## Ghi chú cập nhật

- Chỉ ghi các thay đổi có tác động đến hành vi hệ thống, vận hành, docs chuẩn, hoặc trải nghiệm người dùng.
- Nếu thay đổi lớn nhưng vẫn đang trong quá trình triển khai, ghi vào `Chưa phát hành`.
- Mỗi thay đổi runtime quan trọng nên cập nhật cả `CHANGELOG.md` và tài liệu chuẩn tương ứng trong `docs/`.
