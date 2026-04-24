# Docs archive

Kho lưu trữ các tài liệu working đã hoàn thành (plans, specs, reports, screenshots một lần) của các quý trước. Archive là **append-only** và tổ chức theo **quý** (`YYYY-QN`).

## Tại sao có archive?

Mục tiêu là giữ `docs/plans/`, `docs/reports/`, `docs/superpowers/`… chỉ chứa **working docs đang active**. Khi một plan/spec đã ship và ổn định ≥ 2 tuần, nó được di chuyển sang đây. Điều này giữ navigation sạch mà không xóa lịch sử thiết kế.

Quy tắc đầy đủ: [`docs/reference/DOCUMENTATION_POLICY.md §6`](../reference/DOCUMENTATION_POLICY.md).

## Cấu trúc

```
archive/
├── README.md           ← bạn đang ở đây
└── 2026-Q1/
    ├── README.md       ← chi tiết nội dung Q1
    ├── plans/
    ├── reports/
    ├── superpowers/{specs,plans,mockups}/
    ├── architecture-snapshots/
    ├── prompts/
    ├── screenshots/
    ├── testing/
    └── bugs/
```

## Tìm lại lịch sử của một file

```bash
# Hiển thị log bao gồm cả lần đổi tên
git log --follow -- docs/archive/2026-Q1/plans/<file>.md

# Hoặc tra ngược từ tên file gốc
git log --all --full-history -- '**/<filename>'
```

Git tự nhận rename nếu bạn dùng `git mv`; nội dung không thay đổi trong lúc move.

## Quý hiện có

| Quý | Phạm vi thời gian | README |
|---|---|---|
| 2026-Q1 | Feb 2026 – 23 Apr 2026 | [2026-Q1/README.md](2026-Q1/README.md) |

## Không được

- Sửa hoặc xóa file trong archive. Nếu phát hiện lỗi lịch sử → bổ sung `ERRATUM.md` cùng folder.
- Archive các file tên cố định không date-stamp (live docs thuộc `reference/`, `runbooks/`, `research/`, `architecture/` chính).
- Đổi tên file khi archive — giữ nguyên để Git track rename.
