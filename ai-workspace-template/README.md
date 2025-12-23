# AI WORKSPACE TEMPLATE

Universal template for Multi-Agent AI Workspace.
Copy this folder to any project and customize.

**Version:** SOTA 2025 v1.0 | **Created:** 2025-12-22

---

## QUICK SETUP (3 bước)

### Bước 1: Copy folder này vào dự án

```
1. Copy toàn bộ "ai-workspace-template" vào project của bạn
2. Đổi tên thành "documents" (khuyến khích) hoặc giữ nguyên
```

### Bước 2: Find & Replace

Mở tất cả files .md và thay thế:

| Tìm | Thay bằng | Ví dụ |
|-----|-----------|-------|
| `LMS` | Tên dự án | "LMS Web App" |
| `E:\LMS\lms_1\dev` | Đường dẫn folder này | "E:\Projects\LMS\documents" |
| `Java 21 + Spring Boot 3.5.6 + Angular 20 + PostgreSQL` | Tech stack | "React + FastAPI + PostgreSQL" |

### Bước 3: Chạy Audit (Quan trọng!)

Dùng prompt trong `luongngoai/quytrinhAI/prompt-khoi-tao-du-an-moi.md` để AI audit codebase và cập nhật progress.md files.

---

## CẤU TRÚC

```
ai-workspace-template/
├── README.md                 # File này - Hướng dẫn setup
│
├── ai-workspace/             # CHO AI AGENTS
│   ├── README.md             # Entry point cho agents
│   ├── agents/               # 5 specialist agents
│   │   ├── project-manager/      # Điều phối, phân công
│   │   ├── frontend-architect/   # UI, components
│   │   ├── backend-engineer/     # API, logic
│   │   ├── database-specialist/  # Schema, queries
│   │   └── qa-engineer/          # Testing, QA
│   ├── shared-context/       # Shared memory giữa agents
│   │   ├── shared-board.md       # Trạng thái hiện tại
│   │   ├── decision-log.md       # Lịch sử quyết định
│   │   └── global-architecture.md # Kiến trúc tổng quan
│   ├── communication/        # Protocols trao đổi
│   └── workflows/            # Quy trình làm việc
│
└── luongngoai/               # CHO CON NGƯỜI
    ├── README.md             # Hướng dẫn sử dụng
    ├── navigator/            # AI Concierge - ĐIỂM BẮT ĐẦU
    └── quytrinhAI/           # Templates, prompts
```

---

## SAU KHI SETUP

### Dùng Navigator để bắt đầu:

```
Chào bạn, bạn là Workspace Navigator AI.
Đọc file E:\LMS\lms_1\dev\ai-workspace-template/luongngoai/navigator/system-prompt.md
```

Navigator sẽ:
- Hỏi bạn muốn làm việc hay khởi tạo mới
- Routing đến agent phù hợp
- Hướng dẫn quy trình

---

## SOTA PATTERNS ĐÃ ÁP DỤNG

| Pattern | Nguồn | Mô tả |
|---------|-------|-------|
| ReAct | Google Research | Thought → Action → Observation |
| Supervisor | LangGraph | PM điều phối team |
| Role + Backstory | CrewAI | Mỗi agent có identity rõ ràng |
| Self-Correction | Anthropic | Checklist sau mỗi action |
| Context Engineering | Anthropic 2025 | Quản lý context đầy đủ |
| Human-in-the-Loop | Best Practice | Escalate khi cần |

---

## CHECKLIST TRƯỚC KHI DÙNG

- [ ] Đã copy folder vào project mới
- [ ] Đã find & replace 3 placeholders
- [ ] Đã chạy audit cho từng agent
- [ ] shared-board.md đã có status thực tế
- [ ] global-architecture.md đã mô tả đúng hệ thống

---

## SUPPORT

Nếu cần hỗ trợ, xem:
- `luongngoai/quytrinhAI/huong-dan-su-dung.md` - Hướng dẫn chi tiết
- `luongngoai/quytrinhAI/prompt-khoi-tao-du-an-moi.md` - Prompts audit
