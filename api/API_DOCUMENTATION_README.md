# 🎓 LMS Hàng Hải - Backend API Documentation

Tài liệu toàn bộ các API backend cho dự án Learning Management System (LMS) ngành Hàng Hải.

**👉 Dành cho:** Team Frontend Development  
**📅 Cập nhật:** 11/11/2025  
**✅ Status:** Ready for Development

---

## 📚 Tài Liệu API Chính

### 🌟 **START HERE** - Trang Học Khóa Học
```
📖 File: COURSE_LEARNING_PAGE_API.md
📊 Danh sách: 13 endpoints
🎯 Dùng cho: Trang student/learn/course/:courseId
⏱️ Đọc: 15 phút
```

**Bao gồm:**
- ✅ Kiến trúc UI/UX tổng quan
- ✅ 13 APIs với ví dụ đầy đủ
- ✅ Data structures (DTOs)
- ✅ Luồng dữ liệu chi tiết
- ✅ Ví dụ TypeScript/React
- ✅ Best practices
- ✅ Security guidelines

[👉 Mở tài liệu](./COURSE_LEARNING_PAGE_API.md)

---

### ⚡ **QUICK START** - Bắt Đầu Nhanh
```
📄 File: QUICK_START_LEARNING_PAGE.md
📊 Danh sách: 3 API chính + workflows
🎯 Dùng cho: Lập trình nhanh
⏱️ Đọc: 5 phút
```

[👉 Mở tài liệu](./QUICK_START_LEARNING_PAGE.md)

---

### 📋 **Danh Sách Khóa Học Đã Đăng Ký**
```
📄 File: ENROLLED_COURSES_API.md
🎯 Dùng cho: Trang danh sách khóa học
⏱️ Đọc: 10 phút
```

**API:**
- `GET /api/v1/courses/enrolled-courses` - Danh sách khóa học đã đăng ký

[👉 Mở tài liệu](./ENROLLED_COURSES_API.md)

---

### 🔍 **Phân Tích Thiếu Sót**
```
📄 File: API_GAP_ANALYSIS.md
📊 Danh sách: 15 issues cần cải thiện
🎯 Dùng cho: Product owner, Backend team planning
⏱️ Đọc: 15 phút
```

**Bao gồm:**
- 🔴 Critical (4 issues)
- 🟡 High Priority (4 issues)
- 🟢 Medium (4 issues)
- 🔵 Low (3 issues)

[👉 Mở tài liệu](./API_GAP_ANALYSIS.md)

---

### 📇 **Tóm Tắt Một Trang**
```
📄 File: QUICK_REFERENCE.md
🎯 Dùng cho: Tham chiếu nhanh
⏱️ Đọc: 3 phút
```

[👉 Mở tài liệu](./QUICK_REFERENCE.md)

---

### 📑 **Index & Navigation**
```
📄 File: INDEX.md
🎯 Dùng cho: Điều hướng tất cả tài liệu
⏱️ Đọc: 5 phút
```

[👉 Mở tài liệu](./INDEX.md)

---

## 🚀 Bắt Đầu Công Việc

### Bước 1️⃣: Xem tài liệu chính
```bash
# Dành cho trang học khóa học
📖 Đọc: COURSE_LEARNING_PAGE_API.md
```

### Bước 2️⃣: Nếu cần tóm tắt
```bash
# Bản quick start
⚡ Đọc: QUICK_START_LEARNING_PAGE.md
```

### Bước 3️⃣: Lập trình
```javascript
// Sử dụng examples từ tài liệu
// Bắt đầu implement
```

### Bước 4️⃣: Nếu có issue
```bash
# Kiểm tra thiếu sót
📄 Xem: API_GAP_ANALYSIS.md

# Liên hệ backend
📞 Tạo GitHub issue
```

---

## 🎯 Danh Sách 3 API Quan Trọng Nhất

### 1️⃣ Lấy Thông Tin Khóa Học
```http
GET /api/v1/courses/{courseId}
```
- Tiêu đề khóa học
- Tên giáo viên
- Mô tả
- Số chương

### 2️⃣ Lấy Toàn Bộ Nội Dung (Navigation)
```http
GET /api/v1/courses/{courseId}/content
```
- Danh sách sections
- Danh sách lessons trong mỗi section
- Thứ tự sắp xếp

### 3️⃣ Lấy Chi Tiết Bài Học
```http
GET /api/v1/courses/sections/lessons/{lessonId}
```
- Nội dung HTML
- Video URL
- File đính kèm
- Loại bài học (lecture/quiz/assignment)

---

## 🔐 Xác Thực (Authentication)

**Tất cả API cần:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Lấy token:**
```http
POST /api/v1/auth/login
{
  "username": "student001",
  "password": "password123"
}
```

---

## 🏗️ Kiến Trúc API

```
┌─────────────────┐
│   Frontend      │
│   (React/Vue)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌──────────────────────────┐
│   Spring Boot Backend    │
│   - Controllers          │
│   - Services             │
│   - Repositories (JPA)   │
└────────┬─────────────────┘
         │ JDBC/Hibernate
         ▼
┌──────────────────────────┐
│   PostgreSQL Database    │
│   (with Flyway)          │
└──────────────────────────┘
```

---

## 📊 API Statistics

| Loại | Số Lượng |
|------|---------|
| Total Endpoints | 20+ |
| STUDENT Role | 15 |
| TEACHER Role | 10 |
| ADMIN Role | 5+ |
| GET Methods | 12 |
| POST Methods | 5 |
| PUT Methods | 2 |
| DELETE Methods | 1 |

---

## 🎓 Các Tính Năng Hỗ Trợ

### ✅ Hoàn Thiện
- [x] Course Management
- [x] Sections & Lessons
- [x] Lesson Attachments
- [x] Quiz System
- [x] Assignment System
- [x] File Upload/Download
- [x] User Authentication
- [x] Role-based Access

### ⚠️ Cần Cải Thiện
- [ ] Progress Tracking
- [ ] Comments/Discussion
- [ ] Bookmarks/Favorites
- [ ] Video Progress Saving
- [ ] Course Search
- [ ] Notifications

👉 **Chi tiết:** Xem [API_GAP_ANALYSIS.md](./API_GAP_ANALYSIS.md)

---

## 🛠️ Tools & Technologies

### Backend
- Java 21
- Spring Boot 3.5.6
- Spring Security
- Spring Data JPA
- Hibernate 6.6.29
- PostgreSQL 16
- Flyway (migrations)

### API Documentation
- Swagger/OpenAPI 3.0
- URL: `http://localhost:8088/swagger-ui`

### Other
- JWT Authentication
- BCrypt Password Hashing
- Lombok (code generation)

---

## 🌐 Server Information

| Item | Giá Trị |
|------|--------|
| **Base URL** | `http://localhost:8088` |
| **API Prefix** | `/api/v1` |
| **Swagger UI** | `http://localhost:8088/swagger-ui` |
| **Health Check** | `http://localhost:8088/api/v1/health` |
| **Database** | PostgreSQL 16 |
| **Port** | 8088 |

---

## 💡 Tips & Tricks

### Caching
```javascript
// Cache course content để tránh request liên tục
const cache = new Map();
```

### Parallel Requests
```javascript
// Fetch data cùng lúc
Promise.all([api1(), api2()])
```

### Error Handling
```javascript
// Luôn handle 401/403
try { ... } catch (e) { ... }
```

---

## 📞 Support

### 🐛 Found Bug?
1. Check [API_GAP_ANALYSIS.md](./API_GAP_ANALYSIS.md)
2. Create GitHub Issue
3. Contact backend team

### ❓ Questions?
- Check relevant documentation file
- Look at examples
- Ask in team chat

### 🚀 Feature Request?
- File GitHub issue
- Tag `@backend-team`
- Provide use case

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.0** | 2025-11-11 | ✅ Complete Learning Page API |
| **1.5** | 2025-11-11 | ✅ Gap Analysis Added |
| **1.0** | Earlier | ✅ Initial Enrolled Courses API |

---

## 🎯 Next Phase

### Planned for Next Sprint:
- [ ] Progress Tracking API
- [ ] Comments/Discussion System
- [ ] Video Progress Tracking
- [ ] Search Functionality
- [ ] Performance Optimization

**Expected:** 2 weeks

---

## 📋 Checklist untuk Frontend Team

### Before Starting
- [ ] Bạn có quyền truy cập repository?
- [ ] Bạn đã cài Node.js & npm?
- [ ] Bạn đã cài Postman hoặc Thunder Client?
- [ ] Bạn đã đọc file tài liệu chính?

### During Development
- [ ] Bạn có JWT token để test?
- [ ] Bạn đã setup proxy cho API calls?
- [ ] Bạn đã handle errors với UI message?
- [ ] Bạn đã test pagination?

### Before Submitting
- [ ] Tất cả components render đúng?
- [ ] API calls thành công?
- [ ] Error handling hoạt động?
- [ ] Performance OK (loading time)?

---

## 🎬 Getting Started Commands

### Chạy Backend
```bash
cd api
mvn spring-boot:run
```

### Chạy Frontend (giả sử)
```bash
cd frontend
npm install
npm start
```

### Test API (cURL)
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8088/api/v1/courses/COURSE_ID
```

---

## 📖 File Locations

```
LMS_hohulili/
├── api/
│   ├── COURSE_LEARNING_PAGE_API.md      📖 MAIN
│   ├── QUICK_START_LEARNING_PAGE.md     ⚡ QUICK
│   ├── ENROLLED_COURSES_API.md          📋 LIST
│   ├── API_GAP_ANALYSIS.md              🔍 GAPS
│   ├── QUICK_REFERENCE.md               📇 REF
│   ├── INDEX.md                         📑 INDEX
│   ├── README.md (lưu ý tài liệu)
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/example/lms/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── repository/
│       │   ├── entity/
│       │   └── dto/
│       └── resources/
│           ├── application.yml
│           ├── application-dev.yml
│           └── application-prod.yml
└── frontend/
    └── ... (React/Vue)
```

---

## 🔄 Development Workflow

```
1. Đọc tài liệu
   ↓
2. Hiểu API structure
   ↓
3. Setup frontend project
   ↓
4. Implement components
   ↓
5. Test với Postman
   ↓
6. Connect API
   ↓
7. Handle errors
   ↓
8. Optimize
   ↓
9. Deploy
```

---

## 🎓 Learning Path

### Day 1: Basics
- [ ] Read QUICK_START_LEARNING_PAGE.md
- [ ] Understand 3 main APIs
- [ ] Setup Postman

### Day 2-3: Deep Dive
- [ ] Read COURSE_LEARNING_PAGE_API.md
- [ ] Test all APIs in Postman
- [ ] Review data structures

### Day 4-5: Implementation
- [ ] Start coding components
- [ ] Connect to backend
- [ ] Handle errors

### Day 6-7: Polish
- [ ] Add loading states
- [ ] Optimize performance
- [ ] Code review

---

## ✨ Final Notes

> "Tài liệu này được tạo để giúp team frontend phát triển nhanh chóng và hiệu quả. Nếu có bất kỳ điểm nào không rõ, vui lòng hỏi ngay!"

**Chúc bạn lập trình vui vẻ! 🚀**

---

**Created:** 11/11/2025  
**Updated:** 11/11/2025  
**Maintained by:** Backend Team  
**For:** Frontend Development  
**Status:** ✅ Ready to Use
