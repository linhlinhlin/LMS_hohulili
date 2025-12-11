# 🚨 BÁO CÁO LỖI: Streaming API Endpoint

**Ngày:** 11/12/2025  
**Từ:** Team LMS Backend  
**Đến:** Team Backend AI  
**Mức độ:** 🔴 Critical - Blocking Integration  
**Chủ đề:** Streaming Endpoint `/api/v1/chat/stream` trả về HTTP 500

---

## 1. TÓM TẮT VẤN ĐỀ

Streaming endpoint `/api/v1/chat/stream` trả về **HTTP 500 Internal Server Error** khi gọi từ LMS Backend.

Non-streaming endpoint `/api/v1/chat/` hoạt động bình thường.

---

## 2. CHI TIẾT KIỂM TRA

### 2.1. Health Check - ✅ OK

```bash
GET https://maritime-ai-chatbot.onrender.com/health

Response:
{
  "status": "ok",
  "database": "connected"
}
```

### 2.2. Non-Streaming Endpoint - ✅ OK

```bash
POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/
Content-Type: application/json; charset=utf-8
X-API-Key: maritime-lms-prod-2024

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Hello",
  "role": "student",
  "session_id": "abc12345-e29b-41d4-a716-446655440001"
}

Response: HTTP 200 OK
{
  "status": "success",
  "data": {
    "answer": "<thinking>...",
    ...
  }
}
```

### 2.3. Streaming Endpoint - ❌ HTTP 500

```bash
POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/stream
Content-Type: application/json; charset=utf-8
X-API-Key: maritime-lms-prod-2024
Accept: text/event-stream

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Hello",
  "role": "student",
  "session_id": "abc12345-e29b-41d4-a716-446655440001"
}

Response: HTTP 500 Internal Server Error
```

---

## 3. THÔNG TIN MÔI TRƯỜNG TEST

| Item | Value |
|------|-------|
| Thời gian test | 11/12/2025, ~01:30 AM (GMT+7) |
| AI Service URL | https://maritime-ai-chatbot.onrender.com |
| API Key | maritime-lms-prod-2024 |
| Test Tool | PowerShell Invoke-RestMethod |
| Request Format | JSON với UTF-8 encoding |

---

## 4. REQUEST BODY ĐÃ SỬ DỤNG

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Hello",
  "role": "student",
  "session_id": "abc12345-e29b-41d4-a716-446655440001"
}
```

**Lưu ý:** Request body giống hệt với non-streaming endpoint (đang hoạt động).

---

## 5. CÂU HỎI CHO TEAM AI

1. **Streaming endpoint đã được deploy chưa?**
   - Theo document `PHANHOI_STREAMING_API_20251211.md`, status là "⏳ Pending push"

2. **Có thể check server logs để xem chi tiết lỗi 500?**
   - Cần biết root cause để debug

3. **Request format có khác gì so với non-streaming không?**
   - Hiện tại đang dùng cùng format

4. **Có cần thêm headers đặc biệt nào không?**
   - Đã thử với `Accept: text/event-stream`

---

## 6. TÁC ĐỘNG ĐẾN LMS

### Hiện tại:
- ✅ Non-streaming chat hoạt động bình thường
- ✅ Đã implement fallback: **Fake Streaming (Typewriter Effect)**
- ⚠️ User experience không tối ưu như real streaming

### Khi fix xong:
- Chỉ cần đổi flag `USE_REAL_STREAMING = true` trong LMS Frontend
- Không cần thay đổi code khác

---

## 7. LMS IMPLEMENTATION STATUS

### Backend (Ready):
```java
// AIStreamClient.java
public Flux<ServerSentEvent<String>> streamChatSSE(AIServiceRequest request) {
    return webClient.post()
        .uri("/api/v1/chat/stream")
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.TEXT_EVENT_STREAM)
        .bodyValue(request)
        .retrieve()
        .bodyToFlux(ServerSentEvent.class)
        ...
}

// AIChatController.java
@PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> chatStream(...) {
    return aiStreamClient.streamChatSSE(aiRequest);
}
```

### Frontend (Ready):
```typescript
// chat-api.client.ts
async *streamChat(message, sessionId, context) {
    const response = await fetch('/api/v1/ai/chat/stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
    });
    // SSE parsing logic...
}

// chat.service.ts
const USE_REAL_STREAMING = false; // Waiting for AI Service fix
```

---

## 8. YÊU CẦU HÀNH ĐỘNG

| Priority | Action | Owner |
|----------|--------|-------|
| 🔴 P0 | Fix streaming endpoint 500 error | Team AI |
| 🔴 P0 | Check server logs for root cause | Team AI |
| 🟡 P1 | Confirm khi fix xong | Team AI |
| 🟢 P2 | Enable real streaming trong LMS | Team LMS |

---

## 9. TIMELINE ĐỀ XUẤT

| Date | Milestone |
|------|-----------|
| 11/12/2025 | Team AI investigate & fix |
| 11/12/2025 | Team AI confirm fix deployed |
| 11/12/2025 | Team LMS enable real streaming |
| 12/12/2025 | Integration testing complete |

---

## 10. LIÊN HỆ

**Team LMS Backend:**
- Đã implement đầy đủ streaming support
- Đang chờ AI Service streaming endpoint hoạt động
- Fallback (fake streaming) đang active

**Khi fix xong, vui lòng reply document này hoặc tạo document mới.**

---

*Báo cáo tạo tự động bởi LMS Backend Integration System*
