# Option 1 Integration Architecture

> **Pattern:** LMS Backend as Smart Orchestrator  
> **AI Service:** Stateless microservice, chỉ xử lý AI logic

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              LMS SYSTEM                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐     ┌─────────────────────────────────────────────┐   │
│   │   Angular   │     │              LMS Backend (Spring)            │   │
│   │   Frontend  │────▶│                                              │   │
│   └─────────────┘     │  • User Authentication (JWT)                 │   │
│                       │  • User Database (profiles, enrollment)      │   │
│                       │  • Chat Logs Storage                         │   │
│                       │  • Learning Progress Tracking                │   │
│                       │  • Analytics & Reporting                     │   │
│                       │                                              │   │
│                       └───────────────┬─────────────────────────────┘   │
│                                       │                                  │
└───────────────────────────────────────┼──────────────────────────────────┘
                                        │ REST API + API Key
                                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          BACKEND AI SERVICE                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   POST /api/v1/chat/                                                     │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ Request:                                                          │  │
│   │   { user_id, message, role, session_id }                         │  │
│   │                                                                   │  │
│   │ Response:                                                         │  │
│   │   { answer, sources[], suggested_questions[], metadata }         │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   AI Storage (Internal - không expose cho LMS):                          │
│   • Knowledge Embeddings (RAG documents)                                 │
│   • AI Memories/Insights (behavioral learning per user_id)               │
│   • Conversation context (short-term, session-based)                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Data Ownership

| Data Type | Owner | Storage | Notes |
|-----------|-------|---------|-------|
| **User Profiles** | LMS | LMS DB | Name, email, enrollment |
| **Authentication** | LMS | LMS DB | JWT, sessions |
| **Chat Logs** | LMS | LMS DB | Cho analytics, audit |
| **Learning Progress** | LMS | LMS DB | Courses completed |
| **AI Memories** | AI | AI DB | Behavioral insights per user_id |
| **Knowledge Base** | AI | AI DB | RAG documents, embeddings |
| **Bounding Boxes** | AI | AI DB | Source highlighting data |

### Nguyên tắc: 
- **LMS owns users** - AI không biết user là ai, chỉ biết `user_id`
- **AI owns knowledge** - LMS không cần biết cách RAG hoạt động
- **AI Memories auto-sync** - AI tự học từ conversations, LMS không cần manage

---

## API Contract

### LMS Backend → AI Backend

```http
POST /api/v1/chat/
X-API-Key: {lms_api_key}
Content-Type: application/json

{
  "user_id": "lms_user_12345",      // ID từ LMS database
  "message": "Điều 15 là gì?",       // User message
  "role": "student",                 // Role từ LMS
  "session_id": "sess_abc123"        // Optional, for conversation continuity
}
```

### AI Backend → LMS Backend

```json
{
  "status": "success",
  "data": {
    "answer": "<thinking>...</thinking>\n\nCâu trả lời...",
    "sources": [
      {
        "title": "Điều 15. Chủ tàu",
        "content": "...",
        "image_url": "https://.../page_8.jpg",
        "page_number": 8,
        "document_id": "luat-hang-hai-2015",
        "bounding_boxes": [{"x0": 10, "y0": 15, "x1": 90, "y1": 35}]
      }
    ],
    "suggested_questions": ["Thuyền viên là gì?"]
  },
  "metadata": {
    "processing_time": 5.2,
    "tools_used": [{"name": "tool_maritime_search"}]
  }
}
```

---

## LMS Backend Responsibilities

```java
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired private AIClient aiClient;
    @Autowired private ChatLogRepository chatLogRepo;
    @Autowired private AnalyticsService analyticsService;
    @Autowired private ProgressService progressService;

    @PostMapping
    public ResponseEntity<?> chat(
        @RequestBody ChatRequest request,
        @AuthenticationPrincipal User user
    ) {
        // 1. Call AI Backend
        AIResponse response = aiClient.chat(
            user.getId(),           // user_id từ LMS database
            request.getMessage(),
            user.getRole().name(),  // student/teacher/admin
            request.getSessionId()
        );
        
        // 2. Log to LMS database (for analytics)
        chatLogRepo.save(ChatLog.builder()
            .userId(user.getId())
            .message(request.getMessage())
            .response(response.getData().getAnswer())
            .sourcesCount(response.getData().getSources().size())
            .processingTime(response.getMetadata().getProcessingTime())
            .timestamp(Instant.now())
            .build());
        
        // 3. Track learning analytics
        analyticsService.trackChatInteraction(user, response);
        
        // 4. Optional: Update learning progress
        if (!response.getData().getSources().isEmpty()) {
            progressService.markTopicsAccessed(
                user, 
                extractTopicsFromSources(response.getData().getSources())
            );
        }
        
        // 5. Return response to frontend
        return ResponseEntity.ok(response);
    }
}
```

---

## Session Management Strategy

| Scenario | Recommendation |
|----------|----------------|
| **New chat session** | LMS generates new `session_id` |
| **Continue conversation** | Use same `session_id` |
| **User logs out** | Optional: Clear session |
| **Switch device** | Can reuse `session_id` for continuity |

```java
// LMS Frontend (Angular)
startNewChat() {
  this.sessionId = UUID.randomUUID();
  localStorage.setItem('chatSessionId', this.sessionId);
}

continueChat() {
  this.sessionId = localStorage.getItem('chatSessionId') || this.startNewChat();
}
```

---

## What AI Stores (Automatic)

AI Backend tự động lưu trữ **per user_id**:

1. **Behavioral Insights** (max 50/user)
   - Learning style: "Thích học qua ví dụ thực tế"
   - Knowledge gaps: "Chưa nắm vững quy tắc đèn hiệu"
   - Goals: "Muốn thi bằng thuyền trưởng"

2. **Conversation Context** (session-based)
   - Last 50 messages per session
   - Auto-cleared after inactivity

**LMS không cần manage AI memories** - AI tự học và cải thiện.

---

## Integration Checklist for LMS Team

- [ ] Generate API Key cho LMS Backend
- [ ] Implement AIClient class trong Spring
- [ ] Create ChatLog entity và repository
- [ ] Add `/api/chat` endpoint
- [ ] Handle `<thinking>` tags display toggle
- [ ] Implement source highlighting with PDF.js
- [ ] Add analytics tracking
- [ ] Test với 100 concurrent users

---

## Q&A

**Q: AI có cần biết thông tin user như tên, tuổi không?**
A: Không bắt buộc. AI có thể học từ conversation. Nếu muốn personalize ngay, LMS có thể gửi thêm trong request.

**Q: Chat logs nên lưu ở đâu?**
A: **LMS database**. AI không cần lưu logs cho audit/compliance.

**Q: Nếu AI down thì sao?**
A: LMS Backend nên implement circuit breaker và graceful error message.

**Q: Rate limiting?**
A: AI Backend limit 30 req/min per IP. LMS Backend nên implement queue nếu cần higher throughput.
