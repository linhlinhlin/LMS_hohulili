# Enrollment Management APIs - Detailed Documentation

## Base Information
- **Base URL**: `http://localhost:8088/api/v1`
- **Authentication**: JWT Bearer Token (Required)
- **Content-Type**: `application/json`

---

## 1. POST Enroll Student (Teacher/Admin)

### Endpoint
```
POST /api/v1/courses/{courseId}/enrollments
```

### Description
Giảng viên hoặc admin gán một học viên vào khóa học bằng email

### Role Required
- TEACHER (chỉ cho khóa học của mình)
- ADMIN (cho tất cả khóa học)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học |

### Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "email": "student@example.com"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| email | string | Yes | NotBlank, valid email | Email của học viên |

### Example Request
```bash
curl -X POST "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/enrollments" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com"
  }'
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": "Đã gán học viên vào khóa học",
  "message": "Đã gán học viên vào khóa học"
}
```

### Response Error (404 Not Found - Student)
```json
{
  "success": false,
  "data": null,
  "message": "Không tìm thấy học viên với email: student@example.com"
}
```

### Response Error (404 Not Found - Course)
```json
{
  "success": false,
  "data": null,
  "message": "Không tìm thấy khóa học"
}
```

### Response Error (403 Forbidden)
```json
{
  "success": false,
  "data": null,
  "message": "Bạn không có quyền gán học viên vào khóa học này"
}
```

### Response Error (400 Bad Request - Already Enrolled)
```json
{
  "success": false,
  "data": null,
  "message": "Học viên đã đăng ký khóa học này"
}
```

### Business Rules
- Only students (role = STUDENT) can be enrolled
- Teacher can only enroll students to their own courses
- Admin can enroll students to any course
- Cannot enroll if already enrolled
- Student must exist in system

### File Location
`api/src/main/java/com/example/lms/controller/CourseController.java:enrollStudentByTeacher()`

---

## 2. POST Bulk Enroll (Excel Upload)

### Endpoint
```
POST /api/v1/courses/{courseId}/bulk-enroll
```

### Description
Giảng viên hoặc admin gán nhiều học viên vào khóa học thông qua file Excel

### Role Required
- TEACHER (chỉ cho khóa học của mình)
- ADMIN (cho tất cả khóa học)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học |

### Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

### Request Body (Form Data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | Excel file (.xlsx, .xls) |

### Excel File Format
File Excel phải có cột "email" hoặc "Email" chứa danh sách email học viên:

```
| Email                    |
|--------------------------|
| student1@example.com     |
| student2@example.com     |
| student3@example.com     |
```

### Example Request
```bash
curl -X POST "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/bulk-enroll" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "file=@students.xlsx"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "totalProcessed": 50,
    "successCount": 45,
    "errorCount": 5,
    "successEmails": [
      "student1@example.com",
      "student2@example.com"
    ],
    "errors": [
      {
        "email": "invalid@example.com",
        "reason": "Không tìm thấy học viên với email này"
      },
      {
        "email": "duplicate@example.com",
        "reason": "Học viên đã đăng ký khóa học này"
      }
    ]
  },
  "message": "Đã xử lý 50 email: 45 thành công, 5 lỗi"
}
```

### Response Error (400 Bad Request - Empty File)
```json
{
  "success": false,
  "data": null,
  "message": "Không tìm thấy email nào trong file Excel"
}
```

### Response Error (400 Bad Request - Invalid File)
```json
{
  "success": false,
  "data": null,
  "message": "File không đúng định dạng Excel"
}
```

### Supported File Formats
- .xlsx (Excel 2007+)
- .xls (Excel 97-2003)

### Business Rules
- File size limit: 100MB
- Processes all emails in file
- Skips invalid emails
- Skips already enrolled students
- Returns detailed success/error report

### File Location
`api/src/main/java/com/example/lms/controller/CourseController.java:bulkEnrollStudents()`

---

## 3. GET Enrolled Students

### Endpoint
```
GET /api/v1/courses/{courseId}/students
```

### Description
Lấy danh sách học viên đã đăng ký khóa học

### Role Required
- TEACHER (chỉ cho khóa học của mình)
- ADMIN (cho tất cả khóa học)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/students" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "fullName": "John Student",
      "email": "john.student@example.com",
      "enrolledAt": "2024-02-15T10:30:00Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "fullName": "Jane Learner",
      "email": "jane.learner@example.com",
      "enrolledAt": "2024-02-20T14:45:00Z"
    }
  ],
  "message": null
}
```

### Response Error (403 Forbidden)
```json
{
  "success": false,
  "data": null,
  "message": "Bạn không có quyền xem danh sách học viên của khóa học này"
}
```

### Response Error (404 Not Found)
```json
{
  "success": false,
  "data": null,
  "message": "Không tìm thấy khóa học"
}
```

### File Location
`api/src/main/java/com/example/lms/controller/CourseController.java:getEnrolledStudents()`

---

## 4. GET Available Students (Not Enrolled)

### Endpoint
```
GET /api/v1/courses/{courseId}/available-students
```

### Description
Lấy danh sách học viên chưa đăng ký khóa học (dùng cho dropdown enrollment)

### Role Required
- TEACHER (chỉ cho khóa học của mình)
- ADMIN (cho tất cả khóa học)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 0 | Số trang (bắt đầu từ 0) |
| size | integer | No | 50 | Số item trên mỗi trang |
| search | string | No | null | Tìm kiếm theo tên hoặc email |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/available-students?page=0&size=50&search=john" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "fullName": "John New Student",
        "email": "john.new@example.com"
      },
      {
        "id": "990e8400-e29b-41d4-a716-446655440004",
        "fullName": "Johnny Learner",
        "email": "johnny@example.com"
      }
    ],
    "totalElements": 120,
    "totalPages": 3,
    "size": 50,
    "number": 0
  },
  "message": null
}
```

### Use Cases
- Populate student dropdown in enrollment form
- Search for students to enroll
- Show available students count

### Business Rules
- Only returns students with role = STUDENT
- Only returns enabled users (enabled = true)
- Excludes already enrolled students
- Supports search by name or email

### File Location
`api/src/main/java/com/example/lms/controller/CourseController.java:getAvailableStudents()`

---

## 5. POST Student Self-Enroll

### Endpoint
```
POST /api/v1/courses/{courseId}/enroll
```

### Description
Học viên tự đăng ký vào khóa học công khai

### Role Required
- STUDENT

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Request Body
Không cần body

### Example Request
```bash
curl -X POST "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/enroll" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "message": "Đăng ký thành công!"
}
```

### Response Error (400 Bad Request - Already Enrolled)
```json
{
  "message": "Bạn đã đăng ký khóa học này rồi"
}
```

### Response Error (400 Bad Request - Not Approved)
```json
{
  "message": "Khóa học chưa được duyệt"
}
```

### Response Error (404 Not Found)
```json
{
  "message": "Không tìm thấy khóa học"
}
```

### Business Rules
- Only APPROVED courses can be enrolled
- Student cannot enroll twice
- Enrollment is immediate (no approval needed)

### File Location
`api/src/main/java/com/example/lms/controller/CourseController.java:enrollCourse()`

---

## 6. GET Student's Enrolled Courses

### Endpoint
```
GET /api/v1/courses/enrolled-courses
```

### Description
Học viên lấy danh sách khóa học đã đăng ký

### Role Required
- STUDENT

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Số trang (bắt đầu từ 1) |
| limit | integer | No | 10 | Số item trên mỗi trang |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/courses/enrolled-courses?page=1&limit=10" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "code": "CS101",
        "title": "Introduction to Computer Science",
        "description": "Learn the fundamentals...",
        "status": "APPROVED",
        "teacherName": "John Doe",
        "enrolledCount": 45,
        "createdAt": "2024-01-15T10:30:00Z",
        "enrolled": true
      }
    ],
    "totalElements": 5,
    "totalPages": 1,
    "size": 10,
    "number": 0
  },
  "message": null
}
```

### File Location
`api/src/main/java/com/example/lms/controller/CourseController.java:getEnrolledCourses()`

---

## Database Schema Reference

### course_enrollments Table
```sql
CREATE TABLE course_enrollments (
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    PRIMARY KEY (student_id, course_id)
);
```

### Notes
- Many-to-many relationship
- No enrollment date stored (use user.createdAt as fallback)
- No progress tracking in this table
- Cascade delete when user or course is deleted

---

## Missing/Recommended Enrollment APIs

### 1. DELETE Unenroll Student
```
DELETE /api/v1/admin/courses/{courseId}/enrollments/{studentId}
```
**Purpose**: Admin xóa enrollment của một học viên

### 2. POST Bulk Unenroll
```
POST /api/v1/admin/courses/{courseId}/bulk-unenroll
Body: { "studentIds": ["uuid1", "uuid2"] }
```
**Purpose**: Xóa nhiều enrollment cùng lúc

### 3. GET Enrollment Details
```
GET /api/v1/admin/courses/{courseId}/enrollments
Response: Include enrollment date, last accessed, progress
```
**Purpose**: Chi tiết enrollment với metadata

### 4. GET User's All Enrollments (Admin)
```
GET /api/v1/admin/users/{userId}/enrollments
```
**Purpose**: Xem tất cả khóa học mà user đã đăng ký

---

**Generated**: 2025-12-01  
**Backend Version**: v1.0.0
