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

## 6. Quy tắc archive

Working docs (`plans/`, `superpowers/specs/`, dated files trong `reports/`, `prompts/`, `screenshots/` gắn với session cụ thể, `architecture-snapshots` đã impl) được **chuyển sang `docs/archive/YYYY-QN/`** khi feature tương ứng đã ship và ổn định ít nhất 2 tuần.

### Nguyên tắc

- **Append-only**: archive không được sửa hoặc xóa. Nếu nội dung sai về lịch sử, bổ sung `ERRATUM.md` trong folder đó.
- **Preserve filename**: giữ nguyên tên file gốc để link cũ trỏ đúng sau khi Git rename detection hoạt động (`git log --follow`).
- **Quarterly cadence**: `YYYY-Q1` (Jan-Mar), `YYYY-Q2` (Apr-Jun), v.v. Không dùng theo tháng hay sprint — quá mịn sẽ tạo noise.
- **Mỗi quý có `README.md`** liệt kê nội dung archived và lý do.
- **Root archive có `README.md`** làm trung tâm điều hướng + link tới từng quý.

### Quy trình

```bash
# Trước khi archive:
git checkout -b chore/docs-qN-archive main

# Di chuyển từng nhóm:
git mv docs/plans/YYYY-MM-DD-feature-design.md \
       docs/archive/YYYY-QN/plans/

# Cập nhật index:
# - docs/README.md
# - folder README của nguồn (nếu còn tồn tại)
# - docs/archive/YYYY-QN/README.md
```

### Không được archive

- Docs trong `reference/`, `runbooks/`, `research/`, `architecture/` (các file tên cố định, không date-stamp).
- ADR (Architecture Decision Record) — giữ nguyên vị trí vĩnh viễn.
- Docs đang active handoff giữa team.
- Academic/thesis artifacts (đã có folder riêng `docs/academic/`).

### Xóa sau khi archive

Có thể xóa **khỏi archive** nếu:

- File tạm thời bị trùng lặp với một file khác (consolidation).
- Chứa secret/PII vô tình commit — ưu tiên rewrite history, không chỉ xóa.

Các trường hợp khác: **không xóa**, kể cả khi thấy outdated.
