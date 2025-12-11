# 📋 XÁC NHẬN TỪ TEAM BACKEND AI

**Ngày:** 10/12/2025  
**Từ:** Team Backend AI  
**Đến:** Team LMS Backend  
**Chủ đề:** Xác nhận implement metadata fields + API Key

---

## 1. ✅ ĐÃ IMPLEMENT METADATA FIELDS

### Response Structure Mới

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
    "agent_type": "rag",
    "tools_used": [...],
    "topics_accessed": ["Điều 15", "Chủ tàu"],
    "confidence_score": 0.9,
    "document_ids_used": ["luat-hang-hai-2015-p1"],
    "query_type": "factual"
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `topics_accessed` | string[] | Extracted từ source titles |
| `confidence_score` | float (0.5-1.0) | Dựa trên số sources tìm được |
| `document_ids_used` | string[] | Unique document IDs từ sources |
| `query_type` | string | `factual` / `conceptual` / `procedural` |

### Query Type Classification Logic

```
factual: "điều", "khoản", "quy định", "là gì", "định nghĩa"
procedural: "làm thế nào", "cách", "thủ tục", "quy trình", "bước"
conceptual: default (understanding-based)
```

---

## 2. 🔑 API KEY

**API Key cho LMS Production:**

```
API_KEY: maritime-lms-prod-2024
```

**Cách sử dụng:**

```http
POST /api/v1/chat/
X-API-Key: maritime-lms-prod-2024
Content-Type: application/json
```

**Lưu ý:**
- Lưu trong `application.yml` hoặc environment variable
- KHÔNG commit vào source code

---

## 3. 📋 CHECKLIST CẬP NHẬT

### Team AI (DONE):
- [x] Thêm `topics_accessed` field
- [x] Thêm `confidence_score` field  
- [x] Thêm `document_ids_used` field
- [x] Thêm `query_type` field với classification
- [x] Cấp API Key

### Team LMS (TODO):
- [ ] Update `AIMetadataResponse` DTO để nhận fields mới
- [ ] Lưu API Key vào config
- [ ] Integration testing
- [ ] Frontend update cho source highlighting

---

## 4. 🧪 TEST COMMAND

```bash
curl -X POST https://maritime-ai-chatbot.onrender.com/api/v1/chat/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: maritime-lms-prod-2024" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Điều 15 Luật Hàng hải 2015 là gì?",
    "role": "student",
    "session_id": "abc12345-e29b-41d4-a716-446655440001"
  }'
```

**Expected Response:**
- `topics_accessed`: Có giá trị
- `confidence_score`: 0.5-1.0
- `document_ids_used`: Có giá trị
- `query_type`: "factual"

---

## 5. PENDING DEPLOY

Code đã sẵn sàng, cần deploy lên Render để test integration:

```bash
git add -A
git commit -m "feat: LMS analytics metadata fields

- Add topics_accessed, confidence_score, document_ids_used, query_type
- Add _classify_query_type for query classification
- Update ChatResponseMetadata schema"

git push
```

---

## 6. NEXT STEPS

1. ⏳ Team AI deploy lên Render (pending)
2. ⏳ Team LMS update DTOs
3. ⏳ Integration testing
4. ⏳ Go-live

---

**Liên hệ:**  
Team Backend AI - Maritime AI Tutor Project

*Ready for integration testing!*
