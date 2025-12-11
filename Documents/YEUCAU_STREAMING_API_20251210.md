# 📋 YÊU CẦU: Streaming API cho AI Chat

**Ngày:** 10/12/2025  
**Từ:** Team LMS Backend  
**Gửi:** Team AI Backend  
**Độ ưu tiên:** Cao

---

## 1. MÔ TẢ YÊU CẦU

Hiện tại API `/api/v1/chat/` trả về **toàn bộ response một lần** sau khi AI xử lý xong (5-15 giây).

Chúng tôi muốn implement **Streaming Response** (Server-Sent Events) để:
- User thấy text xuất hiện **từng chữ một** như ChatGPT/Claude
- Cải thiện UX đáng kể - user không phải đợi màn hình trống
- Hiển thị quá trình suy luận (`<thinking>`) real-time

---

## 2. ĐỀ XUẤT API MỚI

### Endpoint: `POST /api/v1/chat/stream`

**Request:** (Giống `/api/v1/chat/`)
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Điều 15 Luật Hàng hải 2015 là gì?",
  "role": "student",
  "session_id": "abc12345-e29b-41d4-a716-446655440001"
}
```

**Response:** `Content-Type: text/event-stream`

```
event: thinking
data: {"content": "Người dùng hỏi về Điều 15..."}

event: thinking
data: {"content": "Tôi cần tra cứu database..."}

event: answer
data: {"content": "**Điều 15** của Bộ luật"}

event: answer
data: {"content": " Hàng hải Việt Nam 2015"}

event: answer
data: {"content": " quy định về chủ tàu..."}

event: sources
data: {"sources": [...]}

event: suggested_questions
data: {"questions": ["Thuyền viên cần điều kiện gì?", ...]}

event: metadata
data: {"processing_time": 5.234, "model": "maritime-rag-v1"}

event: done
data: {}
```

---

## 3. EVENT TYPES

| Event | Description | Khi nào gửi |
|-------|-------------|-------------|
| `thinking` | Quá trình suy luận | Đầu tiên (nếu có) |
| `answer` | Nội dung câu trả lời | Từng chunk text |
| `sources` | Nguồn tham khảo | Sau khi answer xong |
| `suggested_questions` | Câu hỏi gợi ý | Sau sources |
| `metadata` | Thông tin xử lý | Cuối cùng |
| `done` | Kết thúc stream | Cuối cùng |
| `error` | Lỗi xảy ra | Khi có lỗi |

---

## 4. LỢI ÍCH

| Metric | Hiện tại | Với Streaming |
|--------|----------|---------------|
| Time to First Byte | 5-15s | < 500ms |
| Perceived Performance | Chậm | Nhanh |
| User Experience | Đợi màn hình trống | Thấy AI "đang nghĩ" |

---

## 5. IMPLEMENTATION NOTES

### Python FastAPI Example:
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

@app.post("/api/v1/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        # Thinking phase
        yield f"event: thinking\ndata: {json.dumps({'content': 'Đang phân tích...'})}\n\n"
        
        # Stream answer chunks
        async for chunk in llm.stream(request.message):
            yield f"event: answer\ndata: {json.dumps({'content': chunk})}\n\n"
        
        # Sources
        yield f"event: sources\ndata: {json.dumps({'sources': sources})}\n\n"
        
        # Done
        yield f"event: done\ndata: {{}}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Spring Boot (LMS Backend) sẽ forward stream:
```java
@PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> chatStream(@RequestBody ChatRequest request) {
    return aiServiceClient.streamChat(request);
}
```

---

## 6. TIMELINE ĐỀ XUẤT

| Phase | Task | Thời gian |
|-------|------|-----------|
| 1 | Team AI implement streaming endpoint | 2-3 ngày |
| 2 | Team LMS update backend proxy | 1 ngày |
| 3 | Team LMS update frontend | 1 ngày |
| 4 | Integration testing | 1 ngày |

---

## 7. CÂU HỎI CHO TEAM AI

1. **Có thể implement streaming endpoint không?**
2. **Thời gian dự kiến?**
3. **Có cần thay đổi gì về authentication?**
4. **LLM backend (OpenAI/Anthropic) có hỗ trợ streaming không?**

---

**Xin phản hồi sớm để chúng tôi lên kế hoạch implementation.**

*Team LMS Backend*
