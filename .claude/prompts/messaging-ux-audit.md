# Session Prompt: Messaging UX/UI Deep Audit

## Mục tiêu
Audit + cải thiện UX/UI của messaging system cho cả Student và Teacher portal theo chuẩn SOTA (Coursera, Slack, Canvas).

## BẮT BUỘC đọc trước:
1. **`CLAUDE.md`** — project overview
2. **`fe/UX_UI_GUIDELINES.md`** — design tokens, 8px rounded-lg, flat design, no 3D
3. **Memory** — WebSocket + Announcements đã implement (session 2026-04-08)

## Trạng thái hiện tại:
- WebSocket real-time: **HOẠT ĐỘNG** (STOMP native, ~0.5s delay)
- Student messaging: `/student/messages` — inbox + conversation view
- Teacher messaging: `/teacher/messages` — reuse student components
- Group Announcements: student tab "Thông báo", teacher `/teacher/announcements`
- Authorization: Student↔Teacher (enrolled), Teacher↔Admin, Admin↔All

## Cần audit + fix:

### Student Messaging (`/student/messages`):
- [ ] Conversation list UX — avatar, last message preview, unread badge
- [ ] Conversation view — message bubbles, input, send button
- [ ] Recipient picker modal — search, selection
- [ ] Announcement tab — list, read/unread, priority badges
- [ ] Empty states
- [ ] Loading skeleton (hiện chỉ có spinner)
- [ ] Mobile responsive
- [ ] Vietnamese text đúng dấu
- [ ] rounded-lg 8px (không rounded-xl)
- [ ] Không 3D effects
- [ ] Online/offline indicator cho user

### Teacher Messaging (`/teacher/messages`):
- [ ] Cùng components — verify hiện đúng
- [ ] Teacher context: hiện class/course info khi nhắn student
- [ ] Announcement creation form UX
- [ ] Sidebar "Tin nhắn" highlight

### SOTA Reference:
- **Coursera**: Simple inbox, conversation view, no fancy features
- **Slack**: Channel-based, rich text, file sharing (quá phức tạp cho LMS)
- **Canvas Inbox**: Role-based, course context, reply/forward
- **Best fit cho LMS**: Canvas pattern — simple 1-to-1, course context, clean UI

### Files cần xem:
- `fe/src/app/features/student/messages/student-inbox.component.ts`
- `fe/src/app/features/student/messages/conversation-view.component.ts`
- `fe/src/app/features/student/messages/conversation-list-item.component.ts`
- `fe/src/app/features/student/messages/message-recipient-picker.component.html`
- `fe/src/app/features/student/messages/announcement-list.component.ts`
- `fe/src/app/shared/components/message-bubble.component.ts`
- `fe/src/app/shared/components/message-input.component.ts`
- `fe/src/app/core/services/messaging.service.ts`
- `fe/src/app/core/services/websocket.service.ts`
- `fe/src/app/core/services/announcement.service.ts`

### Test accounts:
- Student: `nguyenvanan@sv.maritime.edu` / `Student@2026`
- Teacher: `tranngocdai@maritime.edu` / `Maritime@2026`
- Admin: `admin@maritime.edu` / `admin123` (nếu cần)

### Quy tắc:
- Dùng RTK prefix cho Bash commands
- Test trên browser (Playwright hoặc manual)
- Commit thường xuyên
- Backend đang chạy Docker, FE đang `npm start`
