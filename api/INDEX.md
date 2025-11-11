# 📚 LMS Backend API Documentation - Index

> Tài liệu toàn bộ APIs cho dự án LMS Hàng Hải. Hướng dẫn cho team frontend phát triển ứng dụng.

---

## 📁 Danh Sách Tài Liệu

### 1. **COURSE_LEARNING_PAGE_API.md** (⭐ Quan Trọng Nhất)
📖 **Tài liệu chi tiết cho trang học khóa học**
- Kiến trúc tổng quan
- 13 endpoints chính
- Chi tiết từng API với examples
- Data structures (DTOs)
- Luồng dữ liệu
- Ví dụ TypeScript/React
- Best practices tối ưu hóa
- Xử lý lỗi
- Security & Bảo mật

👉 **Dành cho:** Frontend developers xây dựng trang `/student/learn/course/:courseId`

---

### 2. **QUICK_START_LEARNING_PAGE.md** (⚡ Nhanh Gọn)
📄 **Tóm tắt nhanh 3 API chính**
- Workflow nhanh 4 steps
- Cấu trúc dữ liệu chính
- Reference table
- Quiz & Assignment flow
- Common errors

👉 **Dành cho:** Muốn nhanh chóng bắt đầu code

---

### 3. **ENROLLED_COURSES_API.md** 
📚 **API lấy danh sách khóa học đã đăng ký**
- GET `/api/v1/courses/enrolled-courses`
- Query parameters & pagination
- Response structure
- Ví dụ code

👉 **Dành cho:** Trang danh sách khóa học của sinh viên

---

### 4. **API_GAP_ANALYSIS.md** (🔍 Thiếu Sót)
⚠️ **Phân tích những chức năng còn thiếu**
- 15 điểm cần cải thiện
- Ưu tiên: Critical → High → Medium → Low
- Giải pháp khuyến nghị
- Timeline implement

👉 **Dành cho:** Team backend & PO planning sprint

---

### 5. **QUICK_REFERENCE.md**
🎯 **Tóm tắt một trang**
- Endpoint chính
- Query parameters
- Success/Error responses
- Code examples
- Common errors

👉 **Dành cho:** Tham chiếu nhanh khi code

---

## 🚀 Bắt Đầu Nhanh

### Theo Trang Cần Xây Dựng:

#### 📖 **Trang Danh Sách Khóa Học** (student/courses)
```
📖 Xem: ENROLLED_COURSES_API.md
GET /api/v1/courses/enrolled-courses
```

#### 📚 **Trang Học Khóa Học** (student/learn/course/:id)
```
📖 Xem: COURSE_LEARNING_PAGE_API.md
⚡ Hoặc: QUICK_START_LEARNING_PAGE.md
```

#### 👨‍🏫 **Trang Giáo Viên Quản Lý Khóa Học** (teacher/courses)
```
(Tài liệu sẽ được cập nhật)
```

---

## 🔑 Top 3 API Cần Biết

### 1️⃣ Lấy Thông Tin Khóa Học
```http
GET /api/v1/courses/{courseId}
```
**Response fields:** id, title, description, teacherName, sectionsCount

### 2️⃣ Lấy Toàn Bộ Nội Dung (Navigation)
```http
GET /api/v1/courses/{courseId}/content
```
**Response:** Array of sections with nested lessons

### 3️⃣ Lấy Chi Tiết Bài Học
```http
GET /api/v1/courses/sections/lessons/{lessonId}
```
**Response:** Content HTML, video URL, attachments, lesson type

---

## 🔐 Xác Thực

**Tất cả API cần header:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Lấy token từ login:**
```http
POST /api/v1/auth/login
Body: { "username": "student001", "password": "password123" }
Response: { "token": "eyJhbGciOi..." }
```

---

## 🎯 Danh Sách Toàn Bộ Endpoints

### Course Management
| Endpoint | Method | Dùng Cho |
|----------|--------|----------|
| `/api/v1/courses` | GET | Danh sách khóa học công khai |
| `/api/v1/courses/{id}` | GET | Chi tiết khóa học |
| `/api/v1/courses/{id}/content` | GET | Sections + Lessons |
| `/api/v1/courses/enrolled-courses` | GET | Danh sách đã đăng ký |
| `/api/v1/courses/{id}/enroll` | POST | Đăng ký khóa học |

### Lesson Management
| Endpoint | Method | Dùng Cho |
|----------|--------|----------|
| `/api/v1/courses/sections/lessons/{id}` | GET | Chi tiết bài học |
| `/api/v1/lessons/{id}/attachments` | GET | File đính kèm |

### Quiz
| Endpoint | Method | Dùng Cho |
|----------|--------|----------|
| `/api/v1/quizzes/lessons/{id}` | GET | Thông tin quiz |
| `/api/v1/quizzes/lessons/{id}/questions` | GET | Câu hỏi quiz |
| `/api/v1/quizzes/{id}/attempts` | POST | Bắt đầu quiz |
| `/api/v1/quizzes/attempts/{id}/submit` | POST | Nộp quiz |
| `/api/v1/quizzes/{id}/attempts` | GET | Lịch sử attempts |

### Assignment
| Endpoint | Method | Dùng Cho |
|----------|--------|----------|
| `/api/v1/assignments/{id}` | GET | Chi tiết assignment |
| `/api/v1/courses/{id}/assignments` | GET | Danh sách assignment |
| `/api/v1/assignments/{id}/submissions` | POST | Nộp bài |
| `/api/v1/assignments/{id}/my-submission` | GET | Xem bài nộp |

---

## 🐛 Xử Lý Lỗi

### HTTP Status Codes:
- **200** ✅ Success
- **201** ✅ Created
- **400** ❌ Bad Request
- **401** ❌ Unauthorized (token invalid/expired)
- **403** ❌ Forbidden (no permission)
- **404** ❌ Not Found
- **500** ❌ Server Error

### Error Response Format:
```json
{
  "success": false,
  "error": "Thông báo lỗi (tiếng Việt)",
  "message": "Error"
}
```

---

## 📊 API Response Format

### Success Response:
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Success"
}
```

### Pagination Response:
```json
{
  "success": true,
  "data": {
    "content": [ /* items */ ],
    "totalElements": 50,
    "totalPages": 5,
    "currentPage": 1,
    "size": 10
  }
}
```

---

## 🔄 Data Flow Diagram

```
┌──────────────────────┐
│  Frontend (React)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│  Call API Endpoints          │
│  (with JWT Token)            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Spring Boot Backend         │
│  - Controllers               │
│  - Services                  │
│  - Repositories              │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  PostgreSQL Database         │
│  (with Flyway migrations)    │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Return JSON Response        │
│  - Data DTOs                 │
│  - Error messages (VI)       │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Frontend Renders UI         │
│  - Tables, Cards, Forms      │
│  - Handle Errors             │
│  - Refresh/Refetch Data      │
└──────────────────────────────┘
```

---

## ⚙️ Server Info

- **Base URL:** `http://localhost:8088`
- **API Prefix:** `/api/v1`
- **Database:** PostgreSQL 16
- **Auth:** JWT (Bearer Token)
- **CORS:** Configured

---

## 🚦 Migration Paths

### V1 → V2 Breaking Changes:
None documented yet. APIs are stable for current implementation.

---

## 📞 Support & Contact

### 🐛 Found an Issue?
1. Check **API_GAP_ANALYSIS.md** for known gaps
2. Create GitHub Issue with details
3. Contact backend team

### ❓ Questions?
- Check relevant `.md` file first
- Look at examples provided
- Ask in team Slack/Discord

### 🚀 Feature Request?
- Add to backlog issue
- Tag `@backend-team`
- Include use case & priority

---

## 📈 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-11-11 | ✅ Complete Learning Page API docs |
| 1.5 | 2025-11-11 | ✅ Added Gap Analysis |
| 1.0 | Earlier | ✅ Initial Enrolled Courses docs |

---

## 🎓 Learning Resources

### For Frontend Developers:
1. **Start here:** QUICK_START_LEARNING_PAGE.md
2. **Go deeper:** COURSE_LEARNING_PAGE_API.md
3. **Check gaps:** API_GAP_ANALYSIS.md
4. **Quick ref:** QUICK_REFERENCE.md

### For Backend Developers:
1. **Understand frontend needs:** API_GAP_ANALYSIS.md
2. **Implement missing features** from Critical list
3. **Test with team** before release

---

## 🎯 Next Steps

### Week 1-2: Frontend Development
- [ ] Implement Learning Page with current APIs
- [ ] Handle errors & edge cases
- [ ] Integrate authentication
- [ ] Create components for Quiz/Assignment

### Week 3-4: Backend Enhancement
- [ ] Implement Progress Tracking API
- [ ] Add Comments System
- [ ] Optimize database queries
- [ ] Improve error messages

### Ongoing: Collaboration
- [ ] Daily sync on blockers
- [ ] Weekly architecture review
- [ ] Bi-weekly demo to stakeholders

---

## 📌 Important Notes

⚠️ **API is still under development** - Check for updates weekly

✅ **Current Status:** 80% feature complete for Learning Page

🔔 **Next Release:** Progress Tracking API (scheduled for Week 3)

---

**Last Updated:** 11/11/2025  
**Maintained by:** LMS Backend Team  
**For:** Frontend Development  
**Status:** 🟢 Active Development
