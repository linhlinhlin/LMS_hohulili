# Architecture Decision Records (ADR)

Folder này chứa các **quyết định kiến trúc quan trọng** của dự án LMS Maritime. Mỗi ADR ghi lại: context ra quyết định, decision cụ thể, rationale, consequences (positive/negative/risks), và compliance check cho code review.

## Danh sách ADR

| # | Title | Status | Scope |
|---|---|---|---|
| [ADR-001](ADR-001-clean-architecture.md) | Clean Architecture + DDD cho backend | Accepted | Backend |
| [ADR-002](ADR-002-api-versioning.md) | API versioning strategy (`/api/v3/`) | Accepted | Contract |
| [ADR-003](ADR-003-event-driven-architecture.md) | Event-driven patterns với Spring Events | Accepted | Backend |
| [ADR-004](ADR-004-angular-signals-adoption.md) | Angular Signals-first cho FE | Accepted | Frontend |
| [ADR-005](ADR-005-pwa-offline-strategy.md) | PWA offline-first strategy | Accepted | Frontend + PWA |
| [ADR-006](ADR-006-angular-dev-server-ssr-separation.md) | Tách SSR config — chỉ enable ở production | Accepted | Frontend build config |

## Khi nào mở ADR mới

Mở ADR khi quyết định có **ít nhất một** trong các đặc điểm:

- Ảnh hưởng tới nhiều module hoặc cross-cutting concern
- Có trade-off thực sự giữa 2+ phương án hợp lý
- Nếu ai đó "dọn dẹp" code theo intuition sẽ làm hỏng
- Reproduce trong repo khác cần biết lý do để tránh lặp lại sai lầm

Không cần ADR cho: fix bug nhỏ, refactor cục bộ, format change, naming convention cho 1 file.

## Format ADR

Xem template trong các ADR hiện có (vd ADR-004, ADR-006). Các section bắt buộc:

1. **Status** (Accepted / Proposed / Superseded by ADR-XXX)
2. **Context** — tại sao cần quyết định
3. **Decision** — quyết định cụ thể, implementable
4. **Rationale** — so sánh trước/sau hoặc so sánh các option
5. **Consequences** — Positive, Negative, Risks
6. **Compliance check** — checklist cho code review
7. **References** — link PR, commit, doc liên quan
8. **Supersedes / Superseded by**

## Khi ADR bị thay thế

Không xóa ADR cũ — set Status: `Superseded by ADR-XXX`. Lịch sử là tài sản; tương lai cần biết tại sao quyết định cũ được chọn và sau đó đổi.

## Related

- `CLAUDE.md` — top-level project guide, section "COMMON ERRORS & FIXES" point về PR/issue reference
- `docs/reference/FRONTEND_GOTCHAS.md` — tactical gotchas, complement cho ADR-004/005/006
- `docs/reference/DOCUMENTATION_POLICY.md` — policy ngôn ngữ, archive, retention chung
