# 📚 API Trang Học Khóa Học - Tài Liệu Chi Tiết

> Tài liệu này tổng hợp tất cả các API backend cho trang học khóa học (student/learn/course/:courseId) của hệ thống LMS Hàng Hải. Giúp team frontend hiểu rõ cách gọi API, dữ liệu trả về, và cách xây dựng giao diện.

**Ngày cập nhật:** 11/11/2025  
**Phiên bản:** 2.0 - Toàn Diện  
**Status:** ✅ Hoàn thành - Ready for Frontend

---

## 📋 Mục Lục

1. [Kiến Trúc Tổng Quan](#kiến-trúc-tổng-quan)
2. [Danh Sách Các Endpoints](#danh-sách-các-endpoints)
3. [Chi Tiết Từng API](#chi-tiết-từng-api)
4. [Data Structures (DTOs)](#data-structures-dtos)
5. [Luồng Dữ Liệu](#luồng-dữ-liệu)
6. [Ví Dụ Request/Response](#ví-dụ-requestresponse)
7. [Xử Lý Lỗi](#xử-lý-lỗi)
8. [Tối Ưu Hóa Frontend](#tối-ưu-hóa-frontend)

---

## 🏗️ Kiến Trúc Tổng Quan

### Trang Học Khóa Học Bao Gồm:

```
┌─────────────────────────────────────┐
│     Trang Học Khóa Học              │
│   (Student Learn Course Page)        │
└─────────────────────────────────────┘
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
┌────────┐ ┌──────────┐ ┌────────────┐
│ Khóa   │ │ Sections │ │ Bài Học    │
│ Học    │ │ & Lessons│ │ (Lesson)   │
└────────┘ └──────────┘ └────────────┘
    │           │            │
    │           │      ┌─────┼─────┐
    │           │      ▼     ▼     ▼
    │           │   ┌──────┬──────┬────────┐
    │           │   │Video │File  │Quiz &  │
    │           │   │      │Attach│Assignmt│
    │           │   └──────┴──────┴────────┘
    │           │
    └───────────┴─────────────────────────┐
                                          ▼
                          ┌───────────────────────┐
                          │ Navigation Sidebar    │
                          │ - Sections & Lessons  │
                          │ - Progress Tracking   │
                          └───────────────────────┘
```

---

## 📊 Danh Sách Các Endpoints

### Tier 1: Thông Tin Khóa Học Chính

| STT | Method | Endpoint | Mô Tả | Role |
|-----|--------|----------|-------|------|
| 1 | GET | `/api/v1/courses/{courseId}` | **Lấy thông tin chi tiết khóa học** | STUDENT |
| 2 | GET | `/api/v1/courses/{courseId}/content` | **Lấy toàn bộ sections + lessons** | STUDENT |

### Tier 2: Nội Dung Khóa Học (Sections & Lessons)

| STT | Method | Endpoint | Mô Tả | Role |
|-----|--------|----------|-------|------|
| 3 | GET | `/api/v1/courses/sections/lessons/{lessonId}` | Lấy chi tiết 1 bài học | STUDENT |
| 4 | GET | `/api/v1/lessons/{lessonId}/attachments` | Lấy file đính kèm bài học | STUDENT |

### Tier 3: Quiz & Assignment

| STT | Method | Endpoint | Mô Tả | Role |
|-----|--------|----------|-------|------|
| 5 | GET | `/api/v1/quizzes/lessons/{lessonId}` | Lấy thông tin quiz | STUDENT |
| 6 | GET | `/api/v1/quizzes/lessons/{lessonId}/questions` | Lấy câu hỏi quiz | STUDENT |
| 7 | POST | `/api/v1/quizzes/{lessonId}/attempts` | Bắt đầu làm quiz | STUDENT |
| 8 | POST | `/api/v1/quizzes/attempts/{attemptId}/submit` | Nộp bài quiz | STUDENT |
| 9 | GET | `/api/v1/quizzes/{lessonId}/attempts` | Lấy lịch sử attempts | STUDENT |
| 10 | GET | `/api/v1/assignments/{assignmentId}` | Lấy chi tiết assignment | STUDENT |
| 11 | POST | `/api/v1/assignments/{assignmentId}/submissions` | Nộp bài tập | STUDENT |
| 12 | GET | `/api/v1/assignments/{assignmentId}/my-submission` | Xem bài nộp của tôi | STUDENT |
| 13 | GET | `/api/v1/courses/{courseId}/assignments` | Lấy danh sách bài tập | STUDENT |

---

## 🔍 Chi Tiết Từng API

### **1️⃣ Lấy Thông Tin Chi Tiết Khóa Học**

```http
GET /api/v1/courses/{courseId}
Authorization: Bearer <JWT_TOKEN>
```

**Path Parameters:**
| Tham Số | Kiểu | Mô Tả |
|---------|------|-------|
| `courseId` | UUID | ID khóa học (VD: `578ef164-7c3d-426a-8b34-f93c120f3da5`) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "578ef164-7c3d-426a-8b34-f93c120f3da5",
    "code": "NAVI101",
    "title": "Nguyên Lý Điều Hướng Tàu",
    "description": "Khóa học cơ bản về lý thuyết điều hướng và định vị tàu biển",
    "status": "APPROVED",
    "teacherId": "770e8400-e29b-41d4-a716-446655440002",
    "teacherName": "TS. Nguyễn Văn A",
    "enrolledCount": 45,
    "sectionsCount": 8,
    "createdAt": "2025-01-15T08:30:00Z",
    "updatedAt": "2025-02-10T14:20:00Z"
  },
  "message": "Success"
}
```

**Dữ Liệu Trả Về:**
- ✅ `title` - Tên khóa học (hiển thị tiêu đề trang)
- ✅ `description` - Mô tả khóa học
- ✅ `teacherName` - Tên giáo viên (hiển thị thông tin giáo viên)
- ✅ `sectionsCount` - Số chương (dùng cho navigation)
- ✅ `enrolledCount` - Số sinh viên đã đăng ký

---

### **2️⃣ Lấy Toàn Bộ Nội Dung Khóa Học (Sections + Lessons)**

```http
GET /api/v1/courses/{courseId}/content
Authorization: Bearer <JWT_TOKEN>
```

**⭐ Đây là endpoint QUAN TRỌNG NHẤT - dùng để render sidebar navigation**

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440010",
      "title": "Chương 1: Kiến Thức Cơ Bản",
      "description": "Giới thiệu các khái niệm cơ bản",
      "orderIndex": 1,
      "lessons": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440020",
          "title": "Bài 1.1: Khái Niệm Tọa Độ",
          "description": "Hệ tọa độ địa lý",
          "orderIndex": 1
        },
        {
          "id": "990e8400-e29b-41d4-a716-446655440021",
          "title": "Bài 1.2: Đơn Vị Đo Lường",
          "description": "Các đơn vị đo khoảng cách",
          "orderIndex": 2
        }
      ]
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440011",
      "title": "Chương 2: Công Cụ Định Vị",
      "description": "Các công cụ định vị hiện đại",
      "orderIndex": 2,
      "lessons": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440030",
          "title": "Bài 2.1: GPS",
          "description": "Hệ thống định vị toàn cầu",
          "orderIndex": 1
        }
      ]
    }
  ],
  "message": "Success"
}
```

**Cách Sử Dụng:**
```javascript
// Tạo navigation tree
const sections = response.data;
sections.forEach(section => {
  console.log(`${section.title}`);
  section.lessons.forEach(lesson => {
    console.log(`  └─ ${lesson.title}`);
  });
});
```

---

### **3️⃣ Lấy Chi Tiết 1 Bài Học**

```http
GET /api/v1/courses/sections/lessons/{lessonId}
Authorization: Bearer <JWT_TOKEN>
```

**Path Parameters:**
| Tham Số | Kiểu | Mô Tả |
|---------|------|-------|
| `lessonId` | UUID | ID bài học |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440020",
    "title": "Bài 1.1: Khái Niệm Tọa Độ",
    "description": "Hệ tọa độ địa lý và hệ tọa độ tương đối",
    "content": "<h2>Khái Niệm Tọa Độ</h2><p>Tọa độ là...</p>",
    "videoUrl": "https://youtube.com/embed/abc123",
    "durationMinutes": 15,
    "orderIndex": 1,
    "lessonType": "LECTURE",
    "attachments": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440050",
        "fileName": "slide_lesson_1_1.pdf",
        "originalFileName": "Slide - Bài 1.1.pdf",
        "fileUrl": "/api/v1/files/slide_lesson_1_1.pdf",
        "fileSize": 2048576,
        "contentType": "application/pdf",
        "fileType": "PDF",
        "displayOrder": 1,
        "uploadedAt": "2025-01-20T10:30:00Z"
      }
    ],
    "sectionId": "880e8400-e29b-41d4-a716-446655440010",
    "sectionTitle": "Chương 1: Kiến Thức Cơ Bản",
    "courseId": "578ef164-7c3d-426a-8b34-f93c120f3da5",
    "courseTitle": "Nguyên Lý Điều Hướng Tàu",
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-02-01T14:20:00Z"
  },
  "message": "Success"
}
```

**Dữ Liệu Chính:**
- ✅ `content` - HTML nội dung bài học (render với HTML editor)
- ✅ `videoUrl` - URL video (embed YouTube hoặc video player)
- ✅ `durationMinutes` - Thời lượng bài học
- ✅ `attachments` - File đính kèm (PDF, Word, PPT, etc.)
- ✅ `lessonType` - Loại bài học (LECTURE, ASSIGNMENT, QUIZ)

---

### **4️⃣ Lấy File Đính Kèm Bài Học**

```http
GET /api/v1/lessons/{lessonId}/attachments
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440050",
      "fileName": "slide_lesson_1_1.pdf",
      "originalFileName": "Slide - Bài 1.1.pdf",
      "fileUrl": "/api/v1/files/slide_lesson_1_1.pdf",
      "fileSize": 2048576,
      "contentType": "application/pdf",
      "fileType": "PDF",
      "displayOrder": 1,
      "uploadedAt": "2025-01-20T10:30:00Z"
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440051",
      "fileName": "example_coordinates.xlsx",
      "originalFileName": "Ví dụ - Tọa độ.xlsx",
      "fileUrl": "/api/v1/files/example_coordinates.xlsx",
      "fileSize": 512000,
      "contentType": "application/vnd.ms-excel",
      "fileType": "EXCEL",
      "displayOrder": 2,
      "uploadedAt": "2025-01-20T10:35:00Z"
    }
  ],
  "message": "Success"
}
```

**Cách Sử Dụng:**
```javascript
// Render download links
attachments.forEach(file => {
  console.log(`📄 ${file.originalFileName}`);
  console.log(`   Size: ${(file.fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Type: ${file.fileType}`);
  console.log(`   URL: ${file.fileUrl}`);
});
```

---

### **5️⃣ Lấy Thông Tin Quiz**

```http
GET /api/v1/quizzes/lessons/{lessonId}
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440060",
    "title": "Quiz Chương 1",
    "description": "Kiểm tra kiến thức cơ bản",
    "timeLimitMinutes": 30,
    "maxAttempts": 3,
    "passingScore": 70,
    "shuffleQuestions": true,
    "shuffleOptions": true,
    "showResultsImmediately": true,
    "showCorrectAnswers": true,
    "startDate": "2025-01-15T00:00:00Z",
    "endDate": "2025-02-28T23:59:59Z",
    "questionCount": 10,
    "lessonId": "990e8400-e29b-41d4-a716-446655440020"
  },
  "message": "Success"
}
```

---

### **6️⃣ Lấy Danh Sách Câu Hỏi Quiz**

```http
GET /api/v1/quizzes/lessons/{lessonId}/questions
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440070",
      "questionText": "Tọa độ địa lý là gì?",
      "questionType": "MULTIPLE_CHOICE",
      "options": [
        {
          "id": "dd0e8400-e29b-41d4-a716-446655440080",
          "optionText": "Vĩ độ và kinh độ",
          "isCorrect": true,
          "displayOrder": 1
        },
        {
          "id": "dd0e8400-e29b-41d4-a716-446655440081",
          "optionText": "Độ cao trên biển",
          "isCorrect": false,
          "displayOrder": 2
        }
      ],
      "explanation": "Tọa độ địa lý dùng để xác định vị trí...",
      "displayOrder": 1
    }
  ],
  "message": "Success"
}
```

---

### **7️⃣ Bắt Đầu Làm Quiz**

```http
POST /api/v1/quizzes/{lessonId}/attempts
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```
(No body - empty POST)
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440090",
    "quizId": "bb0e8400-e29b-41d4-a716-446655440060",
    "studentId": "user-id",
    "startedAt": "2025-02-11T10:00:00Z",
    "endedAt": null,
    "status": "IN_PROGRESS",
    "score": null,
    "passed": null,
    "timeSpentSeconds": 0,
    "attemptNumber": 1
  },
  "message": "Success"
}
```

---

### **8️⃣ Nộp Bài Quiz**

```http
POST /api/v1/quizzes/attempts/{attemptId}/submit
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "answers": [
    {
      "questionId": "cc0e8400-e29b-41d4-a716-446655440070",
      "selectedOptionId": "dd0e8400-e29b-41d4-a716-446655440080"
    },
    {
      "questionId": "cc0e8400-e29b-41d4-a716-446655440071",
      "selectedOptionId": "dd0e8400-e29b-41d4-a716-446655440082"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "ee0e8400-e29b-41d4-a716-446655440090",
    "status": "SUBMITTED",
    "score": 85,
    "passed": true,
    "endedAt": "2025-02-11T10:30:00Z",
    "timeSpentSeconds": 1800
  },
  "message": "Success"
}
```

---

### **9️⃣ Lấy Lịch Sử Attempts**

```http
GET /api/v1/quizzes/{lessonId}/attempts
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440090",
      "attemptNumber": 1,
      "score": 85,
      "passed": true,
      "startedAt": "2025-02-11T10:00:00Z",
      "endedAt": "2025-02-11T10:30:00Z",
      "timeSpentSeconds": 1800,
      "status": "SUBMITTED"
    },
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440091",
      "attemptNumber": 2,
      "score": 90,
      "passed": true,
      "startedAt": "2025-02-12T14:00:00Z",
      "endedAt": "2025-02-12T14:25:00Z",
      "timeSpentSeconds": 1500,
      "status": "SUBMITTED"
    }
  ],
  "message": "Success"
}
```

---

### **🔟 Lấy Chi Tiết Assignment**

```http
GET /api/v1/assignments/{assignmentId}
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "ff0e8400-e29b-41d4-a716-446655440100",
    "title": "Bài Tập 1: Tính Toán Tọa Độ",
    "description": "Tính tọa độ của các điểm trên bản đồ",
    "instructions": "<h3>Hướng Dẫn</h3><ol><li>Tải file template...</li>...</ol>",
    "dueDate": "2025-02-20T23:59:59Z",
    "maxScore": 100,
    "assignmentType": "FILE_SUBMISSION",
    "status": "PUBLISHED",
    "courseId": "578ef164-7c3d-426a-8b34-f93c120f3da5"
  },
  "message": "Success"
}
```

---

### **1️⃣1️⃣ Nộp Bài Tập**

```http
POST /api/v1/assignments/{assignmentId}/submissions
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "submissionText": "Tôi đã hoàn thành bài tập này.",
  "fileUrls": ["https://storage.example.com/submission_1.pdf"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "gg0e8400-e29b-41d4-a716-446655440110",
    "assignmentId": "ff0e8400-e29b-41d4-a716-446655440100",
    "studentId": "user-id",
    "submissionText": "Tôi đã hoàn thành bài tập này.",
    "submittedAt": "2025-02-19T15:30:00Z",
    "score": null,
    "feedback": null,
    "status": "SUBMITTED"
  },
  "message": "Success"
}
```

---

### **1️⃣2️⃣ Xem Bài Nộp Của Tôi**

```http
GET /api/v1/assignments/{assignmentId}/my-submission
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "gg0e8400-e29b-41d4-a716-446655440110",
    "assignmentId": "ff0e8400-e29b-41d4-a716-446655440100",
    "submittedAt": "2025-02-19T15:30:00Z",
    "score": 95,
    "feedback": "Tuyệt vời! Bạn đã làm rất tốt.",
    "status": "GRADED",
    "gradedAt": "2025-02-20T10:00:00Z"
  },
  "message": "Success"
}
```

---

### **1️⃣3️⃣ Lấy Danh Sách Bài Tập Của Khóa Học**

```http
GET /api/v1/courses/{courseId}/assignments?page=1&limit=10
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "ff0e8400-e29b-41d4-a716-446655440100",
        "title": "Bài Tập 1: Tính Toán Tọa Độ",
        "description": "Tính tọa độ của các điểm trên bản đồ",
        "dueDate": "2025-02-20T23:59:59Z",
        "maxScore": 100,
        "status": "PUBLISHED"
      }
    ],
    "totalElements": 5,
    "totalPages": 1
  },
  "message": "Success"
}
```

---

## 📦 Data Structures (DTOs)

### **CourseDetail**
```json
{
  "id": "UUID",
  "code": "String (course code)",
  "title": "String",
  "description": "String",
  "status": "APPROVED | DRAFT | ARCHIVED",
  "teacherId": "UUID",
  "teacherName": "String",
  "enrolledCount": "Integer",
  "sectionsCount": "Integer",
  "createdAt": "ISO 8601 DateTime",
  "updatedAt": "ISO 8601 DateTime"
}
```

### **SectionWithLessons**
```json
{
  "id": "UUID",
  "title": "String",
  "description": "String",
  "orderIndex": "Integer",
  "lessons": [
    {
      "id": "UUID",
      "title": "String",
      "description": "String",
      "orderIndex": "Integer"
    }
  ]
}
```

### **LessonDetail**
```json
{
  "id": "UUID",
  "title": "String",
  "description": "String",
  "content": "HTML String (nội dung HTML)",
  "videoUrl": "String (URL video)",
  "durationMinutes": "Integer",
  "orderIndex": "Integer",
  "lessonType": "LECTURE | ASSIGNMENT | QUIZ",
  "attachments": [ /* AttachmentDetail[] */ ],
  "sectionId": "UUID",
  "sectionTitle": "String",
  "courseId": "UUID",
  "courseTitle": "String",
  "createdAt": "ISO 8601 DateTime",
  "updatedAt": "ISO 8601 DateTime"
}
```

### **AttachmentDetail**
```json
{
  "id": "UUID",
  "fileName": "String (file name on server)",
  "originalFileName": "String (name uploaded by user)",
  "fileUrl": "String (/api/v1/files/...)",
  "fileSize": "Long (bytes)",
  "contentType": "String (MIME type)",
  "fileType": "PDF | WORD | EXCEL | PPT | VIDEO | AUDIO | ZIP | OTHER",
  "displayOrder": "Integer",
  "uploadedAt": "ISO 8601 DateTime"
}
```

---

## 🔄 Luồng Dữ Liệu

### Luồng Load Trang Học Khóa Học:

```
┌─────────────────────────────────────────────┐
│ 1. User vào trang: /student/learn/course/ID │
└──────────────┬────────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Extract ID từ│
        │ URL params   │
        └──────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Fetch 2 API song song│
    └──────┬──────────┬────┘
           │          │
        ┌──▼──┐    ┌──▼──────────────┐
        │ 1.  │    │ 2.              │
        │ GET │    │ GET             │
        │/api/│    │/api/v1/courses/ │
        │v1/ │    │{id}/content     │
        │courses│    └─────────────┬─┘
        │/{id}│                   │
        └──┬──┘                   │
           │                      │
           ▼                      ▼
    ┌────────────┐      ┌──────────────────┐
    │Course Info │      │Sections & Lessons│
    │- Title     │      │- Navigation tree │
    │- Teacher   │      │- lesson list     │
    │- Sections  │      └──────────────────┘
    └────────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
           ┌─────────────────────┐
           │ Render UI:          │
           │ - Header (title)    │
           │ - Sidebar (nav)     │
           │ - Main content area │
           └─────────────────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ User clicks on lesson    │
        │ (lessonId)              │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌────────────────────────────┐
        │ Fetch Lesson Details       │
        │ GET /api/v1/courses/...    │
        └──────────┬─────────────────┘
                   │
        ┌──────────┴─────────────┐
        ▼                         ▼
    ┌─────────┐           ┌──────────────┐
    │ Content │           │ Attachments  │
    │ Video   │           │ Download URLs│
    │ HTML    │           └──────────────┘
    └─────────┘
        │
        ▼
    ┌──────────────────┐
    │ Check Lesson Type│
    └────┬──────┬──┬───┘
         │      │  │
    ┌────▼──┐ ┌─▼─┴──┐ ┌──────────┐
    │ QUIZ  │ │ASSIGN│ │ LECTURE  │
    │ Get Q │ │ Get D│ │ Display  │
    │ & Opt │ │ ue D │ │ Content  │
    └───────┘ └──────┘ └──────────┘
```

---

## 💡 Ví Dụ Request/Response

### Frontend - Load Trang Học

**TypeScript/React Example:**

```typescript
import axios from 'axios';

interface CourseData {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  sectionsCount: number;
}

interface LessonStructure {
  sections: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
    }[];
  }[];
}

const token = localStorage.getItem('token');
const courseId = '578ef164-7c3d-426a-8b34-f93c120f3da5';

// 1. Lấy thông tin khóa học
const courseResponse = await axios.get(
  `http://localhost:8088/api/v1/courses/${courseId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const course: CourseData = courseResponse.data.data;
console.log(`Khóa học: ${course.title}`);
console.log(`Giáo viên: ${course.teacherName}`);

// 2. Lấy nội dung (sections + lessons)
const contentResponse = await axios.get(
  `http://localhost:8088/api/v1/courses/${courseId}/content`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const sections = contentResponse.data.data;

// 3. Build navigation tree
console.log('📚 Navigation:');
sections.forEach(section => {
  console.log(`${section.title}`);
  section.lessons.forEach(lesson => {
    console.log(`  └─ ${lesson.title} (${lesson.id})`);
  });
});

// 4. Khi user click vào lesson
const lessonId = sections[0].lessons[0].id;
const lessonResponse = await axios.get(
  `http://localhost:8088/api/v1/courses/sections/lessons/${lessonId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const lesson = lessonResponse.data.data;

// 5. Render lesson content
console.log(`📝 Title: ${lesson.title}`);
console.log(`⏱️  Duration: ${lesson.durationMinutes} min`);
console.log(`🎥 Video: ${lesson.videoUrl}`);
console.log(`📄 Content: ${lesson.content}`);

// 6. Render attachments
console.log('📎 Attachments:');
lesson.attachments.forEach(file => {
  console.log(`  - ${file.originalFileName} (${file.fileSize} bytes)`);
  console.log(`    Download: ${file.fileUrl}`);
});

// 7. Check if quiz exists
if (lesson.lessonType === 'QUIZ') {
  const quizResponse = await axios.get(
    `http://localhost:8088/api/v1/quizzes/lessons/${lessonId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const quiz = quizResponse.data.data;
  console.log(`📋 Quiz: ${quiz.title}`);
  console.log(`   Time limit: ${quiz.timeLimitMinutes} min`);
  console.log(`   Max attempts: ${quiz.maxAttempts}`);
}
```

---

## ⚠️ Xử Lý Lỗi

### HTTP Status Codes:

| Status | Nghĩa | Ghi Chú |
|--------|-------|---------|
| 200 | OK | Request thành công |
| 201 | Created | Tạo resource thành công |
| 400 | Bad Request | Dữ liệu không hợp lệ |
| 401 | Unauthorized | Không có token hoặc hết hạn |
| 403 | Forbidden | Không có quyền truy cập |
| 404 | Not Found | Resource không tồn tại |
| 500 | Server Error | Lỗi server |

### Error Response Format:

```json
{
  "success": false,
  "error": "Lỗi cụ thể (tiếng Việt)",
  "message": "Error"
}
```

### Ví Dụ Xử Lý Error:

```typescript
try {
  const response = await axios.get(
    `http://localhost:8088/api/v1/courses/${courseId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = response.data;
} catch (error: any) {
  if (error.response?.status === 401) {
    console.error('Token hết hạn - redirect to login');
    window.location.href = '/login';
  } else if (error.response?.status === 403) {
    console.error('Bạn không có quyền truy cập khóa học này');
  } else if (error.response?.status === 404) {
    console.error('Khóa học không tồn tại');
  } else {
    console.error('Lỗi:', error.response?.data?.error);
  }
}
```

---

## 🚀 Tối Ưu Hóa Frontend

### ✅ Best Practices:

1. **Caching Strategy**
   ```typescript
   // Cache course content để tránh request liên tục
   const courseCache = new Map();
   
   const getCourseContent = async (courseId: string) => {
     if (courseCache.has(courseId)) {
       return courseCache.get(courseId);
     }
     const response = await fetchContent(courseId);
     courseCache.set(courseId, response);
     return response;
   };
   ```

2. **Parallel Requests**
   ```typescript
   // Fetch course info + content cùng lúc
   const [course, content] = await Promise.all([
     axios.get(`/api/v1/courses/${courseId}`),
     axios.get(`/api/v1/courses/${courseId}/content`)
   ]);
   ```

3. **Lazy Loading Attachments**
   ```typescript
   // Load file attachments khi needed, không load từ đầu
   const loadAttachments = async (lessonId: string) => {
     return axios.get(`/api/v1/lessons/${lessonId}/attachments`);
   };
   ```

4. **Error Handling**
   ```typescript
   // Luôn handle errors với user feedback
   if (!response.data.success) {
     showErrorMessage(response.data.error);
   }
   ```

5. **Progress Tracking**
   ```typescript
   // Theo dõi lesson được click
   const trackLessonView = (lessonId: string) => {
     // Save to localStorage or backend
     const viewed = JSON.parse(localStorage.getItem('viewed_lessons') || '[]');
     if (!viewed.includes(lessonId)) {
       viewed.push(lessonId);
       localStorage.setItem('viewed_lessons', JSON.stringify(viewed));
     }
   };
   ```

---

## 🔐 Bảo Mật

### Headers Cần Thiết:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Token Management:
```typescript
// Lưu token khi login
const token = loginResponse.data.token;
localStorage.setItem('token', token);

// Gửi token với mỗi request
const api = axios.create({
  baseURL: 'http://localhost:8088',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// Refresh token khi hết hạn
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Call refresh token endpoint
      const newToken = await refreshToken();
      localStorage.setItem('token', newToken);
      // Retry request
    }
    throw error;
  }
);
```

---

## 📋 Checklist Thiếu Sót / Cần Cải Thiện

> Sau khi phân tích API, dưới đây là những tính năng có thể cần bổ sung:

### ✅ Hoàn Thiện:
- [x] Lấy thông tin khóa học
- [x] Lấy sections + lessons
- [x] Lấy chi tiết bài học
- [x] Lấy attachments
- [x] Quiz functionality
- [x] Assignment submission
- [x] File download

### ⚠️ Có Thể Cần Thêm:
- [ ] **Progress Tracking** - API để lưu progress học viên (% hoàn thành bài học)
- [ ] **Comments/Discussion** - API để sinh viên bình luận trên bài học
- [ ] **Lesson Rating** - API để sinh viên đánh giá bài học
- [ ] **Video Progress** - API để lưu vị trí xem video (timeline)
- [ ] **Lesson Completion** - API để mark lesson as completed
- [ ] **Certificate** - API để sinh viên download certificate
- [ ] **Search** - API để tìm kiếm trong nội dung khóa học
- [ ] **Bookmark/Favorite** - API để bookmark bài học yêu thích

---

## 📞 Liên Hệ Backend

Nếu team frontend phát hiện:
- API không trả về field cần thiết
- Logic validation không phù hợp
- Performance issue
- Missing endpoints

**Vui lòng tạo issue hoặc liên hệ backend ngay để cải thiện!**

---

**Cập nhật lần cuối:** 11/11/2025  
**Trạng thái:** ✅ Ready for Frontend Development  
**Version:** 2.0 - Complete
