# Hướng dẫn sử dụng AI Workspace

---

## Các Agent

| Agent | Chuyên môn | Khi nào dùng |
|-------|------------|--------------|
| PM | Điều phối | Task phức tạp |
| FE | UI/Frontend | Sửa giao diện |
| BE | API/Backend | Sửa logic |
| DB | Database | Schema, queries |
| QA | Testing | Viết test |

---

## Cách sử dụng

### Cách 1: Qua Navigator (Khuyến khích)

```
Chào bạn, bạn là Workspace Navigator AI.
Đọc file E:\Sach\Sua\LMS_hohulili\ai-workspace-template/luongngoai/navigator/system-prompt.md
```

### Cách 2: Trực tiếp với Agent

```
Chào bạn, bạn là [ROLE] AI.
Đọc file E:\Sach\Sua\LMS_hohulili\ai-workspace-template/ai-workspace/README.md
```

---

## Flow

```
     Human Owner
          │
          ▼
    ┌──────────┐
    │Navigator │ ← Hỏi đáp, routing
    └────┬─────┘
         │
    ┌────┴────┐
    ▼         ▼
  PM AI    Agent trực tiếp
    │         │
    ▼         ▼
FE/BE/DB/QA  Làm việc
```

---

## Special Commands

| Command | Effect |
|---------|--------|
| ULTRATHINK | Phân tích sâu |
| Think step-by-step | Suy luận từng bước |
