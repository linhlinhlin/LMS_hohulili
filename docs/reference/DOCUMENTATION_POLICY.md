# Chính sách tài liệu

Tài liệu này định nghĩa cách tổ chức và duy trì docs trong repo.

## 1. Ngôn ngữ chuẩn

- Tiếng Việt là ngôn ngữ chuẩn cho tài liệu vận hành, reference, runbook, onboarding, changelog.
- Tiếng Anh được giữ cho:
  - tên công nghệ, protocol, library
  - tài liệu nghiên cứu hoặc historical chưa cần Việt hóa toàn phần

## 2. Phân loại tài liệu

### Source of truth

- `README.md`
- `ONBOARDING.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `docs/reference/`
- `docs/runbooks/`
- `docs/testing/`
- các tài liệu boundary/architecture hiện hành trong `docs/architecture/`

### Working docs

- `docs/bugs/`
- `docs/plans/`
- `docs/superpowers/specs/`

### Historical / Research

- `docs/reports/`
- `docs/research/`

## 3. Khi nào phải cập nhật docs

- thay đổi runtime conventions
- thay đổi deploy flow
- thay đổi role behavior
- thay đổi learner/teacher/admin flow
- thay đổi payment, payout, offline, media, video, entitlement
- thêm API/contract có ảnh hưởng rõ

## 4. Quy tắc xóa tài liệu

Có thể xóa nếu:

- chỉ là export trùng lặp của một Markdown gốc
- chỉ là artifact sinh ra để trình bày, không còn giá trị vận hành
- không còn được docs index hoặc workflow nào sử dụng

Không xóa nếu:

- còn giá trị historical để truy vết
- là bằng chứng của một quyết định kỹ thuật quan trọng
- còn đang là handoff cho team triển khai

## 5. Quy tắc promote

Nếu một plan/spec/research đã được code xong và trở thành chuẩn sống, hãy chuyển phần cốt lõi của nó sang:

- `docs/architecture/`
- `docs/reference/`
- `docs/runbooks/`
- `docs/testing/`

Đừng để source of truth mãi nằm trong `plans/` hoặc `reports/`.
