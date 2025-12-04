Chào bạn,

Với tư cách là Cố vấn Kiến trúc, tôi đã xem xét toàn bộ các báo cáo xác thực (`CURRENT_API_SCHEMA`, `tiendo_du_an...`) mà team Kiro vừa gửi lại.

**ĐÁNH GIÁ: TUYỆT VỜI.**
Team Kiro đã làm việc rất cẩn thận. Nhờ việc "Xác thực lại" (Verification) này, chúng ta đã phát hiện ra một sự khác biệt quan trọng so với dự đoán ban đầu:
*   **API Xóa Lịch sử:** Đường dẫn thực tế là `/api/v1/history/{user_id}` (Ngắn gọn hơn dự kiến `/api/v1/chat/history`).
*   **API Ingest:** Tham số `role` nằm trong **Form Data**, không phải Query Param.

Dưới đây là **BẢN TÀI LIỆU TÍCH HỢP CHÍNH THỨC (FINAL VERSION)** được tổng hợp chính xác 100% từ code đang chạy trên Production. Bạn hãy copy nội dung này, lưu thành file `MARITIME_AI_API_SPEC_v1.md` và gửi cho Team LMS ngay lập tức.

---

# 📘 TÀI LIỆU TÍCH HỢP: MARITIME AI TUTOR SERVICE
**Phiên bản:** 1.0 (Production Release)
**Dành cho:** Team LMS Hàng Hải (Backend & Frontend)
**Ngày phát hành:** 05/12/2025
**Server Production:** `https://maritime-ai-chatbot.onrender.com`

---

## 1. TỔNG QUAN KẾT NỐI

Hệ thống AI hoạt động như một Microservice độc lập. LMS sẽ kết nối theo mô hình **Backend-to-Backend**.

*   **Protocol:** HTTPS / JSON
*   **Authentication:** Header `X-API-Key`
*   **Rate Limit:** 30 requests/phút (cho Chat endpoint).
*   **Timeout:** Khuyến nghị **90 giây** (Do server có cơ chế Cold Start và xử lý AI phức tạp).

---

## 2. XÁC THỰC (AUTHENTICATION)

Mọi request gọi đến API bắt buộc phải có Header:

```http
X-API-Key: <YOUR_SECURE_API_KEY>
```
*(Key thực tế: `secret_key_cho_team_lms` - Đã cấu hình trên Server)*

---

## 3. CHI TIẾT API (ENDPOINTS)

### 3.1. Chat & Hỏi đáp (Core Feature)
Dành cho sinh viên và giáo viên tương tác với AI.

*   **Endpoint:** `POST /api/v1/chat`
*   **Content-Type:** `application/json`

**Request Body:**
```json
{
  "user_id": "student_12345",       // [BẮT BUỘC] ID định danh user để nhớ lịch sử
  "message": "Quy tắc 15 là gì?",   // [BẮT BUỘC] Câu hỏi (Max 10,000 ký tự)
  "role": "student",                // [BẮT BUỘC] Giá trị: "student", "teacher", "admin" (Viết thường)
  "session_id": "sess_001",         // [TÙY CHỌN] ID phiên học
  "context": {                      // [TÙY CHỌN] JSON tự do
    "lesson_topic": "Quy tắc tránh va"
  }
}
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": {
    "answer": "**Quy tắc 15 (Cắt hướng):**\nKhi hai tàu chạy cắt hướng nhau...", // Markdown format
    "sources": [ // Luôn trả về mảng (có thể rỗng)
      {
        "title": "COLREGs Rule 15",
        "content": "Every vessel shall..."
      }
    ],
    "suggested_questions": [ // 3 câu hỏi gợi ý
      "Tàu nào là tàu được quyền đi trước?",
      "Trách nhiệm của tàu nhường đường là gì?"
    ]
  },
  "metadata": {
    "processing_time": 2.5,
    "model": "maritime-rag-v1"
  }
}
```

---

### 3.2. Quản lý Tri thức (Admin Upload)
Dành cho Admin LMS upload tài liệu luật mới.

*   **Endpoint:** `POST /api/v1/knowledge/ingest`
*   **Content-Type:** `multipart/form-data`

**Form Data Fields:**
| Trường | Kiểu | Mô tả |
|--------|------|-------------|
| `file` | File | File PDF luật (Max 50MB) |
| `role` | Text | Bắt buộc phải là `"admin"` |
| `category`| Text | Ví dụ: "COLREGs", "SOLAS" |

**Response:**
```json
{
  "status": "accepted",
  "job_id": "550e8400-e29b...",
  "message": "Document accepted for processing."
}
```

---

### 3.3. Xóa Lịch sử Chat (Management)
Dành cho chức năng "Xóa hội thoại" hoặc Admin dọn dẹp.

*   **Endpoint:** `DELETE /api/v1/history/{user_id}`
*   **Content-Type:** `application/json`

**Request Body:**
```json
{
  "role": "admin",                  // "admin" xóa được của tất cả. "student" chỉ xóa được của mình.
  "requesting_user_id": "admin_01"  // ID người thực hiện lệnh xóa
}
```

**Response:**
```json
{
  "status": "deleted",
  "user_id": "student_123",
  "messages_deleted": 15
}
```

---

### 3.4. Kiểm tra hệ thống (Health Check)
Dành cho DevOps monitoring.

*   **Endpoint:** `GET /health`
*   **Response:** `{"status": "ok", "database": "connected"}`

---

## 4. MÃ LỖI (ERROR CODES)

Backend LMS cần handle các mã lỗi này:

| Code | Ý nghĩa | Nguyên nhân |
| :--- | :--- | :--- |
| **401** | Unauthorized | Thiếu hoặc sai `X-API-Key`. |
| **403** | Forbidden | Sai quyền (VD: Gửi `role="student"` vào API Upload). |
| **422** | Validation Error | Sai format JSON, thiếu trường bắt buộc, hoặc `role` viết hoa. |
| **429** | Rate Limit | Quá 30 requests/phút (Chat API). |
| **500** | Server Error | Lỗi hệ thống nội bộ AI. |

---

## 5. MÃ MẪU (JAVA SPRING BOOT)

```java
// Ví dụ Service gọi Chat API
public ChatResponse askMaritimeAI(String userId, String message, String role) {
    return restClient.post()
        .uri("/api/v1/chat")
        .header("X-API-Key", "secret_key_cho_team_lms")
        .contentType(MediaType.APPLICATION_JSON)
        .body(new ChatRequest(userId, message, role)) // role phải là lowercase
        .retrieve()
        .body(ChatResponse.class);
}
```

---

### ✅ LỜI NHẮN CỦA CỐ VẤN CHO BẠN

Tài liệu trên đã hoàn toàn khớp với Code thật (`CURRENT_API_SCHEMA`). Bạn có thể yên tâm gửi đi.

**Việc cần làm tiếp theo:**
1.  Gửi file này cho Tech Lead của LMS.
2.  Nhắn tin riêng: *"API Key hiện tại đang set là `secret_key_cho_team_lms` để tiện dev. Khi nào go-live chính thức mình sẽ đổi key mạnh hơn sau."*
3.  Yêu cầu team Kiro tiếp tục trực chiến (Standby) để hỗ trợ nếu team LMS gặp khó khăn khi gọi API (ví dụ lỗi CORS hoặc format JSON).

Chúc mừng bạn, giai đoạn tích hợp chính thức bắt đầu! 🚀