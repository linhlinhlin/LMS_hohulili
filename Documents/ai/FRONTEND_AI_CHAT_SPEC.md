# 📋 SPEC: AI CHAT INTERFACE - FULL PAGE CHATBOT

**Từ:** Team Backend LMS (PM)  
**Gửi:** Team Frontend LMS  
**CC:** Chuyên gia UX/UI  
**Ngày:** 05/12/2025  
**Độ ưu tiên:** 🔴 HIGH

---

## 🎯 MỤC TIÊU

Xây dựng trang AI Chat hoàn chỉnh giống ChatGPT/Gemini/Claude, tích hợp vào LMS cho tất cả roles (Student, Teacher, Admin).

---

## 📍 YÊU CẦU NAVIGATION

### 1. Thêm Menu Item vào Sidebar

**File cần sửa:** `fe/src/app/shared/components/navigation/sidebar.config.ts`

**Tất cả roles cần có menu item "Trợ Lý AI" trong sidebar:**

| Role | Config Variable | Menu Item | Route |
|------|-----------------|-----------|-------|
| **Student** | `studentSidebarConfig` | "Trợ Lý AI" | `/student/ai-chat` |
| **Teacher** | `teacherSidebarConfig` | "Trợ Lý AI" | `/teacher/ai-chat` |
| **Admin** | `adminSidebarConfig` | "LMS AI" | `/admin/ai-chat` |

**Icon SVG Path (Robot/AI icon):**
```typescript
'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
```

**Vị trí đề xuất:** 
- Student: Sau "Tin nhắn", trước "Thảo luận"
- Teacher: Sau "Thông báo" (cuối menu)
- Admin: Sau "Thông báo", trước "Nhật ký hệ thống"

**Code mẫu thêm vào `studentSidebarConfig.menuItems`:**
```typescript
{
  label: 'Trợ Lý AI',
  route: '/student/ai-chat',
  icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  badge: 'NEW' // Optional: hiển thị badge "NEW" để thu hút attention
}
```

---

## 🏗️ KIẾN TRÚC TRANG

### Layout Structure (Giống ChatGPT)

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER (Optional)                        │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│   SIDEBAR    │              MAIN CHAT AREA                       │
│   (280px)    │                                                   │
│              │  ┌─────────────────────────────────────────────┐ │
│ ┌──────────┐ │  │                                             │ │
│ │+ New Chat│ │  │           MESSAGES CONTAINER                │ │
│ └──────────┘ │  │           (Scrollable)                      │ │
│              │  │                                             │ │
│ ┌──────────┐ │  │  ┌─────────────────────────────────────┐   │ │
│ │ Today    │ │  │  │ 👤 User Message                     │   │ │
│ │ ────────│ │  │  └─────────────────────────────────────┘   │ │
│ │ Chat 1  │ │  │                                             │ │
│ │ Chat 2  │ │  │  ┌─────────────────────────────────────┐   │ │
│ └──────────┘ │  │  │ 🤖 AI Response (Markdown)          │   │ │
│              │  │  │    + Sources                        │   │ │
│ ┌──────────┐ │  │  │    + Suggested Questions           │   │ │
│ │ Yesterday│ │  │  └─────────────────────────────────────┘   │ │
│ │ ────────│ │  │                                             │ │
│ │ Chat 3  │ │  └─────────────────────────────────────────────┘ │
│ └──────────┘ │                                                   │
│              │  ┌─────────────────────────────────────────────┐ │
│              │  │              INPUT AREA                      │ │
│              │  │  ┌───────────────────────────────┐ ┌──────┐ │ │
│              │  │  │ Nhập câu hỏi...               │ │ Send │ │ │
│              │  │  └───────────────────────────────┘ └──────┘ │ │
│              │  └─────────────────────────────────────────────┘ │
├──────────────┴──────────────────────────────────────────────────┤
│                         FOOTER (Optional)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 COMPONENTS CẦN XÂY DỰNG

### 1. AI Chat Page (Container)
**File:** `fe/src/app/features/ai-chat/presentation/pages/ai-chat-full-page/`

```typescript
// ai-chat-full-page.component.ts
@Component({
  selector: 'app-ai-chat-full-page',
  template: `
    <div class="ai-chat-container">
      <app-chat-sidebar 
        [sessions]="sessions()"
        [activeSessionId]="activeSessionId()"
        (newChat)="onNewChat()"
        (selectSession)="onSelectSession($event)"
        (deleteSession)="onDeleteSession($event)"
      />
      <app-chat-main-area
        [messages]="messages()"
        [isLoading]="isLoading()"
        (sendMessage)="onSendMessage($event)"
        (selectSuggestion)="onSelectSuggestion($event)"
      />
    </div>
  `
})
```

### 2. Chat Sidebar
**File:** `fe/src/app/features/ai-chat/presentation/components/chat-sidebar/`

**Features:**
- Button "Cuộc trò chuyện mới" (+ New Chat)
- Danh sách sessions grouped by date (Today, Yesterday, Previous 7 days)
- Hover actions: Rename, Delete
- Active session highlight
- Collapsible on mobile

### 3. Chat Main Area
**File:** `fe/src/app/features/ai-chat/presentation/components/chat-main-area/`

**Features:**
- Messages container với auto-scroll
- Welcome screen khi chưa có messages
- Loading indicator khi AI đang xử lý

### 4. Message Bubble (Enhanced)
**File:** `fe/src/app/features/ai-chat/presentation/components/chat-message/`

**User Message:**
- Avatar + Username
- Message text
- Timestamp

**AI Message:**
- AI Avatar/Icon
- Markdown rendered content (code blocks, tables, lists)
- Source citations (collapsible)
- Suggested questions (clickable chips)
- Copy button
- Regenerate button (optional)

### 5. Chat Input (Enhanced)
**File:** `fe/src/app/features/ai-chat/presentation/components/chat-message-input/`

**Features:**
- Auto-resize textarea
- Send button (disabled when empty)
- Keyboard shortcut: Enter to send, Shift+Enter for newline
- Character limit indicator (optional)
- Attachment button (future)

---

## 🎨 UI/UX REQUIREMENTS

### Color Scheme
```css
/* Light Mode */
--chat-bg: #f7f7f8;
--sidebar-bg: #202123;
--user-msg-bg: #ffffff;
--ai-msg-bg: #f7f7f8;
--input-bg: #ffffff;
--primary-accent: #10a37f; /* Green like ChatGPT */

/* Dark Mode */
--chat-bg: #343541;
--sidebar-bg: #202123;
--user-msg-bg: #343541;
--ai-msg-bg: #444654;
--input-bg: #40414f;
```

### Typography
- Message text: 16px, line-height 1.6
- Code blocks: Monospace font, syntax highlighting
- Timestamps: 12px, muted color

### Animations
- Message appear: Fade in + slide up
- AI typing indicator: Pulsing dots
- Sidebar collapse: Smooth transition

### Responsive Breakpoints
- Desktop: Sidebar visible (280px)
- Tablet: Sidebar collapsible
- Mobile: Sidebar as overlay/drawer

---

## 🔌 API INTEGRATION

### Endpoints đã sẵn sàng từ Backend:

| Action | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| Send Message | POST | `/api/v1/ai/chat` | Gửi tin nhắn, nhận response |
| Get Sessions | GET | `/api/v1/ai/sessions` | Lấy danh sách sessions |
| Get Messages | GET | `/api/v1/ai/sessions/{id}/messages` | Lấy messages của session |
| Create Session | POST | `/api/v1/ai/sessions` | Tạo session mới |
| Delete Session | DELETE | `/api/v1/ai/sessions/{id}` | Xóa session |
| Health Check | GET | `/api/v1/ai/health` | Kiểm tra AI service |

### Request/Response Format:

**Send Message Request:**
```json
{
  "message": "Giải thích quy tắc 15 COLREGs",
  "sessionId": "session_123"  // Optional, auto-create if null
}
```

**Send Message Response:**
```json
{
  "status": "success",
  "data": {
    "messageId": "msg_456",
    "sessionId": "session_123",
    "answer": "**Quy tắc 15 (Cắt hướng):**\n...",
    "sources": [
      {"title": "COLREGs Rule 15", "content": "..."}
    ],
    "suggestedQuestions": [
      "Tàu nào phải nhường đường?",
      "Quy tắc 15 áp dụng khi nào?"
    ]
  },
  "metadata": {
    "agentType": "rag",
    "processingTime": 2.5
  }
}
```

---

## 📱 MOBILE CONSIDERATIONS

### Touch Interactions
- Swipe right to open sidebar
- Swipe left to close sidebar
- Long press on message for options (copy, delete)

### Keyboard Handling
- Auto-focus input when page loads
- Keyboard should not cover input area
- Smooth scroll when keyboard appears

---

## ✅ ACCEPTANCE CRITERIA

### Must Have (P0)
- [ ] Menu item "Trợ Lý AI" trong sidebar của Student, Teacher, Admin
- [ ] Full-page chat interface với sidebar và main area
- [ ] Gửi/nhận messages với AI Backend
- [ ] Hiển thị markdown trong AI responses
- [ ] Session management (create, list, delete)
- [ ] Responsive design (desktop, tablet, mobile)

### Should Have (P1)
- [ ] Source citations hiển thị collapsible
- [ ] Suggested questions clickable
- [ ] Dark/Light mode support
- [ ] Loading states và animations
- [ ] Error handling với retry option

### Nice to Have (P2)
- [ ] Copy message button
- [ ] Regenerate response button
- [ ] Search trong chat history
- [ ] Export conversation
- [ ] Keyboard shortcuts

---

## 🗓️ TIMELINE ĐỀ XUẤT

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1** | Sidebar menu items + Basic page layout | 2 days |
| **Phase 2** | Chat sidebar + Session management | 2 days |
| **Phase 3** | Message display + Markdown rendering | 2 days |
| **Phase 4** | Input component + API integration | 2 days |
| **Phase 5** | Polish + Responsive + Testing | 2 days |

**Total:** ~10 working days

---

## 📎 REFERENCES

- ChatGPT UI: https://chat.openai.com
- Claude UI: https://claude.ai
- Gemini UI: https://gemini.google.com

---

**Ghi chú:** Backend APIs đã sẵn sàng. Team Frontend có thể bắt đầu ngay. Nếu cần clarification, liên hệ PM.
