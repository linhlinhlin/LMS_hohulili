# 🚨 Báo cáo lỗi CORS - Maritime AI Chatbot Backend

## Thông tin lỗi

**Ngày phát hiện:** 28/11/2025  
**Người báo cáo:** Team Frontend LMS  
**Mức độ:** Critical - Chặn hoàn toàn tính năng AI Chat

---

## Mô tả lỗi

Khi Frontend gọi API đến Maritime AI Chatbot Backend, request bị chặn bởi CORS policy.

### Error Message:
```
Access to fetch at 'https://maritime-ai-chatbot.onrender.com/api/v1/chat' 
from origin 'http://localhost:4200' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Chi tiết kỹ thuật:
- **Request URL:** `https://maritime-ai-chatbot.onrender.com/api/v1/chat`
- **Request Method:** POST
- **Origin:** `http://localhost:4200` (Angular dev server)
- **HTTP Status:** 0 (Request bị chặn trước khi đến server)
- **Error Type:** `net::ERR_FAILED`

---

## Nguyên nhân

Server AI Backend chưa cấu hình CORS headers để cho phép requests từ các origins khác nhau, đặc biệt là:
- `http://localhost:4200` (Development)
- `http://localhost:4300` (Development alternative)
- Domain production của LMS Frontend (khi deploy)

---

## Giải pháp đề xuất

### Cách 1: Cấu hình CORS trên Backend (Khuyến nghị)

Nếu backend sử dụng **FastAPI** (Python):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:4300",
        "https://lms-maritime.com",  # Production domain
        "*"  # Hoặc cho phép tất cả trong development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

Nếu backend sử dụng **Flask** (Python):
```python
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:4200", "https://lms-maritime.com"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-API-Key", "Authorization"]
    }
})
```

Nếu backend sử dụng **Express.js** (Node.js):
```javascript
const cors = require('cors');

app.use(cors({
    origin: ['http://localhost:4200', 'https://lms-maritime.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
    credentials: true
}));
```

### Cách 2: Cấu hình trên Render.com

Nếu deploy trên Render, có thể thêm headers trong `render.yaml` hoặc dashboard:
```yaml
headers:
  - path: /*
    name: Access-Control-Allow-Origin
    value: "*"
  - path: /*
    name: Access-Control-Allow-Methods
    value: "GET, POST, PUT, DELETE, OPTIONS"
  - path: /*
    name: Access-Control-Allow-Headers
    value: "Content-Type, X-API-Key, Authorization"
```

---

## Headers cần thiết

Server cần trả về các headers sau trong response:

```
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-API-Key, Authorization
Access-Control-Allow-Credentials: true
```

**Lưu ý:** Cần xử lý cả **preflight request** (OPTIONS method) trước khi xử lý POST request.

---

## Thông tin API đang sử dụng

| Endpoint | Method | Headers |
|----------|--------|---------|
| `/api/v1/chat` | POST | `Content-Type: application/json`, `X-API-Key: secret_key_cho_team_lms` |
| `/health` | GET | None |

---

## Request Body mẫu

```json
{
  "user_id": "student-1",
  "message": "Xin chào",
  "role": "student",
  "session_id": "session_abc123",
  "context": {
    "courseId": "course-1",
    "lessonId": "lesson-1",
    "pageUrl": "/student/courses/course-1"
  }
}
```

---

## Liên hệ

Nếu cần thêm thông tin, vui lòng liên hệ:
- **Team Frontend LMS**
- **Email:** [email của team]

---

## Trạng thái

- [ ] Đã báo cáo cho team AI
- [ ] Team AI đã xác nhận
- [ ] Đang xử lý
- [ ] Đã fix và deploy
- [ ] Frontend đã test thành công
