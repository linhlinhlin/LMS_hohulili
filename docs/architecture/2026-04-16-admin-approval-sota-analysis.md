# Admin Approval Flow — SOTA Analysis & Gap Report

> **Date**: 2026-04-16 | **Author**: Claude Code CoT Research | **Status**: Research Complete

---

## 1. Current State Summary

### 1.1 Domain State Machine (`Course.java`)

```
                    submitForApproval()
    DRAFT ──────────────────────────────► PENDING
      ▲                                     │
      │ cancelApprovalRequest()             │
      │◄────────────────────────────────────┤
      │                                     │
      │              approve()              │ reject()
      │         ┌────────────┘              │
      │         ▼                           ▼
      │     APPROVED ◄──── resubmit ── REJECTED
      │         │
      │         │ revoke()
      └─────────┘
```

**Khi APPROVED + có thay đổi**, `DraftChangeStatus` quản lý vòng review lần 2:
- `NONE` → `DRAFT` (có sửa) → `PENDING_REVIEW` (gửi lại) → `NONE`/`CHANGES_REQUESTED`

### 1.2 Backend Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/api/v3/admin/courses/pending` | GET | Danh sách chờ duyệt |
| `/api/v3/admin/courses/all` | GET | Tất cả khóa học (filter status) |
| `/api/v3/admin/courses/{id}/approve` | PATCH | Duyệt (optional comment) |
| `/api/v3/admin/courses/{id}/reject` | PATCH | Từ chối (required reason) |
| `/api/v3/admin/courses/{id}/revoke` | PATCH | Thu hồi → DRAFT |
| `/api/v3/admin/courses/bulk-approve` | PATCH | Duyệt hàng loạt |
| `/api/v3/admin/courses/bulk-reject` | PATCH | Từ chối hàng loạt |
| `/api/v3/admin/courses/analytics` | GET | Thống kê theo status |

### 1.3 Frontend UI (`course-review.component`)

- **Bảng**: Tên khóa học, giảng viên, trạng thái, thao tác
- **Modal chi tiết**: Thống kê cơ bản (chương, học viên, bài tập)
- **Modal từ chối**: Textarea nhập lý do (bắt buộc)
- **Preview**: Chuyển hướng sang `/admin/courses/{id}/preview` (rời trang)

### 1.4 Audit Data (Trên Course entity)

```java
private String reviewComment;    // Overwritten mỗi lần approve/reject
private Instant reviewedAt;      // Overwritten
private UUID reviewedById;       // Overwritten
```

**Vấn đề**: Chỉ lưu lần review cuối. Nếu khóa học bị reject 3 lần, chỉ thấy lý do lần cuối.

---

## 2. SOTA Comparison — Industry Standard Patterns

### 2.1 So sánh tổng quan

| Khía cạnh | Hệ thống hiện tại | Industry Standard | Gap |
|-----------|-------------------|-------------------|-----|
| **Preview khi duyệt** | Chuyển hướng sang trang khác | Inline preview / split-pane trong trang duyệt | **Lớn** |
| **Diff giữa versions** | Không có | Side-by-side diff (thay đổi so với bản đã publish) | **Lớn** |
| **Audit trail** | 1 record trên Course entity (overwrite) | Bảng riêng `course_review_events` lưu full history | **Lớn** |
| **Release notes** | Không có | Text field trên mỗi publication version | **Trung bình** |
| **Notification** | Không có (teacher phải tự kiểm tra) | Email + in-app notification khi approved/rejected | **Lớn** |
| **Rejection feedback** | Single textarea, không structured | Checklist categories + inline comments + suggestions | **Trung bình** |
| **Bulk operations** | Có (bulk approve/reject) | Có + granular error details per item | **Nhỏ** (đã có) |
| **Org-scoped review** | Có (ORG_ADMIN scoped) | Có + separate queues per org | **Nhỏ** (đã có) |
| **Version rollback** | Snapshot system hỗ trợ (chưa expose UI) | Product decision, không phải gap kỹ thuật | **N/A** |
| **Vietnamese UI text** | ASCII không dấu toàn bộ review page | Tiếng Việt có dấu chuẩn Unicode | **P1 UX bug** |

### 2.2 Chi tiết SOTA patterns (từ các nền tảng lớn)

#### A. Content Review UI — Preview + Diff

**Industry pattern** (Canvas Blueprint, Coursera Partner Portal, edX Studio):
- Admin xem **full course content** ngay trong trang review, không cần rời trang
- Có **diff view** giữa bản draft và bản đã publish (nếu là update submission)
- Preview content hiện: tất cả chapters, lessons, quizzes, assignments
- Inline action: approve/reject ngay từ preview panel

**Hệ thống hiện tại**: "Xem nội dung" → `router.navigate(['/admin/courses', id, 'preview'])` — rời khỏi trang review hoàn toàn. Admin phải mở tab mới hoặc mất context.

#### B. Rejection Workflow — Structured Feedback

**Industry pattern** (Moodle Course Approval, Coursera Quality Rubric):
- **Category-based feedback**: Nội dung thiếu, chất lượng video, bài kiểm tra không đủ, metadata sai
- **Checklist**: Admin tick các mục cần sửa, teacher thấy rõ cần làm gì
- **Inline annotations**: Comment trên từng chapter/lesson (advanced, không cần thiết phase 1)
- **Suggested revisions**: Template text cho lý do phổ biến

**Hệ thống hiện tại**: Một textarea duy nhất, không structured, không template.

#### C. Audit Trail — Full Review History

**Industry pattern** (Canvas Admin, Blackboard Ultra):
- Bảng `review_events` riêng: `{courseId, reviewerId, action, comment, timestamp}`
- Hiện timeline trong admin UI: "Nguyễn Văn A từ chối lúc 10:30 — Thiếu quiz chương 3"
- Teacher cũng thấy full history trên course editor
- Hỗ trợ compliance/audit (ai duyệt gì, khi nào)

**Hệ thống hiện tại**: Chỉ 3 field trên Course entity, overwrite mỗi lần. Multi-round review → mất history.

#### D. Notification System

**Industry pattern** (Google Classroom, Canvas):
- **Email**: Gửi khi APPROVED hoặc REJECTED (link tới course)
- **In-app notification**: Badge trên header + toast
- **Dashboard widget**: Teacher thấy "Khóa học X đã được duyệt" trên trang chủ

**Hệ thống hiện tại**: Không có notification nào. Teacher phải vào danh sách khóa học để kiểm tra trạng thái.

#### E. Version Management — Release Notes

**Industry pattern** (GitHub Releases, Coursera Session-based versioning):
- Mỗi publication có `release_notes` (text mô tả thay đổi)
- Teacher viết changelog khi submit for review
- Admin thấy release notes khi review update submission
- Learners thấy "Cập nhật mới: thêm quiz chương 5"

**Hệ thống hiện tại**: `CoursePublicationJpaEntity` chỉ có `snapshot`, `publicationNumber`, `publishedAt`, `publishedById`. Không có `notes` hay `changelog`.

---

## 3. Top 5 Gaps — Xếp hạng theo Impact

### Gap 1: Không có Audit Trail riêng (CRITICAL)

**Impact**: Compliance risk, mất lịch sử review, admin không thấy pattern từ chối
**Root cause**: Review data (comment, reviewer, timestamp) lưu trực tiếp trên Course entity → overwrite mỗi lần
**Proposed solution**:
- Tạo bảng `course_review_events(id, course_id, reviewer_id, action, comment, created_at)`
- Action enum: `SUBMITTED`, `APPROVED`, `REJECTED`, `REVOKED`, `CHANGES_REQUESTED`
- Domain: `ReviewEvent` value object trong Course aggregate
- UI: Timeline component hiển thị history cho cả admin và teacher
- **Scope**: 1 migration + 1 domain VO + modify 3 use cases + 1 FE component

### Gap 2: Không có Content Preview trong trang Review (HIGH)

**Impact**: Admin workflow kém hiệu quả — phải mở tab mới để xem nội dung
**Root cause**: Review page chỉ hiện metadata, không embed course content
**Proposed solution**:
- Thêm expandable preview panel trong detail modal (hoặc split-pane layout)
- Reuse published/draft content API đã có
- Hiển thị: chapters → lessons → content blocks (read-only)
- Nếu là update submission: highlight chapters/lessons có thay đổi
- **Scope**: FE only — reuse API `getPublishedContent()` + `getDraftContent()`

### Gap 3: Không có Notification khi Approve/Reject (HIGH)

**Impact**: Teacher không biết khi nào khóa học được duyệt/từ chối
**Root cause**: Domain events (`CourseApprovedEvent`, `CourseRejectedEvent`) phát ra nhưng không có handler tạo notification
**Proposed solution**:
- Event handler lắng nghe `CourseApprovedEvent` / `CourseRejectedEvent`
- Tạo in-app notification (đã có notification system)
- Optional: email notification (đã có `EmailService`)
- **Scope**: 2 event handlers + wire notification service

### Gap 4: Vietnamese không dấu trên toàn bộ Review UI (P1 UX)

**Impact**: Khó đọc, không chuyên nghiệp, inconsistent với phần còn lại của ứng dụng
**Root cause**: `course-review.component.html` viết ASCII Vietnamese xuyên suốt
**Danh sách lỗi cụ thể**:

| Dòng | Hiện tại | Sửa thành |
|------|----------|-----------|
| 6 | "Duyet khoa hoc" | "Duyệt khóa học" |
| 16 | "Tim kiem theo ten khoa hoc hoac giang vien..." | "Tìm kiếm theo tên khóa học hoặc giảng viên..." |
| 33 | "Tat ca" | "Tất cả" |
| 40 | "Cho duyet" | "Chờ duyệt" |
| 47 | "Da duyet" | "Đã duyệt" |
| 54 | "Bi tu choi" | "Bị từ chối" |
| 61 | "Nhap" | "Nháp" |
| 74 | "Khoa hoc" | "Khóa học" |
| 75 | "Giang vien" | "Giảng viên" |
| 76 | "Trang thai" | "Trạng thái" |
| 77 | "Thao tac" | "Thao tác" |
| 149 | "Xem noi dung" | "Xem nội dung" |
| 153 | "Xem chi tiet" | "Xem chi tiết" |
| 159 | "Duyet" | "Duyệt" |
| 164 | "Tu choi" | "Từ chối" |
| 178 | "Hien thi ... trong tong so ... khoa hoc" | "Hiển thị ... trong tổng số ... khóa học" |
| 185 | "Truoc" | "Trước" |
| 191 | "Sau" | "Sau" (OK) |
| 193 | "Trang" | "Trang" (OK) |
| 203 | "Khong tim thay khoa hoc nao" | "Không tìm thấy khóa học nào" |
| 216 | "Chi tiet khoa hoc" | "Chi tiết khóa học" |
| 217 | "Dong" | "Đóng" |
| 232 | "Ma khoa hoc" | "Mã khóa học" |
| 244 | "Thong tin giang vien" | "Thông tin giảng viên" |
| 246 | "Ten:" | "Tên:" |
| 257 | "Chuong" | "Chương" |
| 262 | "Hoc vien" | "Học viên" |
| 268 | "Bai tap" | "Bài tập" |
| 275 | "Ngay tao:" | "Ngày tạo:" |
| 277 | "Ngay gui duyet:" | "Ngày gửi duyệt:" |
| 280 | "Ngay duyet:" | "Ngày duyệt:" |
| 283 | "Ly do tu choi:" | "Lý do từ chối:" |
| 294 | "Dong" | "Đóng" |
| 299 | "Duyet khoa hoc" | "Duyệt khóa học" |
| 302 | "Tu choi" | "Từ chối" |
| 315 | "Tu choi khoa hoc" | "Từ chối khóa học" |
| 320 | "Nhap ly do tu choi (bat buoc)..." | "Nhập lý do từ chối (bắt buộc)..." |
| 323 | "Huy" | "Hủy" |
| 326 | "Tu choi" | "Từ chối" |

**Scope**: FE only — 35+ strings cần sửa trong 1 file HTML

### Gap 5: Không có Release Notes cho Publications (MEDIUM)

**Impact**: Teacher không thể mô tả thay đổi giữa versions, admin review update không biết thay đổi gì
**Root cause**: `CoursePublicationJpaEntity` thiếu field `notes`
**Proposed solution**:
- Thêm `release_notes TEXT` vào bảng `course_publications` (migration)
- Teacher nhập release notes khi `submitForApproval()` cho update
- Admin thấy release notes trong review UI
- Learners thấy "What's new" khi version mới được publish
- **Scope**: 1 migration + modify submit use case + 2 FE changes

---

## 4. Version Management — Status Assessment

### Đã có (hoạt động tốt)

- **Immutable Snapshot**: Mỗi publication lưu full course state dạng JSONB
- **Version Mode**: `PINNED` (class cố định version) vs `FOLLOW_LATEST` (tự động cập nhật)
- **Update Available indicator**: Class pinned thấy badge "có bản cập nhật"
- **Publication Number**: Auto-increment per course
- **Content Version**: Incremented khi có thay đổi content

### Chưa có (cần đánh giá)

| Tính năng | Cần thiết? | Ghi chú |
|-----------|-----------|---------|
| **Release notes** | Có | Gap 5 ở trên |
| **Version diff UI** | Nice-to-have | So sánh 2 snapshot JSONB — phức tạp, Phase 2 |
| **Rollback** | Không cần thiết | Snapshot system đã hỗ trợ. Admin chỉ cần pin class vào version cũ |
| **Version label/tag** | Nice-to-have | "v1.0 Beta", "v2.0 Final" — aesthetic, không blocking |
| **Changelog auto-generate** | Phase 3 | Tự động diff 2 snapshots → list thay đổi |

### Rollback — Đã có khả năng kỹ thuật

Hệ thống snapshot hiện tại **đã hỗ trợ rollback** mà không cần code thêm:
- Class dùng `PINNED` mode + `courseVersionId` → trỏ tới publication cũ
- Admin chỉ cần expose UI cho phép chọn publication version cho class
- Đây là **product decision**, không phải missing capability

---

## 5. Implementation Roadmap

### Phase 1 — Quick Wins (1-2 sessions)
1. **Fix Vietnamese text** — 35+ strings trong `course-review.component.html` (Gap 4)
2. **Notification handlers** — Wire `CourseApprovedEvent` / `CourseRejectedEvent` vào notification system (Gap 3)

### Phase 2 — Core Improvements (2-3 sessions)
3. **Audit trail table** — `course_review_events` + timeline UI (Gap 1)
4. **Inline content preview** — Expandable panel trong review page (Gap 2)
5. **Release notes field** — Migration + UI cho submit/review flow (Gap 5)

### Phase 3 — Advanced (Future)
6. **Structured rejection** — Category checklist + template suggestions
7. **Version diff UI** — Side-by-side snapshot comparison
8. **Email notifications** — Ngoài in-app notification
9. **Auto-changelog** — Diff 2 JSONB snapshots tự động

---

## 6. Specific Questions Answered

| # | Câu hỏi | Trả lời |
|---|---------|---------|
| 1 | Admin approve → auto-publish có nên thêm "preview + confirm"? | **Có**. Thêm preview panel inline, không phải page mới. Confirm dialog hiện có đủ. |
| 2 | OrgAdmin có nên có approval queue riêng? | **Không cần thiết**. Org-scoped filter hiện tại đã đủ (ORG_ADMIN chỉ thấy course trong org). |
| 3 | Course publication có nên có release notes? | **Có**. Gap 5 — thêm `release_notes` field vào publications. |
| 4 | Version rollback có cần thiết? | **Không cần code thêm**. Snapshot system đã hỗ trợ qua PINNED mode. Chỉ cần expose UI. |
| 5 | Notification: email? in-app? cả hai? | **Phase 1: in-app**. Phase 3: email. Notification system đã có, chỉ cần wire event handlers. |
| 6 | Audit trail: riêng table hay dùng existing? | **Riêng table**. `course_review_events` — existing `reviewComment` trên Course overwrite nên không dùng được. |

---

*Tài liệu này là kết quả nghiên cứu CoT. Xem architecture patterns tại `2026-04-16-architecture-patterns-reference.md`.*
