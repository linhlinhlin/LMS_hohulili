# API Tài Liệu Khóa Học & Bài Giảng - LMS Hàng Hải

> Hướng dẫn chi tiết các API để **học sinh lấy khóa học đã đăng ký** và **giáo viên lấy bài giảng mình đã tạo**

---

## 📋 Mục Lục
1. [API Học Sinh - Lấy Khóa Học Đã Đăng Ký](#api-học-sinh---lấy-khóa-học-đã-đăng-ký)
2. [API Giáo Viên - Lấy Khóa Học Của Mình](#api-giáo-viên---lấy-khóa-học-của-mình)
3. [API Giáo Viên - Lấy Bài Giảng](#api-giáo-viên---lấy-bài-giảng)
4. [API Chung - Lấy Chi Tiết Khóa Học & Bài Giảng](#api-chung---lấy-chi-tiết-khóa-học--bài-giảng)

---

## 🎓 API Học Sinh - Lấy Khóa Học Đã Đăng Ký

### Endpoint
```
GET /api/v1/courses/enrolled-courses
```

### Mô Tả
Học sinh lấy **tất cả khóa học đã đăng ký** của mình (chỉ `STUDENT` role)

### Authorization
```
Bearer Token (JWT)
```

### Query Parameters
| Parameter | Type | Required | Default | Mô Tả |
|-----------|------|----------|---------|-------|
| `page` | `int` | ❌ | 1 | Số trang (bắt đầu từ 1) |
| `limit` | `int` | ❌ | 10 | Số lượng item trên mỗi trang |

### Request Example
```bash
curl -X GET "http://localhost:8089/api/v1/courses/enrolled-courses?page=1&limit=10" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"
```

### Response Success (200 OK)
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
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "title": "Kỹ Năng Điều Hành Tàu",
        "description": "Phát triển kỹ năng điều hành tàu hiệu quả",
        "teacher": {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "fullName": "Trần Thị B",
          "email": "teacher2@example.com"
        },
        "imageUrl": "https://example.com/ship-control.jpg",
        "enrolledCount": 18,
        "sectionCount": 4,
        "lessonCount": 16,
        "enrolled": true,
        "createdAt": "2025-01-10T08:00:00Z",
        "updatedAt": "2025-01-22T16:20:00Z"
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
    "totalElements": 2,
    "last": true,
    "numberOfElements": 2,
    "first": true,
    "size": 10,
    "number": 0,
    "empty": false
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

### Response Error (403 Forbidden - Không phải sinh viên)
```json
{
  "success": false,
  "message": "Access Denied",
  "timestamp": "2025-11-12T10:30:00Z"
}
```

### CourseSummary DTO
```java
{
  "id": "UUID",              // ID khóa học
  "title": "String",         // Tên khóa học
  "description": "String",   // Mô tả khóa học
  "teacher": {
    "id": "UUID",            // ID giáo viên
    "fullName": "String",    // Tên giáo viên
    "email": "String"        // Email giáo viên
  },
  "imageUrl": "String",      // URL ảnh khóa học
  "enrolledCount": "int",    // Số học sinh đã đăng ký
  "sectionCount": "int",     // Số section
  "lessonCount": "int",      // Số bài giảng
  "enrolled": "boolean",     // Học sinh đã đăng ký?
  "createdAt": "Instant",    // Ngày tạo
  "updatedAt": "Instant"     // Ngày cập nhật
}
```

---

## 👨‍🏫 API Giáo Viên - Lấy Khóa Học Của Mình

### Endpoint
```
GET /api/v1/courses/my-courses
```

### Mô Tả
Giáo viên lấy **tất cả khóa học mà mình đã tạo** (chỉ `TEACHER` hoặc `ADMIN` role)

### Authorization
```
Bearer Token (JWT)
```

### Query Parameters
| Parameter | Type | Required | Default | Mô Tả |
|-----------|------|----------|---------|-------|
| `page` | `int` | ❌ | 1 | Số trang (bắt đầu từ 1) |
| `limit` | `int` | ❌ | 10 | Số lượng item trên mỗi trang |

### Request Example
```bash
curl -X GET "http://localhost:8089/api/v1/courses/my-courses?page=1&limit=10" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"
```

### Response Success (200 OK)
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
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10
    },
    "totalPages": 1,
    "totalElements": 1
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

---

## 📖 API Giáo Viên - Lấy Bài Giảng

### 1️⃣ Lấy Chi Tiết Bài Giảng (Theo ID)

#### Endpoint
```
GET /api/v1/courses/sections/lessons/{lessonId}
```

#### Mô Tả
Lấy **chi tiết 1 bài giảng** bao gồm attachments, video URL, HTML content

#### Authorization
```
Bearer Token (JWT)
```

#### Path Parameters
| Parameter | Type | Required | Mô Tả |
|-----------|------|----------|-------|
| `lessonId` | `UUID` | ✅ | ID của bài giảng |

#### Request Example
```bash
curl -X GET "http://localhost:8089/api/v1/courses/sections/lessons/550e8400-e29b-41d4-a716-446655440003" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"
```

#### Response Success (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "title": "Giới Thiệu Hàng Hải",
    "description": "Bài giảng cơ bản về hàng hải",
    "content": "<p>Nội dung HTML của bài giảng...</p>",
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
        "fileUrl": "https://example.com/files/slide-1.pdf",
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
        "fileUrl": "https://example.com/files/document.docx",
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

#### LessonDetail DTO
```java
{
  "id": "UUID",                    // ID bài giảng
  "title": "String",               // Tiêu đề bài giảng
  "description": "String",         // Mô tả bài giảng
  "content": "String (HTML)",      // Nội dung HTML
  "videoUrl": "String",            // URL video
  "durationMinutes": "int",        // Thời lượng (phút)
  "orderIndex": "int",             // Vị trí trong section
  "lessonType": "String",          // Loại bài giảng (LECTURE, QUIZ, etc)
  "sectionId": "UUID",             // ID section chứa bài giảng
  "sectionTitle": "String",        // Tên section
  "courseId": "UUID",              // ID khóa học
  "courseTitle": "String",         // Tên khóa học
  "attachments": [                 // Danh sách tài liệu đính kèm
    {
      "id": "UUID",
      "fileName": "String",
      "fileUrl": "String",
      "fileSize": "long",
      "fileType": "String",
      "displayOrder": "int",
      "uploadedAt": "Instant"
    }
  ],
  "createdAt": "Instant",          // Ngày tạo
  "updatedAt": "Instant"           // Ngày cập nhật
}
```

### 2️⃣ Lấy Tất Cả Bài Giảng Trong Section

#### Endpoint
```
GET /api/v1/courses/{courseId}/content
```

#### Mô Tả
Lấy **tất cả sections và bài giảng** trong khóa học theo **cấu trúc phân cấp**

#### Authorization
```
Bearer Token (Optional - cho công khai)
```

#### Path Parameters
| Parameter | Type | Required | Mô Tả |
|-----------|------|----------|-------|
| `courseId` | `UUID` | ✅ | ID khóa học |

#### Request Example
```bash
curl -X GET "http://localhost:8089/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/content" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"
```

#### Response Success (200 OK)
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
        "description": "Giới thiệu cơ bản",
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
            "description": "Quy tắc an toàn",
            "videoUrl": "https://example.com/videos/lesson-3.mp4",
            "durationMinutes": 60,
            "orderIndex": 1,
            "lessonType": "LECTURE"
          }
        ]
      }
    ]
  },
  "timestamp": "2025-11-12T10:30:00Z"
}
```

---

## 🔍 API Chung - Lấy Chi Tiết Khóa Học & Bài Giảng

### 1️⃣ Lấy Chi Tiết Khóa Học

#### Endpoint
```
GET /api/v1/courses/{courseId}
```

#### Mô Tả
Lấy **thông tin chi tiết của 1 khóa học**

#### Authorization
```
Bearer Token (Optional)
```

#### Path Parameters
| Parameter | Type | Required | Mô Tả |
|-----------|------|----------|-------|
| `courseId` | `UUID` | ✅ | ID khóa học |

#### Request Example
```bash
curl -X GET "http://localhost:8089/api/v1/courses/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json"
```

#### Response Success (200 OK)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Khóa Học Hàng Hải Cơ Bản",
    "description": "Học các kiến thức cơ bản về hàng hải",
    "objectives": "Giúp học sinh hiểu về...",
    "requirements": "Không cần kinh nghiệm trước",
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

## 🛠️ Loại Tài Liệu Được Hỗ Trợ (File Attachments)

| Loại | Phần Mở Rộng | Content Type |
|------|-------------|--------------|
| **Tài Liệu Word** | `.doc`, `.docx` | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| **PDF** | `.pdf` | `application/pdf` |
| **PowerPoint** | `.ppt`, `.pptx` | `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| **Excel** | `.xls`, `.xlsx` | `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| **Video** | `.mp4` | `video/mp4` |
| **Audio** | `.mp3`, `.wav` | `audio/mpeg`, `audio/wav` |
| **Nén** | `.zip`, `.rar` | `application/zip`, `application/x-rar-compressed` |

---

## 📝 Mã Lỗi Thường Gặp

| Mã | Lỗi | Mô Tả |
|----|-----|-------|
| **200** | OK | Thành công |
| **201** | Created | Tạo thành công |
| **400** | Bad Request | Dữ liệu không hợp lệ |
| **403** | Forbidden | Không có quyền truy cập (role không phù hợp) |
| **404** | Not Found | Không tìm thấy tài nguyên |
| **500** | Internal Server Error | Lỗi server |

---

## 🔐 Authentication

Tất cả API (ngoại trừ một số công khai) yêu cầu **JWT Bearer Token** trong header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 💡 Use Cases (Ví Dụ Sử Dụng)

### 📚 Học Sinh Xem Danh Sách Khóa Học Đã Đăng Ký
```javascript
// Frontend - React/Vue example
const fetchEnrolledCourses = async (page = 1, limit = 10) => {
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/enrolled-courses?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
};
```

### 👨‍🏫 Giáo Viên Lấy Khóa Học Của Mình
```javascript
const fetchMyCourses = async (page = 1, limit = 10) => {
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/my-courses?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
};
```

### 📖 Lấy Bài Giảng Chi Tiết
```javascript
const fetchLessonDetail = async (lessonId) => {
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/sections/lessons/${lessonId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
};
```

### 📋 Lấy Cấu Trúc Khóa Học (Sections + Lessons)
```javascript
const fetchCourseContent = async (courseId) => {
  const response = await fetch(
    `http://localhost:8089/api/v1/courses/${courseId}/content`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
};
```

---

## 📞 Hỗ Trợ

Nếu bạn gặp vấn đề, vui lòng:
1. Kiểm tra JWT token có hợp lệ không
2. Kiểm tra role của user (STUDENT, TEACHER, ADMIN)
3. Kiểm tra ID của resource (courseId, lessonId) có tồn tại không
4. Kiểm tra server logs để xem chi tiết lỗi

---

**Cập nhật lần cuối:** 12/11/2025  
**Backend Version:** Spring Boot 3.5.6  
**API Version:** v1
