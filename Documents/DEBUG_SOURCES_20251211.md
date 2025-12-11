# Hướng dẫn Debug Sources Display

**Ngày:** 11/12/2025  
**Vấn đề:** Sources không hiển thị trong AI Chat
**Trạng thái:** ✅ ĐÃ FIX - Cần test lại

---

## 0. ROOT CAUSE ĐÃ TÌM THẤY

### Vấn đề:
AI Service gửi sources trong `answer` event, KHÔNG phải `sources` event riêng biệt:
```
event:answer
data:{"sources": [...]}
```

### Nguyên nhân:
Code cũ ưu tiên `currentEventType` từ `event:` line:
```typescript
let eventType = currentEventType || parsed.type;
// currentEventType = 'answer' → eventType = 'answer'
// Content-based detection KHÔNG được chạy!
```

### Fix 1 (chat-api.client.ts):
Thay đổi logic để **LUÔN** kiểm tra content-based detection TRƯỚC:
```typescript
// Check for sources array - HIGHEST PRIORITY
if (parsed.sources && Array.isArray(parsed.sources) && parsed.sources.length > 0) {
  eventType = 'sources';
}
```

### Fix 2 (chat-api.client.ts):
Đặt `type` SAU spread để tránh bị override:
```typescript
// TRƯỚC (BUG):
const event = {
  type: eventType,  // Bị override bởi parsed.type
  ...parsed
};

// SAU (FIX):
const event = {
  ...parsed,
  type: eventType,  // Không bị override
};
```

---

## 1. Quick Test

### Test với Python script:
```bash
cd Documents/ai
python test_sources_event.py
```

Script này sẽ gọi trực tiếp AI Service và hiển thị raw SSE response.

---

## 2. Các thay đổi đã thực hiện

### 1.1. `chat-api.client.ts`
- Thêm logging chi tiết cho tất cả raw SSE lines
- Log khi detect sources từ `event:` line hoặc từ content
- Log tất cả events được yield

### 1.2. `chat.service.ts`
- Thêm logging chi tiết khi nhận sources event
- Log raw event, extracted data, mapped sources
- Log khi update message metadata

### 1.3. `source-citation.component.ts`
- Fix `track source.title` → `track $index` (title có thể empty)
- Thêm fallback title display
- Thêm logging trong constructor và ngOnInit

### 1.4. `chat-page.component.html`
- Thêm debug comment hiển thị sources count

---

## 2. Cách Debug

### 2.1. Mở Console (F12)

### 2.2. Gửi một câu hỏi về Luật Hàng hải

Ví dụ: "Điều 15 Luật Hàng hải 2015"

### 2.3. Kiểm tra Console logs

**Logs cần tìm:**

```
📜 RAW SSE LINE: event: sources
📜 RAW SSE LINE: data: {"sources": [...]}
🎯🎯🎯 SOURCES EVENT TYPE DETECTED FROM event: LINE! 🎯🎯🎯
🎯🎯🎯 SOURCES EVENT DETECTED! 🎯🎯🎯
📤 YIELDING EVENT: sources {...}
📚📚📚 SOURCES EVENT RECEIVED! 📚📚📚
📚 Mapped sources count: X
📝 Finalizing message with sources: X sources
✅ Message updated with sources: X
```

### 2.4. Nếu KHÔNG thấy logs về sources

**Có thể do:**
1. AI Service không gửi sources event
2. LMS Backend không forward đúng
3. SSE parsing bị lỗi

**Kiểm tra:**
- Xem có log `📜 RAW SSE LINE:` chứa "sources" không
- Nếu không có → vấn đề từ AI Service hoặc LMS Backend

### 2.5. Nếu thấy logs nhưng sources không hiển thị

**Kiểm tra:**
- Xem HTML có comment `<!-- DEBUG: message.metadata?.sources?.length = X -->` không
- Nếu X = 0 → sources không được lưu vào message
- Nếu X > 0 → vấn đề ở component rendering

---

## 3. Test với Endpoint Test

### 3.1. Gọi test endpoint

```javascript
// Trong Console
const client = new (await import('/src/app/features/ai-chat/infrastructure/api/chat-api.client.ts')).ChatApiClient();
for await (const event of client.testStream()) {
  console.log('Test event:', event);
}
```

### 3.2. Hoặc dùng curl

```bash
curl -X GET http://localhost:8088/api/v1/ai/chat/stream/test \
  -H "Accept: text/event-stream"
```

---

## 4. Thứ tự Events từ AI Service

```
1. thinking_start
2. thinking (nhiều events)
3. thinking_end
4. answer (nhiều chunks)
5. sources ← SOURCES Ở ĐÂY
6. suggested_questions
7. metadata
8. done
```

---

## 5. Format Sources từ AI Service

```json
{
  "sources": [
    {
      "title": "",
      "content": "Maritime Knowledge Base",
      "image_url": "https://xxx.supabase.co/...",
      "page_number": 4,
      "document_id": "luat-hang-hai-2015-p1",
      "bounding_boxes": [{"x0": 10.77, "y0": 20, "x1": 89, "y1": 30}]
    }
  ]
}
```

**Lưu ý:** 
- `title` có thể empty → đã fix fallback
- snake_case → camelCase mapping đã được implement

---

## 6. Liên hệ

Nếu vẫn không hoạt động, cần kiểm tra:
1. LMS Backend logs: `docker logs lms-api`
2. AI Service logs (nếu có access)
3. Network tab trong DevTools để xem raw SSE response

