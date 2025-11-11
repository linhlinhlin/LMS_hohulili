# 🎯 Quick Start - Trang Học Khóa Học

> Để xây dựng trang học khóa học (student/learn/course/:courseId), bạn cần:

---

## 🔑 3 API Chính

### 1️⃣ Lấy Thông Tin Khóa Học
```http
GET /api/v1/courses/{courseId}
```
📍 **Dùng cho:** Hiển thị tiêu đề, tên giáo viên, mô tả

### 2️⃣ Lấy Toàn Bộ Nội Dung
```http
GET /api/v1/courses/{courseId}/content
```
📍 **Dùng cho:** Build sidebar navigation (Sections + Lessons)

### 3️⃣ Lấy Chi Tiết Bài Học
```http
GET /api/v1/courses/sections/lessons/{lessonId}
```
📍 **Dùng cho:** Render content (HTML, video, attachments, etc.)

---

## ⚡ Workflow Nhanh

### Step 1: Load Trang Ban Đầu
```javascript
const courseId = "578ef164-7c3d-426a-8b34-f93c120f3da5";

// Fetch song song
const [courseRes, contentRes] = await Promise.all([
  GET /api/v1/courses/{courseId},
  GET /api/v1/courses/{courseId}/content
]);

const course = courseRes.data.data;     // Title, teacher
const sections = contentRes.data.data;  // Navigation
```

### Step 2: Render Sidebar
```javascript
// Build navigation tree từ sections
sections.forEach(section => {
  console.log(section.title);
  section.lessons.forEach(lesson => {
    console.log(`  - ${lesson.title}`);
  });
});
```

### Step 3: Khi User Click Lesson
```javascript
const lessonId = "990e8400-e29b-41d4-a716-446655440020";

const lessonRes = await GET /api/v1/courses/sections/lessons/{lessonId};
const lesson = lessonRes.data.data;

// Render:
// - Title: lesson.title
// - Content (HTML): lesson.content
// - Video: lesson.videoUrl
// - Duration: lesson.durationMinutes
// - Attachments: lesson.attachments[] (với download URLs)
```

### Step 4: Check Lesson Type & Load Thêm
```javascript
if (lesson.lessonType === "QUIZ") {
  // Load quiz
  const quizRes = await GET /api/v1/quizzes/lessons/{lessonId};
  const quiz = quizRes.data.data;
  // Render quiz button
}

if (lesson.lessonType === "ASSIGNMENT") {
  // Load assignment
  const assignRes = await GET /api/v1/assignments/{assignmentId};
  const assignment = assignRes.data.data;
  // Render assignment button
}
```

---

## 📊 Cấu Trúc Dữ Liệu

### Lesson Full Structure:
```json
{
  "id": "UUID",
  "title": "Bài 1.1: Khái Niệm Tọa Độ",
  "description": "...",
  "content": "<h2>...</h2><p>...</p>",        // HTML content
  "videoUrl": "https://youtube.com/...",    // Video embed
  "durationMinutes": 15,
  "lessonType": "LECTURE|ASSIGNMENT|QUIZ",
  "attachments": [
    {
      "originalFileName": "Slide.pdf",
      "fileUrl": "/api/v1/files/slide.pdf",
      "fileSize": 2048576,
      "fileType": "PDF"
    }
  ],
  "sectionId": "UUID",
  "sectionTitle": "Chương 1: Kiến Thức Cơ Bản",
  "courseId": "UUID",
  "courseTitle": "Nguyên Lý Điều Hướng Tàu"
}
```

---

## 🎯 API Endpoints Reference

| Mục Đích | Endpoint | Method |
|----------|----------|--------|
| Thông tin khóa học | `/api/v1/courses/{courseId}` | GET |
| Nội dung (nav) | `/api/v1/courses/{courseId}/content` | GET |
| Chi tiết bài học | `/api/v1/courses/sections/lessons/{lessonId}` | GET |
| File đính kèm | `/api/v1/lessons/{lessonId}/attachments` | GET |
| Thông tin quiz | `/api/v1/quizzes/lessons/{lessonId}` | GET |
| Câu hỏi quiz | `/api/v1/quizzes/lessons/{lessonId}/questions` | GET |
| Bắt đầu quiz | `POST /api/v1/quizzes/{lessonId}/attempts` | POST |
| Nộp quiz | `POST /api/v1/quizzes/attempts/{attemptId}/submit` | POST |
| Lịch sử quiz | `/api/v1/quizzes/{lessonId}/attempts` | GET |
| Chi tiết assignment | `/api/v1/assignments/{assignmentId}` | GET |
| Danh sách assignment | `/api/v1/courses/{courseId}/assignments` | GET |
| Nộp assignment | `POST /api/v1/assignments/{assignmentId}/submissions` | POST |
| Xem bài nộp | `/api/v1/assignments/{assignmentId}/my-submission` | GET |

---

## 🔐 Header Required
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 💬 Common Responses

### Success (200/201)
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Success"
}
```

### Error (4xx/5xx)
```json
{
  "success": false,
  "error": "Thông báo lỗi",
  "message": "Error"
}
```

---

## 🎮 Quiz Flow Example

```javascript
// 1. Get quiz info
const quiz = await GET /api/v1/quizzes/lessons/{lessonId};

// 2. Get questions
const questions = await GET /api/v1/quizzes/lessons/{lessonId}/questions;

// 3. Start attempt
const attempt = await POST /api/v1/quizzes/{lessonId}/attempts;
const attemptId = attempt.data.data.id;

// 4. Submit answers
const result = await POST /api/v1/quizzes/attempts/{attemptId}/submit {
  answers: [
    { questionId: "...", selectedOptionId: "..." },
    ...
  ]
};

// 5. Show result
console.log(`Score: ${result.data.data.score}`);
console.log(`Passed: ${result.data.data.passed}`);

// 6. See history
const history = await GET /api/v1/quizzes/{lessonId}/attempts;
```

---

## 📝 Assignment Flow Example

```javascript
// 1. Get assignment details
const assignment = await GET /api/v1/assignments/{assignmentId};

// 2. Submit assignment
const submission = await POST /api/v1/assignments/{assignmentId}/submissions {
  submissionText: "Bài giải của tôi...",
  fileUrls: ["https://storage.com/file.pdf"]
};

// 3. Check submission status
const mySubmission = await GET /api/v1/assignments/{assignmentId}/my-submission;
console.log(`Status: ${mySubmission.data.data.status}`);
console.log(`Score: ${mySubmission.data.data.score}`);
console.log(`Feedback: ${mySubmission.data.data.feedback}`);
```

---

## 🚨 Thường Gặp Lỗi

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| 401 Unauthorized | Token hết hạn | Refresh token hoặc re-login |
| 403 Forbidden | Không đăng ký khóa học | Sinh viên phải đăng ký trước |
| 404 Not Found | ID không tồn tại | Kiểm tra courseId, lessonId |
| 400 Bad Request | Dữ liệu không hợp lệ | Validate request trước |

---

## 📚 Chi Tiết Đầy Đủ

👉 Xem file: **COURSE_LEARNING_PAGE_API.md**

---

**Dễ dàng hơn phải không? Bắt đầu code thôi! 🚀**
