# Postman Collection - API Tests

> File này chứa các ví dụ request/response chi tiết để test trong Postman hoặc Insomnia

---

## 📌 Base URL

```
http://localhost:8089
```

---

## 🔑 Authentication Token

Thêm vào **Headers** cho tất cả requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJpYXQiOjE2MzE2MzYwMDAsImV4cCI6MTYzMTcyMjQwMH0.abcdefg...
```

---

## 1️⃣ Học Sinh - Lấy Khóa Học Đã Đăng Ký

### Request
```http
GET /api/v1/courses/enrolled-courses?page=1&limit=10 HTTP/1.1
Host: localhost:8089
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### cURL
```bash
curl --location --request GET 'http://localhost:8089/api/v1/courses/enrolled-courses?page=1&limit=10' \
--header 'Authorization: Bearer {JWT_TOKEN}' \
--header 'Content-Type: application/json'
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Khóa Học Hàng Hải Cơ Bản",
        "description": "Học các kiến thức cơ bản về hàng hải",
        "teacher": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "fullName": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "imageUrl": "https://example.com/course-image.jpg",
        "enrolledCount": 25,
        "sectionCount": 5,
        "lessonCount": 20,
        "enrolled": true,
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-20T14:45:00Z"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10,
      "sort": [],
      "offset": 0,
      "paged": true,
      "unpaged": false
    },
    "totalPages": 1,
    "totalElements": 1,
    "last": true,
    "numberOfElements": 1,
    "first": true,
    "size": 10,
    "number": 0,
    "empty": false
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

### Possible Error Responses

**403 Forbidden (Not a Student)**
```json
{
  "success": false,
  "message": "Access Denied - Only STUDENT role can access this endpoint",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

---

## 2️⃣ Giáo Viên - Lấy Khóa Học Của Mình

### Request
```http
GET /api/v1/courses/my-courses?page=1&limit=10 HTTP/1.1
Host: localhost:8089
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### cURL
```bash
curl --location --request GET 'http://localhost:8089/api/v1/courses/my-courses?page=1&limit=10' \
--header 'Authorization: Bearer {JWT_TOKEN}' \
--header 'Content-Type: application/json'
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Khóa Học Hàng Hải Cơ Bản",
        "description": "Học các kiến thức cơ bản về hàng hải",
        "teacher": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "fullName": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "imageUrl": "https://example.com/course-image.jpg",
        "enrolledCount": 25,
        "sectionCount": 5,
        "lessonCount": 20,
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-20T14:45:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Kỹ Năng Điều Hành Tàu",
        "description": "Phát triển kỹ năng điều hành tàu hiệu quả",
        "teacher": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "fullName": "Nguyễn Văn A",
          "email": "teacher@example.com"
        },
        "imageUrl": "https://example.com/ship-control.jpg",
        "enrolledCount": 18,
        "sectionCount": 4,
        "lessonCount": 16,
        "createdAt": "2025-01-10T08:00:00Z",
        "updatedAt": "2025-01-22T16:20:00Z"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10
    },
    "totalPages": 1,
    "totalElements": 2
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

### Possible Error Responses

**403 Forbidden (Not a Teacher)**
```json
{
  "success": false,
  "message": "Access Denied - Only TEACHER or ADMIN role can access this endpoint",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

---

## 3️⃣ Lấy Chi Tiết Bài Giảng

### Request
```http
GET /api/v1/courses/sections/lessons/550e8400-e29b-41d4-a716-446655440003 HTTP/1.1
Host: localhost:8089
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### cURL
```bash
curl --location --request GET 'http://localhost:8089/api/v1/courses/sections/lessons/550e8400-e29b-41d4-a716-446655440003' \
--header 'Authorization: Bearer {JWT_TOKEN}' \
--header 'Content-Type: application/json'
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "title": "Giới Thiệu Hàng Hải",
    "description": "Bài giảng cơ bản về hàng hải",
    "content": "<h2>Mục Tiêu Bài Giảng</h2><p>Học sinh sẽ hiểu về lịch sử hàng hải...</p><h2>Nội Dung Chính</h2><ul><li>Định nghĩa hàng hải</li><li>Lịch sử phát triển</li><li>Tầm quan trọng hiện tại</li></ul>",
    "videoUrl": "https://example.com/videos/lesson-1.mp4",
    "durationMinutes": 45,
    "orderIndex": 1,
    "lessonType": "LECTURE",
    "sectionId": "550e8400-e29b-41d4-a716-446655440002",
    "sectionTitle": "Section 1: Giới Thiệu",
    "courseId": "550e8400-e29b-41d4-a716-446655440000",
    "courseTitle": "Khóa Học Hàng Hải Cơ Bản",
    "attachments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "fileName": "slide-1.pdf",
        "originalFileName": "slide-1.pdf",
        "fileUrl": "https://example.com/files/550e8400-e29b-41d4-a716-446655440004/slide-1.pdf",
        "fileSize": 2048576,
        "contentType": "application/pdf",
        "fileType": "PDF",
        "displayOrder": 1,
        "uploadedAt": "2025-01-15T10:30:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "fileName": "document.docx",
        "originalFileName": "document.docx",
        "fileUrl": "https://example.com/files/550e8400-e29b-41d4-a716-446655440005/document.docx",
        "fileSize": 1024000,
        "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "fileType": "DOCX",
        "displayOrder": 2,
        "uploadedAt": "2025-01-15T10:45:00Z"
      }
    ],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-20T14:45:00Z"
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

### Possible Error Responses

**404 Not Found (Lesson doesn't exist)**
```json
{
  "success": false,
  "message": "Không tìm thấy bài học",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

---

## 4️⃣ Lấy Cấu Trúc Khóa Học (Sections + Lessons)

### Request
```http
GET /api/v1/courses/550e8400-e29b-41d4-a716-446655440000/content HTTP/1.1
Host: localhost:8089
Content-Type: application/json
```

### cURL (Public - không cần token)
```bash
curl --location --request GET 'http://localhost:8089/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/content' \
--header 'Content-Type: application/json'
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Khóa Học Hàng Hải Cơ Bản",
    "description": "Học các kiến thức cơ bản về hàng hải",
    "sections": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "title": "Section 1: Giới Thiệu",
        "description": "Giới thiệu cơ bản về hàng hải",
        "orderIndex": 1,
        "lessonsCount": 3,
        "lessons": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440003",
            "title": "Giới Thiệu Hàng Hải",
            "description": "Bài giảng cơ bản",
            "videoUrl": "https://example.com/videos/lesson-1.mp4",
            "durationMinutes": 45,
            "orderIndex": 1,
            "lessonType": "LECTURE"
          },
          {
            "id": "550e8400-e29b-41d4-a716-446655440006",
            "title": "Các Loại Tàu",
            "description": "Các loại tàu khác nhau",
            "videoUrl": "https://example.com/videos/lesson-2.mp4",
            "durationMinutes": 30,
            "orderIndex": 2,
            "lessonType": "LECTURE"
          },
          {
            "id": "550e8400-e29b-41d4-a716-446655440009",
            "title": "Quiz: Kiểm Tra Kiến Thức",
            "description": "Kiểm tra hiểu biết",
            "videoUrl": null,
            "durationMinutes": 15,
            "orderIndex": 3,
            "lessonType": "QUIZ"
          }
        ]
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440007",
        "title": "Section 2: Kỹ Năng Cơ Bản",
        "description": "Phát triển kỹ năng cơ bản",
        "orderIndex": 2,
        "lessonsCount": 2,
        "lessons": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440008",
            "title": "An Toàn Hàng Hải",
            "description": "Quy tắc an toàn trên tàu",
            "videoUrl": "https://example.com/videos/lesson-3.mp4",
            "durationMinutes": 60,
            "orderIndex": 1,
            "lessonType": "LECTURE"
          },
          {
            "id": "550e8400-e29b-41d4-a716-446655440010",
            "title": "Bài Tập: Tình Huống An Toàn",
            "description": "Áp dụng kiến thức vào thực tế",
            "videoUrl": null,
            "durationMinutes": 30,
            "orderIndex": 2,
            "lessonType": "ASSIGNMENT"
          }
        ]
      }
    ]
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

---

## 5️⃣ Lấy Chi Tiết Khóa Học

### Request
```http
GET /api/v1/courses/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:8089
Content-Type: application/json
```

### cURL (Public - không cần token)
```bash
curl --location --request GET 'http://localhost:8089/api/v1/courses/550e8400-e29b-41d4-a716-446655440000' \
--header 'Content-Type: application/json'
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Khóa Học Hàng Hải Cơ Bản",
    "description": "Khóa học này sẽ giúp bạn hiểu rõ về hàng hải",
    "objectives": "Học sinh sẽ nắm vững các kiến thức cơ bản về hàng hải và có khả năng áp dụng vào thực tế",
    "requirements": "Không yêu cầu kinh nghiệm trước đây",
    "teacher": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "fullName": "Nguyễn Văn A",
      "email": "teacher@example.com"
    },
    "imageUrl": "https://example.com/course-image.jpg",
    "status": "PUBLISHED",
    "level": "BEGINNER",
    "enrolledCount": 25,
    "sectionCount": 5,
    "lessonCount": 20,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-20T14:45:00Z"
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

---

## 🧪 Test Scenarios

### ✅ Successful Scenario - Học Sinh Xem Khóa Học Đã Đăng Ký

**Step 1:** Đăng nhập (lấy JWT token)
```bash
curl -X POST "http://localhost:8089/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

**Step 2:** Copy token từ response

**Step 3:** Lấy khóa học đã đăng ký
```bash
curl -X GET "http://localhost:8089/api/v1/courses/enrolled-courses?page=1&limit=10" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Step 4:** Chọn 1 khóa học và lấy content
```bash
curl -X GET "http://localhost:8089/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/content" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Step 5:** Lấy chi tiết 1 bài giảng
```bash
curl -X GET "http://localhost:8089/api/v1/courses/sections/lessons/550e8400-e29b-41d4-a716-446655440003" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

---

### ✅ Successful Scenario - Giáo Viên Xem Khóa Học Của Mình

**Step 1:** Đăng nhập với tài khoản giáo viên
```bash
curl -X POST "http://localhost:8089/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

**Step 2:** Copy token từ response

**Step 3:** Lấy khóa học của mình
```bash
curl -X GET "http://localhost:8089/api/v1/courses/my-courses?page=1&limit=10" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Step 4:** Lấy content của khóa học
```bash
curl -X GET "http://localhost:8089/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/content" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

---

## 📊 Common Status Codes & Meanings

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Request thành công |
| 201 | Created | Tạo mới thành công |
| 400 | Bad Request | Dữ liệu request không hợp lệ |
| 401 | Unauthorized | Token không hợp lệ hoặc hết hạn |
| 403 | Forbidden | Không có quyền truy cập (role không đúng) |
| 404 | Not Found | Resource không tồn tại |
| 500 | Internal Server Error | Lỗi server |

---

## 🔗 Tương Quan Giữa Các Entities

```
Course
  ├── Teacher (người tạo)
  ├── Sections (chương)
  │   └── Lessons (bài giảng)
  │       ├── LessonAttachments (tài liệu đính kèm)
  │       └── LessonAssignments (bài tập)
  └── EnrolledStudents (học sinh đã đăng ký)
```

---

**Cập nhật lần cuối:** 12/11/2025
