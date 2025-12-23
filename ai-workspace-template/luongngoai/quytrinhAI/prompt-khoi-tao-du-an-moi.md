# PROMPT TEMPLATE: Khởi tạo AI Workspace cho Dự Án Mới

Copy và điều chỉnh các prompt này khi cần audit project.

---

## BƯỚC 1: AUDIT TOÀN BỘ

```
Tôi có AI Workspace template cần setup cho dự án mới.

Dự án: [TÊN DỰ ÁN]
Path: [ĐƯỜNG DẪN PROJECT]
Tech stack: [React/FastAPI/etc.]

Nhiệm vụ:
1. Rà soát toàn bộ codebase thực tế
2. Cập nhật tất cả progress.md cho từng agent
3. Cập nhật shared-board.md và global-architecture.md
4. Báo cáo phát hiện

Yêu cầu:
- Suy nghĩ thật kỹ và cẩn thận
- Rà soát từng folder một cách thực tế
- Không giả định, kiểm tra thực tế

Bắt đầu với: list [PROJECT_ROOT]
```

---

## BƯỚC 2: AUDIT TỪNG LAYER

### Backend
```
Bạn là Backend Engineer AI.
Đọc file [PATH]/ai-workspace/README.md

Audit backend codebase:
- Cấu trúc folders
- Framework, patterns
- API endpoints
- Services

Tạo progress.md chính xác từ thực tế.
```

### Frontend
```
Bạn là Frontend Architect AI.
Đọc file [PATH]/ai-workspace/README.md

Audit frontend codebase:
- Framework, state management
- Components structure
- Styling approach

Tạo progress.md chính xác từ thực tế.
```

### Database
```
Bạn là Database Specialist AI.
Đọc file [PATH]/ai-workspace/README.md

Audit database layer:
- DB type, ORM
- Schema, tables
- Repositories

Tạo progress.md chính xác từ thực tế.
```

### QA
```
Bạn là QA Engineer AI.
Đọc file [PATH]/ai-workspace/README.md

Audit test infrastructure:
- Test framework
- Test coverage
- Known bugs

Tạo progress.md chính xác từ thực tế.
```

---

## BƯỚC 3: FIND & REPLACE

Sau khi audit, thay thế trong tất cả files:

| Tìm | Thay bằng |
|-----|-----------|
| `LMS` | Tên dự án |
| `E:\LMS\lms_1\dev` | Đường dẫn |
| `Java 21 + Spring Boot 3.5.6 + Angular 20 + PostgreSQL` | Tech stack |

---

## TIPS

- Luôn để AI rà soát THỰC TẾ, không giả định
- Dùng ULTRATHINK cho phân tích phức tạp
- Backup trước khi AI cập nhật files
