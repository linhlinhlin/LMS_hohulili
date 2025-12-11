# 📋 PHẢN HỒI TỪ TEAM LMS BACKEND

**Ngày:** 10/12/2025  
**Từ:** Team LMS Backend (Spring Boot)  
**Đến:** Team Backend AI (Maritime AI Tutor)  
**Chủ đề:** Trả lời 6 câu hỏi + Xác nhận kiến trúc tích hợp

---

## 1. ✅ XÁC NHẬN KIẾN TRÚC

### Câu hỏi 1: Xác nhận Option 1?

**✅ ĐỒNG Ý với kiến trúc Option 1 - Smart Orchestrator**

Lý do:
- LMS Backend đã có sẵn infrastructure cho pattern này
- `AIChatController` đã implement proxy pattern
- `AIChatService` đã handle orchestration logic
- `ChatSession` + `ChatMessage` entities đã sẵn sàng lưu logs

**Hiện trạng code LMS Backend:**
```
api/src/main/java/com/example/lms/
├── controller/
│   ├── AIChatController.java      ✅ Proxy endpoints
│   └── AIAdminController.java     ✅ Knowledge management
├── service/ai/
│   ├── AIChatService.java         ✅ Business logic
│   ├── AIServiceClient.java       ✅ HTTP client to AI Service
│   └── AIKnowledgeService.java    ✅ Admin operations
├── entity/
│   ├── ChatSession.java           ✅ Session storage
│   └── ChatMessage.java           ✅ Message storage
└── config/
    └── AIServiceConfig.java       ✅ Configuration
```

---

## 2. 📝 TRẢ LỜI 6 CÂU HỎI

### Câu hỏi 2: Format `user_id`?

**Trả lời: UUID (36 characters)**

```java
// User entity trong LMS
@Id
@GeneratedValue(strategy = GenerationType.UUID)
private UUID id;

// Ví dụ: "550e8400-e29b-41d4-a716-446655440000"
```

**LMS sẽ gửi:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "...",
  "role": "student",
  "session_id": "abc12345-e29b-41d4-a716-446655440001"
}
```

**Lưu ý:** `user_id` và `session_id` đều là UUID format.

---

### Câu hỏi 3: Session Management Strategy?

**Trả lời: Option B - LMS Backend generate session_id (server-side)**

Lý do:
- LMS đã có `ChatSession` entity với UUID primary key
- Server-side generation đảm bảo uniqueness và security
- Dễ dàng track và audit

**Flow hiện tại:**
```java
// AIChatService.java
public ChatSession getOrCreateSession(User user, UUID sessionId, ChatContextDTO context) {
    if (sessionId != null) {
        // Reuse existing session
        return sessionRepository.findByIdAndUserAndIsDeletedFalse(sessionId, user)
            .orElseThrow(() -> new SessionNotFoundException(...));
    }
    
    // Create new session (server-side UUID generation)
    ChatSession session = ChatSession.builder()
        .user(user)
        .contextCourseId(context != null ? context.courseId() : null)
        .contextLessonId(context != null ? context.lessonId() : null)
        .build();
    
    return sessionRepository.save(session);
}
```

**Session lifecycle:**
1. Frontend gọi `/api/v1/ai/chat` không có `sessionId` → LMS tạo mới
2. LMS trả về `sessionId` trong response
3. Frontend gửi `sessionId` trong các request tiếp theo để continue conversation

---

### Câu hỏi 4: Rate Limiting?

**Trả lời: 30 req/min là đủ cho giai đoạn đầu**

Ước tính:
- Số user active cùng lúc: ~50-100 students
- Mỗi user gửi ~1-2 messages/phút khi chat
- Peak: ~100 req/min

**Đề xuất:**
- Giai đoạn 1 (MVP): 30 req/min OK
- Giai đoạn 2 (Production): Có thể cần 60-100 req/min

**LMS sẽ implement:**
- Queue mechanism nếu cần
- Graceful error handling khi rate limited
- Exponential backoff retry

---

### Câu hỏi 5: Error Handling Preference?

**Trả lời: Option B + C kết hợp**

```java
// AIServiceClient.java - Đã implement
catch (ResourceAccessException e) {
    if (e.getMessage().contains("timeout")) {
        throw new AIServiceTimeoutException("AI Service timeout after " + timeout + "s");
    }
    throw new AIServiceUnavailableException("AI Service không khả dụng");
}

catch (HttpClientErrorException e) {
    if (statusCode == 429) {
        // Rate limit - retry với backoff
        throw new AIServiceRateLimitException("Rate limit exceeded", retryAfter);
    }
}
```

**UI sẽ hiển thị:**
- Timeout/Unavailable: "Trợ lý AI đang bận, vui lòng thử lại sau ít phút"
- Rate limit: Auto retry với loading indicator
- Server error: "Đã xảy ra lỗi, vui lòng thử lại"

---

### Câu hỏi 6: Analytics Data cần thêm?

**Trả lời: Có, cần thêm một số fields**

**Hiện tại LMS đã lưu:**
```java
// ChatMessage entity
- content (TEXT)
- senderType (USER/AI)
- sources (JSON)
- processingTime (Double)
- aiModel (String)
- createdAt (Instant)
```

**Đề xuất thêm trong AI response metadata:**

| Field | Type | Mục đích |
|-------|------|----------|
| `topics_accessed` | string[] | Tracking topics học viên quan tâm |
| `confidence_score` | float (0-1) | Đánh giá độ tin cậy câu trả lời |
| `document_ids_used` | string[] | Tracking tài liệu được sử dụng |
| `query_type` | string | "factual" / "conceptual" / "procedural" |

**Ví dụ response mong muốn:**
```json
{
  "status": "success",
  "data": {
    "answer": "...",
    "sources": [...],
    "suggested_questions": [...]
  },
  "metadata": {
    "processing_time": 5.234,
    "model": "maritime-rag-v1",
    "topics_accessed": ["Điều 15", "Chủ tàu", "Luật Hàng hải 2015"],
    "confidence_score": 0.92,
    "document_ids_used": ["luat-hang-hai-2015-p1"],
    "query_type": "factual"
  }
}
```

---

## 3. 🔧 ĐIỀU CHỈNH CẦN THIẾT TỪ PHÍA LMS

### 3.1. Cập nhật AIServiceRequest

```java
// Hiện tại
public record AIServiceRequest(
    String userId,
    String message,
    String role,
    String sessionId,
    AIContextRequest context
) {}

// Đã phù hợp với API spec của team AI ✅
```

### 3.2. Cập nhật AIServiceResponse để nhận thêm metadata

```java
// Cần update để nhận thêm fields
public record AIMetadataResponse(
    Double processingTime,
    String model,
    String agentType,
    List<ToolUsed> toolsUsed,
    // Thêm mới
    List<String> topicsAccessed,
    Double confidenceScore,
    List<String> documentIdsUsed,
    String queryType
) {}
```

### 3.3. Xử lý `<thinking>` tags

LMS Backend sẽ pass-through `<thinking>` tags, Frontend sẽ handle display:
- Default: Ẩn thinking content
- Toggle: "Xem quá trình suy luận"

---

## 4. 📋 CHECKLIST TÍCH HỢP

### Team AI cần cung cấp:
- [ ] API Key cho LMS production
- [ ] Confirm metadata fields mới (topics, confidence, etc.)
- [ ] Test endpoint để LMS verify integration

### Team LMS sẽ thực hiện:
- [x] AIServiceClient đã implement
- [x] ChatSession/ChatMessage entities đã có
- [x] Error handling đã implement
- [ ] Update DTO để nhận metadata mới
- [ ] Integration testing
- [ ] Frontend update cho source highlighting

---

## 5. 🔗 THÔNG TIN KẾT NỐI

### LMS Backend Config (application.yml)

```yaml
ai:
  service:
    url: https://maritime-ai-chatbot.onrender.com
    api-key: ${AI_SERVICE_API_KEY}  # Cần team AI cấp
    timeout: 90  # seconds
    retry:
      max-attempts: 2
      delay: 1000
```

### Test Connection

```bash
# Health check
curl https://maritime-ai-chatbot.onrender.com/health

# LMS proxy health
curl http://localhost:8088/api/v1/ai/health
```

---

## 6. NEXT STEPS

1. ⏳ Team AI review phản hồi này
2. ⏳ Team AI cấp API Key
3. ⏳ Team AI confirm metadata fields
4. ⏳ LMS update DTOs
5. ⏳ Integration testing
6. ⏳ Go-live

---

**Liên hệ:**  
Team LMS Backend - Maritime LMS Project

*Vui lòng reply để xác nhận hoặc thảo luận thêm.*
