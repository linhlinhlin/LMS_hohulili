# Session Prompt: WebSocket Real-time + Group Announcements

## Mục tiêu
Nâng cấp messaging system từ polling → WebSocket real-time, và thêm Group Announcements (teacher → all students).

## Trước khi bắt đầu — BẮT BUỘC đọc:
1. **`CLAUDE.md`** — project overview, architecture
2. **`fe/UX_UI_GUIDELINES.md`** — design tokens, border-radius 8px, flat design
3. **`backend/README.md`** — backend architecture
4. **Messaging files hiện tại**:
   - BE Controller: `backend/.../communication/infrastructure/web/CommunicationControllerV3.java`
   - BE Authorization: `backend/.../communication/application/service/MessageAuthorizationService.java`
   - BE Send: `backend/.../communication/application/usecase/SendMessageUseCaseV3.java`
   - FE Service: `fe/src/app/core/services/messaging.service.ts`
   - FE Inbox: `fe/src/app/features/student/messages/student-inbox.component.ts`
   - FE Chat: `fe/src/app/features/student/messages/conversation-view.component.ts`

## SOTA Reference (Coursera/Canvas pattern):
- **Coursera**: WebSocket cho message delivery, announcements riêng tab
- **Canvas**: "Inbox" (1-to-1) + "Announcements" (course-wide), WebSocket notifications
- **Moodle**: Event-based messaging + forum announcements

## Phần 1: WebSocket Real-time Messaging

### Backend (Spring WebSocket + STOMP):
```
1. Thêm spring-boot-starter-websocket dependency
2. WebSocketConfig: STOMP endpoint /ws, broker /topic + /queue
3. JWT authentication cho WebSocket handshake
4. MessageController: @MessageMapping for send, @SubscribeMapping for conversations
5. Khi POST /send → broadcast qua STOMP /topic/conversation/{id}
6. Unread count update qua /user/queue/notifications
```

### Frontend (Angular WebSocket):
```
1. WebSocketService: connect/disconnect, auto-reconnect, JWT auth
2. Thay polling 5s → WebSocket subscription per conversation
3. Real-time message appear + unread badge update
4. Fallback: nếu WebSocket fail → revert polling (graceful degradation)
5. Online/offline indicator cho user trong conversation
```

### Authorization matrix (KHÔNG thay đổi):
| Gửi \ Nhận | Student | Teacher | Org Admin | Admin |
|-------------|---------|---------|-----------|-------|
| Student     | ❌      | ✅ enrolled | ❌     | ❌    |
| Teacher     | ✅ enrolled | ❌  | ✅ cùng org | ✅ |
| Org Admin   | ✅ cùng org | ✅ cùng org | ❌  | ✅    |
| Admin       | ✅ all  | ✅ all  | ✅ all    | ✅ all |

## Phần 2: Group Announcements

### Domain Model:
```java
Announcement {
  id: UUID
  courseId: UUID (hoặc classId)
  authorId: UUID (teacher/admin)
  title: String
  content: String (rich text)
  priority: NORMAL | IMPORTANT
  publishedAt: Instant
  targetType: COURSE | CLASS | ALL_STUDENTS
}
```

### Backend:
```
1. AnnouncementJpaEntity + AnnouncementRepository
2. CreateAnnouncementUseCase (teacher/admin only)
3. GET /api/v3/announcements?courseId={id} — student xem
4. POST /api/v3/announcements — teacher tạo
5. WebSocket broadcast khi announcement mới
6. Flyway migration cho announcements table
```

### Frontend:
```
1. Thêm tab "Thông báo" trong messaging page (Inbox | Thông báo)
2. Announcement list: grouped by course, sorted by date
3. Teacher: "Gửi thông báo" button → compose form
4. Student: read-only list, mark as read
5. Badge count cho unread announcements
```

### UX/UI theo Guidelines:
- Cards: `rounded-lg` (8px), `border border-gray-200 shadow-sm`
- No 3D effects (no border-left colored, no border-top colored)
- Skeleton loading
- Mobile responsive
- Vietnamese có dấu cho tất cả strings
- Sidebar: "Tin nhắn" highlight cho cả /messages và /announcements

## Thứ tự triển khai:
1. WebSocket backend config + auth (1 ngày)
2. WebSocket FE service + integrate messaging (1 ngày)
3. Announcements domain + API (0.5 ngày)
4. Announcements FE UI (1 ngày)
5. E2E testing (0.5 ngày)

## Lưu ý quan trọng:
- Dùng RTK prefix cho mọi Bash command
- Test trên cả desktop và mobile
- Commit thường xuyên
- Backend: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db backend`
- Frontend: `cd fe && npm start`
- Test accounts: xem CLAUDE.md
```
