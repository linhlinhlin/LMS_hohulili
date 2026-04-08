# Session Prompt: UX/UI Overhaul — Quản lý bộ nhớ + Student pages còn lại

## Context
Session trước (2026-04-07→08) đã audit + fix 22 trang/component. Session messaging UX đang chạy song song. Session này tiếp tục đồng bộ UX/UI.

## BẮT BUỘC đọc trước:
1. **`CLAUDE.md`** — project overview, architecture, test accounts
2. **`fe/UX_UI_GUIDELINES.md`** — TOÀN BỘ quy tắc thiết kế (đọc kỹ, đây là nguồn chân lý)
3. **Memory** — kiểm tra sessions trước để không làm lại

## Quy tắc thiết kế (tóm tắt — chi tiết trong UX_UI_GUIDELINES.md):
- **Cards**: `rounded-lg` (8px) — KHÔNG `rounded-xl`
- **Sidebar**: Flat design (background + font-weight) — KHÔNG `border-left: 3px solid`
- **Vietnamese**: Luôn có dấu, viết hoa chữ đầu danh mục, "Miễn phí" (lowercase p)
- **Pagination**: < 50 items → Load More button hoặc show all. > 50 → flanking pagination
- **Quiz result**: Show ALL questions (không pagination)
- **Grades page**: Show ALL items per course (không collapse)
- **Tasks page**: Collapse per group OK (5 items + expand)
- **Mobile**: Bottom bar 5 tabs (AI center), header minimal, 44px touch targets
- **Loading**: Skeleton placeholders (không chỉ spinner)
- **No 3D effects**: Không border-t-4 colored, không border-l-3px colored
- **Icons**: SVG inline hoặc `<app-icon>` — KHÔNG emoji

## Trang cần tiếp tục:

### Ưu tiên 1: Storage page deep audit
- [ ] `/student/storage` — E2E test download flow
- [ ] Kiểm tra logic dung lượng: ước tính vs thực tế (dialog 51MB vs storage nhỏ hơn)
- [ ] Cảnh báo đầy bộ nhớ (≥80% vàng, ≥95% đỏ, >90% block download)
- [ ] Sync flow: pending → synced, failed → retry, conflict → resolve
- [ ] Mobile responsive
- [ ] Labels đã fix: "Nội dung học", "Video đã tải", "Chờ đồng bộ", "Còn trống"
- [ ] Helper text cho sync status cards

### Ưu tiên 2: Student pages chưa audit
- [ ] `/student/browse` — Khám phá khóa học
- [ ] `/student/profile` — Hồ sơ cá nhân
- [ ] `/student/analytics` — Phân tích học tập
- [ ] `/student/payments` — Lịch sử thanh toán
- [ ] `/student/learn/course/:id` — Learning page (video + content)

### Ưu tiên 3: Teacher pages
- [ ] `/teacher/dashboard` — Dashboard giảng viên
- [ ] `/teacher/courses` — Quản lý khóa học
- [ ] `/teacher/students` — Quản lý học viên (vừa merge từ codex branch)
- [ ] `/teacher/assessments` — Assignment hub
- [ ] `/teacher/messages` — Tin nhắn (vừa thêm route)
- [ ] `/teacher/announcements` — Thông báo

### Ưu tiên 4: Admin pages
- [ ] `/admin/dashboard`
- [ ] `/admin/users`
- [ ] `/admin/courses`

## Cách tiếp cận — TỪNG TRANG MỘT:
1. Đọc code component
2. Screenshot desktop + mobile (dùng `agent-browser`)
3. Audit theo UX_UI_GUIDELINES.md
4. Fix issues
5. Test E2E
6. Commit

## Lưu ý:
- Session messaging UX đang chạy song song — KHÔNG sửa files trong `fe/src/app/features/student/messages/`
- Backend Docker đang chạy — chỉ rebuild nếu cần
- Frontend: `cd fe && npm start`
- Dùng `agent-browser` SKILL cho screenshot + E2E test
- Commit thường xuyên với message rõ ràng
- Dùng RTK prefix cho Bash commands

## Test accounts:
- Student: `nguyenvanan@sv.maritime.edu` / `Student@2026`
- Teacher: `tranngocdai@maritime.edu` / `Maritime@2026`
- Admin: xem CLAUDE.md
