# 📋 PHẢN HỒI: Streaming API Đã Implement

**Ngày:** 11/12/2025  
**Từ:** Team Backend AI  
**Đến:** Team LMS Backend  
**Chủ đề:** Xác nhận implement Streaming API (SSE)

---

## 1. ✅ ĐÃ IMPLEMENT XON G

### Endpoint: `POST /api/v1/chat/stream`

```http
POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/stream
Content-Type: application/json
X-API-Key: {api_key}

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Điều 15 Luật Hàng hải 2015 là gì?",
  "role": "student",
  "session_id": "abc12345-e29b-41d4-a716-446655440001"
}
```

### Response: `text/event-stream`

```
event: thinking
data: {"content": "Đang phân tích câu hỏi..."}

event: thinking
data: {"content": "Đang tra cứu cơ sở dữ liệu..."}

event: thinking
data: {"content": "Phân tích nội dung về Điều 15..."}

event: answer
data: {"content": "**Điều 15** của Bộ luật"}

event: answer
data: {"content": " Hàng hải Việt Nam 2015"}

event: answer
data: {"content": " quy định về Chủ tàu..."}

event: sources
data: {"sources": [{"title": "Điều 15", "content": "...", "bounding_boxes": [...]}]}

event: suggested_questions
data: {"questions": ["Thuyền viên là gì?", ...]}

event: metadata
data: {"processing_time": 5.234, "confidence_score": 0.9, "query_type": "factual", ...}

event: done
data: {}
```

---

## 2. EVENT TYPES

| Event | Description |
|-------|-------------|
| `thinking` | Quá trình suy luận (bao gồm cả `<thinking>` tags) |
| `answer` | Từng chunk của câu trả lời (50 chars/chunk) |
| `sources` | Nguồn tham khảo với bounding_boxes |
| `suggested_questions` | 3 câu hỏi gợi ý |
| `metadata` | Processing time, confidence, query_type |
| `done` | Stream completed |
| `error` | Error occurred |

---

## 3. IMPLEMENTATION NOTES

### Flow thực tế

```
1. [thinking] "Đang phân tích câu hỏi..."     (instant)
2. [thinking] "Đang tra cứu cơ sở dữ liệu..." (instant)
3. [wait] Tool execution - RAG search         (5-10s)
4. [thinking] AI reasoning từ <thinking> tags (if present)
5. [answer] Stream từng chunk                 (30ms/chunk)
6. [sources] Nguồn tham khảo                  (instant)
7. [suggested_questions]                      (instant)
8. [metadata] Processing info                 (instant)
9. [done] Kết thúc                           (instant)
```

### Lưu ý quan trọng

⚠️ **Tool execution (RAG) không thể stream** - phải chờ hoàn thành trước khi stream answer

→ Time to First Answer: 5-10s (same as non-streaming)
→ **Nhưng** user thấy "Đang tra cứu..." ngay lập tức (good UX)

---

## 4. SPRING BOOT CLIENT CODE

```java
@Service
public class AIStreamClient {

    private final WebClient webClient;

    public Flux<ServerSentEvent<String>> streamChat(ChatRequest request) {
        return webClient.post()
            .uri("/api/v1/chat/stream")
            .header("X-API-Key", apiKey)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {});
    }
}
```

```java
// Controller
@PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<ServerSentEvent<String>> chatStream(@RequestBody ChatRequest request) {
    return aiStreamClient.streamChat(request);
}
```

---

## 5. JAVASCRIPT CLIENT EXAMPLE

```javascript
const eventSource = new EventSource('/api/v1/chat/stream', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
    },
    body: JSON.stringify({
        user_id: userId,
        message: userMessage,
        role: 'student',
        session_id: sessionId
    })
});

eventSource.addEventListener('thinking', (e) => {
    const data = JSON.parse(e.data);
    showThinking(data.content);
});

eventSource.addEventListener('answer', (e) => {
    const data = JSON.parse(e.data);
    appendToAnswer(data.content);
});

eventSource.addEventListener('sources', (e) => {
    const data = JSON.parse(e.data);
    showSources(data.sources);
});

eventSource.addEventListener('done', () => {
    eventSource.close();
});

eventSource.addEventListener('error', (e) => {
    const data = JSON.parse(e.data);
    showError(data.message);
    eventSource.close();
});
```

---

## 6. PENDING DEPLOY

```bash
git add -A
git commit -m "feat: Add streaming chat API (SSE)

- POST /api/v1/chat/stream endpoint
- Events: thinking, answer, sources, metadata, done, error  
- 50 chars/chunk với 30ms delay
- Includes bounding_boxes và analytics metadata"

git push
```

---

## 7. TIMELINE

| Task | Status |
|------|--------|
| AI implement streaming endpoint | ✅ DONE |
| AI deploy to Render | ⏳ Pending push |
| LMS update backend proxy | ⏳ Your turn |
| LMS update frontend | ⏳ Your turn |
| Integration testing | ⏳ Pending |

---

**Liên hệ:**  
Team Backend AI - Maritime AI Tutor Project

*Ready for integration!*
