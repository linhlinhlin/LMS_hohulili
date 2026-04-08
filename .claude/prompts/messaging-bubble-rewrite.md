# Session Prompt: Message Bubble Clean Rewrite + Pretext Integration

## Mục tiêu
Clean rewrite chat UI từ đầu — pixel-perfect Messenger desktop pattern.
Session trước tích lũy quá nhiều incremental fix → layout conflicts. Cần viết lại sạch.

## BẮT BUỘC đọc trước:
1. **`CLAUDE.md`** — project overview
2. **`fe/UX_UI_GUIDELINES.md`** — design tokens, 8px rounded-lg cards (nhưng 18px cho chat bubbles)
3. **Memory** — WebSocket, reactions, recall, reply đã implement

## Trạng thái hiện tại — CÁI GÌ HOẠT ĐỘNG:
- ✅ Backend: reactions (V108), recall (V109-V110), reply (V111), avatar, WS broadcast
- ✅ Frontend: ngx-emoji-mart picker, WebSocket service, MessagingService, AnnouncementService
- ✅ API: send, reply, recall, reactions — all tested OK
- ❌ Frontend message-bubble: layout conflicts, incremental CSS quá nhiều

## Vấn đề cần fix (ưu tiên):

### P0 — Layout & Rendering
1. **Emoji-only messages** — tin nhắn 1-3 emoji cần hiện **LỚN 32-40px**, KHÔNG có bubble bg
2. **Reply visual block** — Messenger pattern: quoted block NỐI LIỀN reply bubble
3. **Old text replies** `[Trả lời ...]` cần data migration → `replyToId`
4. **Inline toolbar** — cạnh bubble (cùng hàng), KHÔNG phải trên đầu

### P1 — Interaction
5. **Quick reaction picker** — popup 👍❤️😂😮😢 từ 😀 icon
6. **Mobile: long-press** popup thay inline toolbar
7. **Swipe-to-reply** mobile (vuốt phải > 50px)
8. **Click quoted → scroll smooth** tới tin nhắn gốc + highlight flash
9. **Scroll-to-bottom ↓ button** khi cuộn lên > 200px

### P2 — Polish
10. **Input area**: Messenger layout `[Textarea] [😀] [👍/▶]`
11. **Reply preview bar** giữa messages và input
12. **Message status**: sending→sent→read→failed (WhatsApp icons)

---

## 🔬 Pretext Integration (Tùy chọn — Đánh giá trước khi implement)

### Pretext là gì?
[GitHub: chenglou/pretext](https://github.com/chenglou/pretext) — 15KB zero-dep TypeScript library cho text measurement & layout **KHÔNG cần DOM reflow**.

### Tại sao relevant cho chat UI?
- **Root cause** của layout conflicts: text measurement bằng DOM → reflow → layout shift → incremental fix vòng lặp
- Pretext tính toán **chính xác** height mỗi message bubble **trước khi render** → virtualized list hoạt động perfect
- Performance: `prepare()` 17ms/500 texts (1 lần), `layout()` 0.1ms/500 texts (resize hot path)
- So sánh: DOM measurement 30ms+ per frame vs Pretext ~0.0002ms per call = **1500x faster**

### Key APIs:
```typescript
import { prepare, layout } from 'pretext';

// Phase 1: đo text 1 lần (cache)
const prepared = prepare(messageText, '14px Inter');

// Phase 2: tính height cho bất kỳ width (pure arithmetic, no DOM)
const { height, lineCount } = layout(prepared, containerWidth, 20);
// → Biết chính xác bubble height trước khi mount DOM
```

### Chat virtualization pattern:
```typescript
// Khi fetch messages từ API → prepare tất cả text
messages.forEach(msg => {
  msg._prepared = prepare(msg.content, '14px Inter');
});

// Khi render/resize → tính height mỗi bubble
const bubbleHeight = layout(msg._prepared, chatWidth * 0.65, 20).height + padding;
// → Feed vào virtual scroll → chỉ render visible messages
```

### Rich text (mentions, mixed fonts):
```typescript
const prepared = prepareRichInline([
  { text: 'Chào ', font: '14px Inter' },
  { text: '@GiảngViên', font: '700 14px Inter', break: 'never' }
]);
```

### Đánh giá: Nên dùng Pretext khi nào?
| Trường hợp | Nên? | Lý do |
|------------|------|-------|
| < 100 messages | ❌ | DOM measurement đủ nhanh |
| > 500 messages, scroll performance | ✅ | Virtualization cần exact height |
| Responsive resize | ✅ | Instant height recalc |
| Emoji-only detection + sizing | ✅ | Biết text width trước render |
| Streaming AI messages | ✅ | Height prediction real-time |

### Demo tham khảo:
- [Markdown Chat Demo](https://chenglou.me/pretext/markdown-chat/) — full virtualized chat
- Dùng absolute positioning, chỉ render visible messages, smooth scroll

### Phân tích thành thật — Pretext vs vấn đề thực tế:

**90% vấn đề hiện tại** = CSS/template complexity (quá nhiều incremental patch) → cần **clean rewrite component**.
**10% vấn đề** = scroll performance, height prediction → Pretext giải quyết.

Pretext là công nghệ rất tốt nhưng **không phải silver bullet** cho layout conflicts hiện tại. Nó giải quyết text measurement — mà root cause thực sự là component design phức tạp.

### Recommendation:
- **Bước 1 (BẮT BUỘC)**: Clean rewrite bubble + input + conversation-view — CSS đúng từ đầu, template đơn giản, KHÔNG patch thêm. Đây giải quyết 90% vấn đề.
- **Bước 2 (TÙY CHỌN, sau khi Bước 1 xong)**: Integrate Pretext nếu cần scroll performance hoặc chuẩn bị cho AI chat streaming. LMS conversation thường 10-50 messages → chưa urgent.
- **Bước 3 (TƯƠNG LAI)**: Nếu thêm AI chat hoặc conversation > 200 messages → Pretext + virtualized scroll là essential.

---

## Tham khảo Messenger Desktop Layout:

### Conversation View:
```
┌──────────────────────────────────────────┐
│ [←] [Avatar 36px] Name / Role    [⋯]   │  ← Header 56px, sticky
├──────────────────────────────────────────┤
│                                          │
│  Sender Name                             │
│  ┌─────────────┐                         │
│  │ bubble text  │  [😀] [↩] [⋮]         │  ← inline toolbar cạnh bubble
│  └─────────────┘                         │
│  ❤️ 2  😂                               │  ← reaction chips dưới bubble
│                                          │
│              ┌─────────────┐             │
│              │  own bubble  │  ← 14:30 ✓ │  ← status icon + timestamp
│              └─────────────┘             │
│                                          │
│  ↩ Bạn đã trả lời                       │
│  ┌─ Sender ──────────┐                  │
│  │ quoted (bg nhạt)   │                  │  ← clickable → scroll to original
│  ├────────────────────┤                  │
│  │ reply (bg đậm)     │                  │  ← nối liền, không gap
│  └────────────────────┘                  │
│                                          │
│  😊                                     │  ← emoji-only: LARGE 40px, no bg
│                                          │
│         [↓]                              │  ← scroll-to-bottom (khi cuộn lên)
├──────────────────────────────────────────┤
│ [Reply preview: ↩ Đang trả lời...] [✕]  │  ← reply bar (nếu đang reply)
├──────────────────────────────────────────┤
│  [____Textarea pill____]  [😀]  [👍/▶]  │  ← Input 48px, sticky bottom
│        Enter gửi · Shift+Enter xuống    │
└──────────────────────────────────────────┘
```

### Emoji-only detection:
```typescript
function isEmojiOnly(text: string): boolean {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+$/u;
  return emojiRegex.test(text.trim()) && [...text.trim()].length <= 6;
}
// "😊"     → true (render 40px, no bg)
// "👍❤️"  → true
// "Hi 😊"  → false (render normal bubble)
```

### Bubble border-radius (Messenger exact):
```
Single message:     rounded-[18px]
First in group:     rounded-[18px] + rounded-bl-[4px] (received) / rounded-br-[4px] (own)
Middle in group:    rounded-[18px] with both corners 4px  
Last in group:      rounded-[18px] + rounded-tl-[4px] (received) / rounded-tr-[4px] (own)
Standalone:         full rounded-[18px]
```

---

## Files cần rewrite:
- `fe/src/app/shared/components/message-bubble.component.ts` — **FULL REWRITE**
- `fe/src/app/shared/components/message-input.component.ts` — polish
- `fe/src/app/features/student/messages/conversation-view.component.ts` — layout + scroll logic

## Files KHÔNG đổi (đã ổn):
- Backend: tất cả API, migrations, domain models
- `fe/src/app/core/services/messaging.service.ts`
- `fe/src/app/core/services/websocket.service.ts`
- `fe/src/app/core/services/announcement.service.ts`

## Quy tắc:
- **Viết lại từ đầu** — KHÔNG patch thêm vào code cũ
- Test từng component bằng Playwright screenshot TRƯỚC và SAU
- Commit sau mỗi component hoàn thành
- Design tokens: `#0056D2`, `slate-`, `rounded-[18px]` bubbles, `rounded-[20px]` textarea
- Vietnamese có dấu
- `ng serve` cần restart nếu sửa `angular.json` hoặc thêm package
- RTK prefix cho Bash commands

## Test accounts:
- Student: `nguyenvanan@sv.maritime.edu` / `Student@2026`
- Teacher: `teacher@maritime.edu` / `teacher123`

## Sources:
- [Pretext GitHub](https://github.com/chenglou/pretext)
- [Pretext Docs](https://pretextjs.dev/)
- [Markdown Chat Demo](https://chenglou.me/pretext/markdown-chat/)
- [Pretext DeepWiki](https://deepwiki.com/chenglou/pretext)
- [Simon Willison Review](https://simonwillison.net/2026/Mar/29/pretext/)
