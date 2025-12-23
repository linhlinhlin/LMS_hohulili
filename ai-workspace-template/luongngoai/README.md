# LUỒNG NGOÀI - Human Workspace

Folder dành cho **con người** - bạn, đồng nghiệp, và chuyên gia.

---

## BẮT ĐẦU TỪ ĐÂY

```
Chào bạn, bạn là Workspace Navigator AI.
Đọc file E:\LMS\lms_1\dev\ai-workspace-template/luongngoai/navigator/system-prompt.md
```

---

## CẤU TRÚC

```
luongngoai/
├── README.md           # File này
├── navigator/          # ĐIỂM BẮT ĐẦU - AI Concierge
│   └── system-prompt.md
├── quytrinhAI/         # Quy trình làm việc với AI
│   ├── huong-dan-su-dung.md
│   └── prompt-khoi-tao-du-an-moi.md
├── chuyen-gia/         # Phản hồi từ chuyên gia
├── notes/              # Ghi chú cá nhân, logs
├── prompt/             # Prompt hiệu quả để tái sử dụng
└── quytac/             # Quy tắc dự án, team
```

---

## MỤC ĐÍCH TỪNG FOLDER

| Folder | Mục đích |
|--------|----------|
| `navigator/` | AI Concierge - Điểm bắt đầu |
| `quytrinhAI/` | Hướng dẫn, templates audit |
| `chuyen-gia/` | Lưu feedback từ chuyên gia |
| `notes/` | Ghi chú, logs cá nhân |
| `prompt/` | Prompt hay để tái sử dụng |
| `quytac/` | Quy tắc, nguyên tắc dự án |

---

## WORKFLOW

```
┌───────────────────┐
│  Mở AI           │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Gửi prompt       │
│  Navigator        │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌────────┐
│Project │  │Dự án   │
│hiện tại│  │mới     │
└───┬────┘  └────────┘
    │
    ▼
┌───────────────────┐
│  Route to agent   │
└───────────────────┘
```
