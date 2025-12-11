# YÊU CẦU XÁC NHẬN: Sources trong Streaming API

**Ngày:** 11/12/2025  
**Từ:** Team LMS Backend  
**Đến:** Team AI Service  
**Chủ đề:** Xác nhận format sources trong `/api/v1/chat/stream` endpoint

---

## 1. VẤN ĐỀ HIỆN TẠI

Frontend LMS đã tích hợp streaming API thành công:
- ✅ Nhận được `thinking` events
- ✅ Nhận được `answer` events  
- ✅ Nhận được `done` event
- ❌ **KHÔNG nhận được `sources` event**

Kết quả: Nguồn tham khảo (sources) không hiển thị trên UI mặc dù API non-streaming (`/api/v1/chat/`) trả về sources đầy đủ.

---

## 2. CÂU HỎI CẦN XÁC NHẬN

### 2.1. Streaming endpoint có gửi sources không?

Endpoint `/api/v1/chat/stream` có gửi event `sources` riêng biệt không?

**Ví dụ mong đợi:**
```
event: sources
data: {"sources": [{"title": "...", "content": "...", "image_url": "...", "page_number": 8, "bounding_boxes": [...]}]}
```

### 2.2. Nếu có, sources được gửi ở đâu trong stream?

- [ ] Event riêng biệt `event: sources`
- [ ] Trong `event: metadata`
- [ ] Trong `event: done`
- [ ] Trong `event: answer` cuối cùng
- [ ] Khác: _______________

### 2.3. Format của sources event?

Vui lòng cung cấp ví dụ cụ thể về SSE event chứa sources:

```
event: ???
data: ???
```

---

## 3. FORMAT SOURCES MONG ĐỢI

Theo tài liệu `LMS_INTEGRATION_API.md`, sources có format:

```json
{
  "sources": [
    {
      "title": "📑 ### Điều 15. Chủ tàu",
      "content": "Chủ tàu là người sở hữu tàu biển...",
      "image_url": "https://xyz.supabase.co/storage/v1/object/public/maritime-docs/luat-hang-hai-2015-p1/page_8.jpg",
      "page_number": 8,
      "document_id": "luat-hang-hai-2015-p1",
      "bounding_boxes": [
        {"x0": 10.5, "y0": 15.2, "x1": 89.5, "y1": 35.8}
      ]
    }
  ]
}
```

---

## 4. FRONTEND ĐÃ SẴN SÀNG XỬ LÝ

Frontend LMS đã implement xử lý sources ở nhiều vị trí:

```typescript
// Xử lý event type 'sources'
case 'sources':
  if (event.sources) {
    sources = this.mapSourcesToFrontend(event.sources);
  }
  break;

// Cũng check trong metadata event
case 'metadata':
  if (event.sources) {
    sources = this.mapSourcesToFrontend(event.sources);
  }
  break;

// Cũng check trong done event
case 'done':
  if (event.sources) {
    sources = this.mapSourcesToFrontend(event.sources);
  }
  break;

// Cũng check trong answer event
case 'answer':
  if (event.sources) {
    sources = this.mapSourcesToFrontend(event.sources);
  }
  break;
```

**Mapping function đã xử lý snake_case → camelCase:**
- `image_url` → `imageUrl`
- `page_number` → `pageNumber`
- `document_id` → `documentId`
- `bounding_boxes` → `boundingBoxes`

---

## 5. TEST COMMAND

Để kiểm tra streaming response có sources không:

```bash
curl -X POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: maritime-lms-prod-2024" \
  -H "Accept: text/event-stream" \
  -d '{"user_id":"test","message":"Điều 15 Luật Hàng hải 2015 quy định gì?","role":"student"}'
```

**Câu hỏi:** Output có chứa event `sources` không?

---

## 6. SO SÁNH VỚI NON-STREAMING

**Non-streaming (`/api/v1/chat/`)** - ĐÃ HOẠT ĐỘNG:
```json
{
  "status": "success",
  "data": {
    "answer": "...",
    "sources": [...],  // ✅ Có sources
    "suggested_questions": [...]
  }
}
```

**Streaming (`/api/v1/chat/stream`)** - CẦN XÁC NHẬN:
```
event: thinking
data: {"content": "..."}

event: answer
data: {"content": "..."}

event: sources        // ❓ Có gửi event này không?
data: {"sources": [...]}

event: done
data: {}
```

---

## 7. YÊU CẦU HÀNH ĐỘNG

1. **Xác nhận** streaming endpoint có gửi sources không
2. **Cung cấp ví dụ** SSE output đầy đủ với sources
3. **Nếu chưa có**, vui lòng thêm event `sources` vào streaming response

---

## 8. LIÊN HỆ

- **LMS Backend Team Lead:** [Tên]
- **Slack/Teams:** #lms-ai-integration
- **Email:** [email]

---

*Cảm ơn team AI đã hỗ trợ! 🙏*
