# Hướng dẫn đóng góp

Tài liệu này mô tả cách làm việc nhất quán trong repo, đặc biệt cho các thay đổi có ảnh hưởng tới runtime, docs, và deploy.

## 1. Nguyên tắc chung

- Ưu tiên thay đổi nhỏ, có thể kiểm chứng, và dễ rollback.
- Không coi plan, report, hay research là source of truth nếu code/runtime đã khác.
- Khi sửa luồng cốt lõi, luôn cập nhật tài liệu chuẩn tương ứng.

## 2. Trước khi bắt đầu

- Đọc [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [docs/README.md](docs/README.md)
- Nếu đụng backend, đọc thêm [backend/README.md](backend/README.md)
- Nếu đụng frontend, đọc thêm [fe/FRONTEND_ARCHITECTURE.md](fe/FRONTEND_ARCHITECTURE.md)

## 3. Quy tắc cập nhật tài liệu

### Bắt buộc cập nhật docs khi:

- thay đổi runtime conventions
- thay đổi deploy flow
- thay đổi role/permission behavior
- thay đổi learner/teacher/admin flow ở mức người dùng thấy được
- thêm hoặc đổi API/contract quan trọng
- thay đổi chiến lược offline/PWA/payment/video

### Cập nhật ở đâu

- thay đổi cấp dự án: `CHANGELOG.md`
- runtime/reference: `docs/reference/`
- runbook thao tác: `docs/runbooks/`
- architecture/boundary: `docs/architecture/`
- QA: `docs/testing/`
- work-in-progress spec: `docs/plans/` hoặc `docs/superpowers/specs/`

## 4. Quy tắc phân loại docs

- `README.md`, `ONBOARDING.md`, `CHANGELOG.md`, `docs/reference/`, `docs/runbooks/`, `docs/testing/`: tài liệu chuẩn
- `docs/architecture/`: tài liệu kiến trúc và boundary hiện hành
- `docs/plans/`, `docs/superpowers/specs/`: tài liệu đang triển khai
- `docs/reports/`, `docs/research/`: tài liệu historical/reference

Không đưa hướng dẫn runtime sống vào `docs/plans/` hoặc `docs/reports/`.

## 5. Kiểm tra tối thiểu trước khi ship

### Backend

```bash
cd backend
mvn test -B
```

### Frontend

```bash
cd fe
npm run build
```

### Manual

- chạy checklist phù hợp trong `docs/testing/`
- nếu deploy production, chạy [docs/runbooks/PRODUCTION_SMOKE_TEST.md](docs/runbooks/PRODUCTION_SMOKE_TEST.md)

## 6. Quy tắc changelog

- thay đổi có ảnh hưởng rõ tới hệ thống phải vào `CHANGELOG.md`
- ghi ngắn gọn, theo góc nhìn hành vi hoặc vận hành
- không dùng changelog như nhật ký debug từng file

## 7. Quy tắc dọn repo

- xóa artifact tạm thời, export trùng lặp, file debug hết giá trị
- giữ lại historical docs nếu còn giá trị truy vết
- trước khi xóa, tự hỏi:
  - file này có đang là source of truth không
  - file này có chỉ là bản export của một markdown gốc không
  - file này còn được team dùng để kiểm chứng không

## 8. Khi mở PR hoặc bàn giao nội bộ

Nên ghi rõ:

- mục tiêu thay đổi
- luồng người dùng bị ảnh hưởng
- file docs đã cập nhật
- cách verify
- residual nếu còn
