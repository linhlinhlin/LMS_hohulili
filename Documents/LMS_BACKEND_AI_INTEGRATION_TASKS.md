# 🔧 LMS BACKEND - AI INTEGRATION TASKS

**Ngày:** 10/12/2025  
**Mục đích:** Danh sách công việc cần thực hiện để hoàn thiện tích hợp AI

---

## 1. TỔNG QUAN HIỆN TRẠNG

### ✅ Đã hoàn thành (95%)

| Component | File | Status |
|-----------|------|--------|
| Controller | `AIChatController.java` | ✅ Done |
| Service | `AIChatService.java` | ✅ Done |
| HTTP Client | `AIServiceClient.java` | ✅ Done |
| Config | `AIServiceConfig.java` | ✅ Done |
| Entities | `ChatSession.java`, `ChatMessage.java` | ✅ Done |
| Repositories | `ChatSessionRepository.java`, `ChatMessageRepository.java` | ✅ Done |
| DTOs | Request/Response DTOs | ⚠️ Cần update |
| Error Handling | Exception classes | ✅ Done |
| Admin APIs | `AIAdminController.java` | ✅ Done |

### ⚠️ Cần điều chỉnh (5%)

1. **DTO Updates** - Thêm metadata fields mới
2. **Source Highlighting** - Thêm bounding_boxes support
3. **Analytics Tracking** - Lưu thêm analytics data

---

## 2. TASKS CHI TIẾT

### Task 1: Update AIMetadataResponse DTO

**File:** `api/src/main/java/com/example/lms/dto/ai/external/AIMetadataResponse.java`

**Hiện tại:**
```java
public record AIMetadataResponse(
    Double processingTime,
    String model,
    String agentType,
    List<ToolUsed> toolsUsed
) {}
```

**Cần update:**
```java
public record AIMetadataResponse(
    @JsonProperty("processing_time") Double processingTime,
    String model,
    @JsonProperty("agent_type") String agentType,
    @JsonProperty("tools_used") List<ToolUsed> toolsUsed,
    // Thêm mới cho analytics
    @JsonProperty("topics_accessed") List<String> topicsAccessed,
    @JsonProperty("confidence_score") Double confidenceScore,
    @JsonProperty("document_ids_used") List<String> documentIdsUsed,
    @JsonProperty("query_type") String queryType
) {}
```

---

### Task 2: Update AISourceResponse DTO

**File:** `api/src/main/java/com/example/lms/dto/ai/external/AISourceResponse.java`

**Cần thêm bounding_boxes support:**
```java
public record AISourceResponse(
    String title,
    String content,
    @JsonProperty("image_url") String imageUrl,
    @JsonProperty("page_number") Integer pageNumber,
    @JsonProperty("document_id") String documentId,
    @JsonProperty("bounding_boxes") List<BoundingBox> boundingBoxes
) {
    public record BoundingBox(
        @JsonProperty("x0") Double x0,
        @JsonProperty("y0") Double y0,
        @JsonProperty("x1") Double x1,
        @JsonProperty("y1") Double y1
    ) {}
}
```

---

### Task 3: Update SourceDTO cho Frontend

**File:** `api/src/main/java/com/example/lms/dto/ai/SourceDTO.java`

**Cần update để pass bounding_boxes cho frontend:**
```java
public record SourceDTO(
    String title,
    String content,
    String url,
    // Thêm mới
    String imageUrl,
    Integer pageNumber,
    String documentId,
    List<BoundingBox> boundingBoxes
) {
    public record BoundingBox(
        Double x0,
        Double y0,
        Double x1,
        Double y1
    ) {}
}
```

---

### Task 4: Update ChatMessage Entity

**File:** `api/src/main/java/com/example/lms/entity/ChatMessage.java`

**Thêm columns cho analytics:**
```java
// Thêm vào entity
@Column(name = "topics_accessed", columnDefinition = "TEXT")
private String topicsAccessed;  // JSON array

@Column(name = "confidence_score")
private Double confidenceScore;

@Column(name = "document_ids_used", columnDefinition = "TEXT")
private String documentIdsUsed;  // JSON array

@Column(name = "query_type", length = 50)
private String queryType;
```

---

### Task 5: Database Migration

**File:** `api/src/main/resources/db/migration/V1000__add_chat_analytics_columns.sql`

```sql
-- Add analytics columns to chat_messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS topics_accessed TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS document_ids_used TEXT,
ADD COLUMN IF NOT EXISTS query_type VARCHAR(50);

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_chat_message_query_type 
ON chat_messages(query_type);

COMMENT ON COLUMN chat_messages.topics_accessed IS 'JSON array of topics accessed in this message';
COMMENT ON COLUMN chat_messages.confidence_score IS 'AI confidence score (0-1)';
COMMENT ON COLUMN chat_messages.document_ids_used IS 'JSON array of document IDs used for RAG';
COMMENT ON COLUMN chat_messages.query_type IS 'Type of query: factual, conceptual, procedural';
```

---

### Task 6: Update AIChatService

**File:** `api/src/main/java/com/example/lms/service/ai/AIChatService.java`

**Update saveAIResponse method:**
```java
private ChatMessage saveAIResponse(ChatSession session, AIServiceResponse response) {
    String sourcesJson = serializeSources(response.data().sources());
    
    // Serialize analytics data
    String topicsJson = serializeList(response.metadata().topicsAccessed());
    String docIdsJson = serializeList(response.metadata().documentIdsUsed());
    
    ChatMessage message = ChatMessage.builder()
        .session(session)
        .content(response.data().answer())
        .senderType(SenderType.AI)
        .status(MessageStatus.SENT)
        .sources(sourcesJson)
        .processingTime(response.metadata().processingTime())
        .aiModel(response.metadata().model())
        // Thêm analytics
        .topicsAccessed(topicsJson)
        .confidenceScore(response.metadata().confidenceScore())
        .documentIdsUsed(docIdsJson)
        .queryType(response.metadata().queryType())
        .build();
    
    return messageRepository.save(message);
}

private String serializeList(List<String> list) {
    if (list == null || list.isEmpty()) return null;
    try {
        return objectMapper.writeValueAsString(list);
    } catch (JsonProcessingException e) {
        log.warn("Failed to serialize list", e);
        return null;
    }
}
```

---

## 3. TESTING CHECKLIST

### Unit Tests
- [ ] Test AIMetadataResponse deserialization với fields mới
- [ ] Test AISourceResponse với bounding_boxes
- [ ] Test ChatMessage entity với analytics columns
- [ ] Test AIChatService.saveAIResponse với full metadata

### Integration Tests
- [ ] Test full chat flow với AI Service
- [ ] Test error handling (timeout, rate limit)
- [ ] Test session management
- [ ] Test analytics data persistence

### Manual Tests
- [ ] Verify health check endpoint
- [ ] Test chat với real AI Service
- [ ] Verify sources với bounding_boxes
- [ ] Check analytics data trong database

---

## 4. CONFIGURATION

### application.yml (Production)

```yaml
ai:
  service:
    url: https://maritime-ai-chatbot.onrender.com
    api-key: ${AI_SERVICE_API_KEY}
    timeout: 90
    retry:
      max-attempts: 2
      delay: 1000

# Logging for debugging
logging:
  level:
    com.example.lms.service.ai: DEBUG
```

### Environment Variables

```bash
# Production
AI_SERVICE_API_KEY=<key_từ_team_AI>

# Development
AI_SERVICE_URL=https://maritime-ai-chatbot.onrender.com
```

---

## 5. PRIORITY ORDER

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 High | Task 1: Update AIMetadataResponse | 30 min | Analytics |
| 🔴 High | Task 2: Update AISourceResponse | 30 min | Source highlighting |
| 🟡 Medium | Task 3: Update SourceDTO | 20 min | Frontend support |
| 🟡 Medium | Task 4: Update ChatMessage Entity | 20 min | Data persistence |
| 🟡 Medium | Task 5: Database Migration | 15 min | Schema update |
| 🟢 Low | Task 6: Update AIChatService | 45 min | Full integration |

**Tổng thời gian ước tính:** ~2.5 giờ

---

## 6. DEPENDENCIES

### Chờ từ Team AI:
1. **API Key** - Cần để test production
2. **Confirm metadata fields** - Đảm bảo response format
3. **Test data** - Sample responses để verify

### Không chờ (có thể làm ngay):
1. DTO updates (dựa trên API docs)
2. Entity updates
3. Database migration
4. Unit tests với mock data

---

*Document này sẽ được update khi có phản hồi từ Team AI.*
