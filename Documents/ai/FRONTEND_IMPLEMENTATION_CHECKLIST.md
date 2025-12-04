# ✅ CHECKLIST: AI CHAT IMPLEMENTATION

**Từ:** Team Backend LMS (PM)  
**Gửi:** Team Frontend LMS  
**Ngày:** 05/12/2025

---

## 📋 TỔNG QUAN

Checklist này liệt kê tất cả các tasks cần thực hiện để tích hợp AI Chat vào LMS Frontend.

---

## PHASE 1: NAVIGATION & ROUTING (Day 1-2)

### 1.1 Thêm Menu Items vào Sidebar
**File:** `fe/src/app/shared/components/navigation/sidebar.config.ts`

- [ ] Thêm menu item "Trợ Lý AI" vào `studentSidebarConfig.menuItems`
- [ ] Thêm menu item "Trợ Lý AI" vào `teacherSidebarConfig.menuItems`
- [ ] Thêm menu item "LMS AI" vào `adminSidebarConfig.menuItems`

**Code snippet:**
```typescript
// Thêm sau item "Tin nhắn" trong studentSidebarConfig
{
  label: 'Trợ Lý AI',
  route: '/student/ai-chat',
  icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
}
```

### 1.2 Cấu hình Routes
**Files cần tạo/sửa:**

- [ ] `fe/src/app/features/student/student.routes.ts` - Thêm route `/student/ai-chat`
- [ ] `fe/src/app/features/teacher/teacher.routes.ts` - Thêm route `/teacher/ai-chat`
- [ ] `fe/src/app/features/admin/admin.routes.ts` - Thêm route `/admin/ai-chat`

**Code snippet:**
```typescript
// Trong student.routes.ts
{
  path: 'ai-chat',
  loadComponent: () => import('../ai-chat/presentation/pages/ai-chat-full-page/ai-chat-full-page.component')
    .then(m => m.AiChatFullPageComponent)
}
```

---

## PHASE 2: FULL-PAGE CHAT COMPONENT (Day 3-4)

### 2.1 Tạo AI Chat Full Page Component
**Path:** `fe/src/app/features/ai-chat/presentation/pages/ai-chat-full-page/`

- [ ] `ai-chat-full-page.component.ts`
- [ ] `ai-chat-full-page.component.html` (nếu tách template)
- [ ] `ai-chat-full-page.component.scss` (nếu cần custom styles)

**Structure:**
```
ai-chat-full-page/
├── ai-chat-full-page.component.ts
└── index.ts
```

### 2.2 Tạo Chat Sidebar Component
**Path:** `fe/src/app/features/ai-chat/presentation/components/chat-sidebar/`

- [ ] `chat-sidebar.component.ts`
- [ ] Hiển thị danh sách sessions
- [ ] Button "Cuộc trò chuyện mới"
- [ ] Group sessions by date (Today, Yesterday, etc.)
- [ ] Hover actions (Rename, Delete)

### 2.3 Tạo Chat Main Area Component
**Path:** `fe/src/app/features/ai-chat/presentation/components/chat-main-area/`

- [ ] `chat-main-area.component.ts`
- [ ] Messages container với auto-scroll
- [ ] Welcome screen khi chưa có messages
- [ ] Loading indicator

---

## PHASE 3: MESSAGE COMPONENTS (Day 5-6)

### 3.1 Enhance Chat Message Component
**File:** `fe/src/app/features/ai-chat/presentation/components/chat-message/`

- [ ] User message styling
- [ ] AI message với Markdown rendering
- [ ] Source citations (collapsible)
- [ ] Suggested questions (clickable chips)
- [ ] Copy button
- [ ] Timestamp display

### 3.2 Enhance Chat Input Component
**File:** `fe/src/app/features/ai-chat/presentation/components/chat-message-input/`

- [ ] Auto-resize textarea
- [ ] Send button với disabled state
- [ ] Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- [ ] Loading state khi đang gửi

---

## PHASE 4: API INTEGRATION (Day 7-8)

### 4.1 Update Chat API Client
**File:** `fe/src/app/features/ai-chat/infrastructure/api/chat-api.client.ts`

- [ ] Verify `sendMessage()` method
- [ ] Verify `getSessions()` method
- [ ] Verify `getSessionMessages()` method
- [ ] Verify `createSession()` method
- [ ] Verify `deleteSession()` method
- [ ] Add error handling

### 4.2 Update Chat Service
**File:** `fe/src/app/features/ai-chat/application/services/chat.service.ts`

- [ ] Session management logic
- [ ] Message sending logic
- [ ] Error handling và retry
- [ ] Loading states

---

## PHASE 5: POLISH & TESTING (Day 9-10)

### 5.1 Responsive Design
- [ ] Desktop layout (sidebar visible)
- [ ] Tablet layout (collapsible sidebar)
- [ ] Mobile layout (sidebar as drawer)

### 5.2 Dark Mode Support
- [ ] Light mode styles
- [ ] Dark mode styles
- [ ] Theme toggle integration

### 5.3 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Focus management

### 5.4 Testing
- [ ] Unit tests cho components
- [ ] Integration tests cho API calls
- [ ] E2E tests cho user flows

---

---

## PHASE 6: ADMIN KNOWLEDGE MANAGEMENT (Day 11-16) - OPTIONAL

**Lưu ý:** Làm SAU khi hoàn thành AI Chat Page. Đây là tính năng Admin-only.

### 6.1 Thêm Menu Item cho Admin
**File:** `fe/src/app/shared/components/navigation/sidebar.config.ts`

- [ ] Thêm menu item "Quản lý Tri thức AI" vào `adminSidebarConfig.menuItems`

**Code snippet:**
```typescript
{
  label: 'Quản lý Tri thức AI',
  route: '/admin/ai-knowledge',
  icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'
}
```

### 6.2 Tạo Admin Knowledge Page
**Path:** `fe/src/app/features/admin/ai-knowledge/`

- [ ] `ai-knowledge-page.component.ts` - Container page
- [ ] `knowledge-stats.component.ts` - Thống kê tổng quan
- [ ] `knowledge-document-list.component.ts` - Danh sách documents
- [ ] `knowledge-upload.component.ts` - Upload PDF
- [ ] `delete-confirm-modal.component.ts` - Xác nhận xóa
- [ ] `ai-knowledge.service.ts` - API service

### 6.3 Features cần implement
- [ ] Hiển thị thống kê (documents, nodes, categories)
- [ ] Danh sách documents với pagination
- [ ] Upload PDF với drag & drop
- [ ] Category selector
- [ ] Delete document với confirmation
- [ ] Job status tracking

**Chi tiết:** Xem `Documents/ai/ADMIN_KNOWLEDGE_MANAGEMENT_SPEC.md`

---

## 📁 FILE STRUCTURE

```
fe/src/app/features/ai-chat/
├── application/
│   └── services/
│       ├── chat.service.ts          ✅ Exists
│       └── session-management.service.ts  ✅ Exists
├── domain/
│   ├── entities/
│   │   ├── chat-message.entity.ts   ✅ Exists
│   │   └── chat-session.entity.ts   ✅ Exists
│   └── types.ts                     ✅ Exists
├── infrastructure/
│   ├── api/
│   │   └── chat-api.client.ts       ✅ Exists
│   └── repositories/
│       └── chat-storage.repository.ts  ✅ Exists
├── presentation/
│   ├── components/
│   │   ├── chat-message/            ✅ Exists
│   │   ├── chat-message-input/      ✅ Exists
│   │   ├── chat-panel/              ✅ Exists
│   │   ├── chat-widget/             ✅ Exists
│   │   ├── chat-sidebar/            🆕 NEW
│   │   ├── chat-main-area/          🆕 NEW
│   │   ├── source-citation/         ✅ Exists
│   │   └── suggested-questions/     ✅ Exists
│   └── pages/
│       ├── chat-page/               ✅ Exists
│       └── ai-chat-full-page/       🆕 NEW
└── utils/
    ├── markdown-renderer.util.ts    ✅ Exists
    └── message-serializer.util.ts   ✅ Exists
```

---

## 🔗 API ENDPOINTS (Backend Ready)

### AI Chat APIs (All Roles)
| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Send Message | POST | `/api/v1/ai/chat` | ✅ Ready |
| Get Sessions | GET | `/api/v1/ai/sessions` | ✅ Ready |
| Get Messages | GET | `/api/v1/ai/sessions/{id}/messages` | ✅ Ready |
| Create Session | POST | `/api/v1/ai/sessions` | ✅ Ready |
| Delete Session | DELETE | `/api/v1/ai/sessions/{id}` | ✅ Ready |
| Health Check | GET | `/api/v1/ai/health` | ✅ Ready |

### Admin Knowledge Management APIs (Admin Only)
| Action | Method | Endpoint | Status |
|--------|--------|----------|--------|
| Get Stats | GET | `/api/v1/ai/admin/knowledge/stats` | ✅ Ready |
| List Documents | GET | `/api/v1/ai/admin/knowledge/list` | ✅ Ready |
| Upload Document | POST | `/api/v1/ai/admin/knowledge/upload` | ✅ Ready |
| Get Job Status | GET | `/api/v1/ai/admin/knowledge/jobs/{jobId}` | ✅ Ready |
| Delete Document | DELETE | `/api/v1/ai/admin/knowledge/{documentId}` | ✅ Ready |
| Delete User History | DELETE | `/api/v1/ai/admin/history/{userId}` | ✅ Ready |

---

## 📞 LIÊN HỆ

Nếu có thắc mắc về API hoặc requirements, liên hệ:
- **Backend Team:** PM (Kiro)
- **UX/UI:** Chuyên gia thiết kế

---

**Ghi chú:** Tài liệu chi tiết xem tại:
- `Documents/ai/FRONTEND_AI_CHAT_SPEC.md` - Spec đầy đủ
- `Documents/ai/UXUI_DESIGN_BRIEF.md` - Design brief cho UX/UI
- `Documents/AI_ADMIN_API_SPEC.md` - API specification
