# Session Prompt: Message Bubble Clean Rewrite

## Mục tiêu
Clean rewrite `message-bubble.component.ts` từ đầu — pixel-perfect Messenger desktop pattern.
Session trước tích lũy quá nhiều incremental fix → layout conflicts. Cần viết lại sạch.

## Vấn đề cần fix:
1. **Emoji-only messages** — tin nhắn chỉ có emoji (1-3 emoji) cần hiện LỚN, không có bubble bg
2. **Reply visual block** — old messages dùng text `[Trả lời ...]`, new dùng `replyTo` object. Cần handle cả 2
3. **Inline toolbar position** — cần chính xác cạnh bubble (không phải trên đầu)
4. **Mobile toolbar** — `hidden sm:flex` cho inline, long-press cho mobile popup
5. **Reaction picker** — popup 👍❤️😂😮😢 khi click 😀 icon
6. **Data migration** — chuyển text-prepend replies sang `replyToId` trong DB

## Tham khảo Messenger Desktop:
```
Received:  [bubble text]  [😀] [↩] [⋮]     ← inline, cùng hàng
Own:       [😀] [↩] [⋮]  [bubble text]     ← bên trái bubble

Reply visual:
  ↩ Bạn đã trả lời
  ┌─ Tên người gửi ────────┐
  │ Nội dung gốc (bg nhạt) │  ← quoted, clickable → scroll to original
  ├────────────────────────┤
  │ Tin nhắn reply (bg đậm)│  ← nối liền, không gap
  └────────────────────────┘

Emoji-only (1-3 chars):
  😊         ← large 32px, no bubble background
  👍❤️      ← large, no background

Input: [____Textarea____] [😀] [👍/▶]
```

## Files cần rewrite:
- `fe/src/app/shared/components/message-bubble.component.ts` — FULL REWRITE
- `fe/src/app/shared/components/message-input.component.ts` — polish
- `fe/src/app/features/student/messages/conversation-view.component.ts` — verify layout

## Backend status:
- V108: message_reactions ✅
- V109-V110: message recall ✅  
- V111: reply_to_id ✅
- Reactions API: toggle, batch fetch, WS broadcast ✅
- Recall API: 15-min window, soft-delete ✅
- Reply API: replyToId in send, replyTo resolution in get ✅

## Quy tắc:
- Test từng thay đổi bằng Playwright screenshot
- Commit sau mỗi fix hoạt động
- Design tokens: `#0056D2`, `slate-`, `rounded-[18px]` bubbles
- Vietnamese có dấu
- `ng serve` cần restart nếu sửa `angular.json`
