# Session Prompt: UX/UI Overhaul — Từng trang, từng phần

## Mục tiêu
Cải thiện toàn bộ UX/UI dự án LMS Maritime theo chuẩn SOTA (Coursera, Canvas, Moodle), đồng bộ design token system, đảm bảo mọi trang đều professional và consistent.

## Trước khi bắt đầu — BẮT BUỘC đọc:
1. **`CLAUDE.md`** — project overview, architecture, design tokens
2. **`fe/FRONTEND_ARCHITECTURE.md`** — Angular 20 conventions, component patterns
3. **`MEMORY.md`** — session history, decisions đã có
4. **Design Token Reference**: Primary `#0056D2`, Hover `#004BB5`, Cards `bg-white rounded-xl border border-gray-200 shadow-sm`, Page BG `bg-slate-50`, Container `max-w-[1400px] mx-auto px-4 sm:px-6 py-6`

## Cách tiếp cận — TỪNG TRANG MỘT
Không sửa tất cả cùng lúc. Mỗi lần focus 1 trang/section:
1. Screenshot trang hiện tại (dùng `agent-browser` SKILL)
2. Audit UX/UI issues (dùng `audit` hoặc `critique` SKILL)
3. Nghiên cứu SOTA reference (dùng `cot-research` SKILL)
4. Implement fixes (dùng `angular-v20-frontend` SKILL cho FE conventions)
5. Test E2E (dùng `agent-browser` SKILL)
6. Screenshot sau khi fix → so sánh before/after

## Thứ tự ưu tiên trang cần cải thiện:
### Student Pages
- [ ] `/student/courses` — Course browse/library
- [ ] `/student/courses/:id` — Course detail page
- [ ] `/student/learn/course/:id` — Learning page (video + content)
- [ ] `/student/tasks` — Bài cần làm (2 tabs)
- [ ] `/student/results` — Bảng điểm (đã redesign VMU-style)
- [ ] `/student/quiz/take/:id` — Quiz taking (đã improve nhiều)
- [ ] `/student/quiz/result` — Quiz result (đã redesign Coursera-style)
- [ ] Student profile, messages, analytics

### Teacher Pages
- [ ] `/teacher/dashboard` — Teacher dashboard
- [ ] `/teacher/courses` — Course management
- [ ] `/teacher/course-editor/:id` — Course editor (complex)
- [ ] `/teacher/assessments/classes/assignments` — Assignment hub
- [ ] `/teacher/assessments/classes/quizzes` — Quiz list (đã improve tabs)
- [ ] `/teacher/assessments/classes/quizzes/:id/*` — Quiz detail tabs (đã implement)
- [ ] `/teacher/assessments/shared/question-bank` — Question bank
- [ ] `/teacher/quiz/*` — Quiz editor, question editor
- [ ] Teacher analytics, students, revenue

### Admin Pages
- [ ] `/admin/dashboard` — Admin dashboard
- [ ] `/admin/users` — User management
- [ ] `/admin/courses` — Course management

### Public Pages
- [ ] Landing page (`/`)
- [ ] Auth pages (`/auth/login`, `/auth/register`)
- [ ] Course catalog (`/courses`)

## Skills nên dùng:
- **`agent-browser`** — screenshot + E2E test trên browser
- **`audit`** — accessibility, performance, responsive audit
- **`critique`** — UX evaluation, visual hierarchy
- **`polish`** — final quality pass (alignment, spacing, consistency)
- **`normalize`** — ensure design system consistency
- **`angular-v20-frontend`** — Angular conventions (signals, OnPush, inject())
- **`cot-research`** — nghiên cứu SOTA khi cần reference
- **`frontend-design`** — tạo UI mới chất lượng cao
- **`harden`** — error handling, edge cases, i18n
- **`optimize`** — performance (lazy loading, bundle size)

## Lưu ý quan trọng:
- **Dùng RTK** prefix cho mọi Bash command (`rtk git status`, `rtk docker ps`)
- **Không sửa chắp vá** — mỗi trang sửa hoàn chỉnh
- **Test trên browser** sau mỗi thay đổi
- **Commit thường xuyên** với message rõ ràng
- **Tiếng Việt có dấu** cho mọi UI text
- **OnPush + Signals** cho mọi component
- **Không icon thừa** — clean, text-based, meaningful
- Backend: `http://localhost:8088` | Frontend: `http://localhost:4200`

## Session trước đã hoàn thành:
- Quiz management overhaul (Canvas/Moodle patterns)
- Student gradebook VMU-style
- Quiz result Coursera-style
- Teacher quiz detail tabs (results, details, history)
- Toggle công bố điểm, xóa attempt, enrolled students
- DOCX import with preview (multi-type: single/multiple/true-false + images)
- RTK installed v0.35.0
