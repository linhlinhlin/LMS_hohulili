# 📋 BÁO CÁO TRAO ĐỔI: BACKEND AI ↔ TEAM LMS HÀNG HẢI

**Ngày:** 10/12/2025  
**Từ:** Team Backend AI  
**Đến:** Team LMS Hàng Hải (Spring Boot Backend)  
**Chủ đề:** Đề xuất kiến trúc tích hợp AI Service + Câu hỏi xác nhận

---

## 1. TỔNG QUAN

Backend AI Service (`Maritime AI Tutor v0.9.8`) đã sẵn sàng cho tích hợp với hệ thống LMS. Báo cáo này trình bày:

1. ✅ Kiến trúc tích hợp đề xuất (Option 1)
2. ✅ API Documentation
3. ❓ Các câu hỏi cần xác nhận từ team LMS

---

## 2. ĐỀ XUẤT KIẾN TRÚC: OPTION 1 - SMART ORCHESTRATOR

### 2.1. Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LMS SYSTEM                                    │
│                                                                      │
│   [Angular Frontend] ──JWT──▶ [Spring Boot Backend]                 │
│                                      │                               │
│                                      │ • Xác thực user              │
│                                      │ • Lưu chat logs              │
│                                      │ • Tracking learning progress │
│                                      │                               │
└──────────────────────────────────────┼───────────────────────────────┘
                                       │
                                       │ API Key + user_id + message
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND AI SERVICE                               │
│                                                                      │
│   POST /api/v1/chat/                                                │
│   • Xử lý RAG (tra cứu tài liệu hàng hải)                          │
│   • Trả về answer + sources với bounding boxes                      │
│   • Tự động học behavioral insights per user                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2. Phân chia trách nhiệm

| Trách nhiệm | Team LMS | Team AI |
|-------------|----------|---------|
| User Authentication | ✅ | ❌ |
| User Database | ✅ | ❌ (chỉ nhận user_id) |
| Chat Logs Storage | ✅ | ❌ |
| Learning Progress | ✅ | ❌ |
| Analytics/Reporting | ✅ | ❌ |
| AI Processing (RAG) | ❌ | ✅ |
| Knowledge Base | ❌ | ✅ |
| Source Highlighting | ❌ (UI) | ✅ (Data) |
| AI Memory/Insights | ❌ | ✅ (Auto-managed) |

---

## 3. API DOCUMENTATION TÓM TẮT

### 3.1. Base URL
```
Production: https://maritime-ai-chatbot.onrender.com
```

### 3.2. Authentication
```http
X-API-Key: {api_key_sẽ_cấp_cho_LMS}
```

### 3.3. Main API: POST /api/v1/chat/

**Request từ LMS:**
```json
{
  "user_id": "lms_student_12345",
  "message": "Điều 15 Luật Hàng hải 2015 là gì?",
  "role": "student",
  "session_id": "session_abc123"
}
```

**Response từ AI:**
```json
{
  "status": "success",
  "data": {
    "answer": "<thinking>Phân tích câu hỏi...</thinking>\n\nĐiều 15 quy định về Chủ tàu...",
    "sources": [
      {
        "title": "Điều 15. Chủ tàu",
        "content": "Nội dung...",
        "image_url": "https://.../page_8.jpg",
        "page_number": 8,
        "document_id": "luat-hang-hai-2015",
        "bounding_boxes": [{"x0": 10, "y0": 15, "x1": 90, "y1": 35}]
      }
    ],
    "suggested_questions": ["Thuyền viên là gì?"]
  }
}
```

### 3.4. Xử lý `<thinking>` tags

Response có thể chứa `<thinking>...</thinking>` - đây là reasoning process của AI (giống ChatGPT/Claude).

**Khuyến nghị UI:**
- Default: Ẩn thinking content
- User toggle: "Xem quá trình suy luận"

### 3.5. Source Highlighting

`bounding_boxes` chứa tọa độ (percentage 0-100) để highlight trên PDF:
- Dùng PDF.js hoặc image overlay
- `image_url` chứa ảnh trang PDF đã render

---

## 4. CODE EXAMPLE CHO SPRING BOOT

```java
@Service
public class AIClient {
    
    @Value("${ai.service.url}")
    private String aiServiceUrl;
    
    @Value("${ai.service.api-key}")
    private String apiKey;
    
    private final RestTemplate restTemplate;
    
    public AIResponse chat(String userId, String message, String role, String sessionId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-API-Key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, String> body = Map.of(
            "user_id", userId,
            "message", message,
            "role", role,
            "session_id", sessionId
        );
        
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        
        return restTemplate.postForObject(
            aiServiceUrl + "/api/v1/chat/",
            request,
            AIResponse.class
        );
    }
}
```

---

## 5. ❓ CÂU HỎI CHO TEAM LMS

### 5.1. Xác nhận kiến trúc

> **Câu hỏi 1:** Team LMS có đồng ý với kiến trúc Option 1 không?
> - LMS Backend làm orchestrator
> - AI Backend là stateless service
> - Chat logs lưu ở LMS database

### 5.2. Cấu trúc User ID

> **Câu hỏi 2:** Format `user_id` từ LMS database là gì?
> - UUID? (e.g., `550e8400-e29b-41d4-a716-446655440000`)
> - Integer? (e.g., `12345`)
> - Custom string? (e.g., `student_12345`)

### 5.3. Session Management

> **Câu hỏi 3:** LMS muốn quản lý session như thế nào?
> - A) Frontend generate session_id (client-side)
> - B) LMS Backend generate session_id (server-side)
> - C) Dùng JWT session ID

### 5.4. Rate Limiting

> **Câu hỏi 4:** Ước tính số request/phút peak?
> - Hiện tại: 30 requests/minute per IP
> - Nếu cần cao hơn, AI team sẽ điều chỉnh

### 5.5. Error Handling

> **Câu hỏi 5:** LMS muốn handle lỗi AI như thế nào?
> - A) Show error message trực tiếp
> - B) Fallback message: "AI đang bận, vui lòng thử lại"
> - C) Queue và retry tự động

### 5.6. Analytics

> **Câu hỏi 6:** LMS có cần thêm thông tin nào trong response để tracking?
> - Topics accessed?
> - Confidence score?
> - Response complexity?

---

## 6. DOCUMENTS ĐÃ CHUẨN BỊ

| Document | Mô tả | Link |
|----------|-------|------|
| `LMS_INTEGRATION_API.md` | API reference chi tiết | [Link](./LMS_INTEGRATION_API.md) |
| `LMS_INTEGRATION_ARCHITECTURE.md` | Kiến trúc Option 1 | [Link](./LMS_INTEGRATION_ARCHITECTURE.md) |

---

## 7. NEXT STEPS

1. ⏳ Team LMS review và trả lời câu hỏi
2. ⏳ Team AI cấp API Key cho LMS production
3. ⏳ LMS implement AIClient trong Spring Boot
4. ⏳ Integration testing
5. ⏳ Go-live

---

**Liên hệ:**  
Team Backend AI - Maritime AI Tutor Project

*Vui lòng reply với câu trả lời cho các câu hỏi ở Section 5.*
