# API Endpoints Quick Reference

## Base URL
```
http://localhost:8088/api/v1
```

## Authentication Header
```http
Authorization: Bearer <jwt_token>
```

---

## 🔐 Authentication APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Đăng nhập, nhận JWT token |
| POST | `/auth/register` | Public | Đăng ký tài khoản mới |
| POST | `/auth/refresh` | Public | Làm mới access token |
| GET | `/auth/me` | All | Lấy thông tin user hiện tại |
| PUT | `/auth/profile` | All | Cập nhật thông tin cá nhân |
| PUT | `/auth/password` | All | Thay đổi mật khẩu |

---

## 📚 Course Management APIs

### Public/Student APIs
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/courses` | Public | Danh sách khóa học công khai (APPROVED) |
| GET | `/courses/{id}` | Public | Chi tiết khóa học |
| POST | `/courses/{id}/enroll` | STUDENT | Học viên đăng ký khóa học |
| GET | `/courses/enrolled-courses` | STUDENT | Khóa học đã đăng ký |
| GET | `/courses/{id}/content` | Enrolled | Nội dung khóa học (sections + lessons) |

### Teacher APIs
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/courses` | TEACHER | Tạo khóa học mới |
| PUT | `/courses/{id}` | TEACHER | Cập nhật khóa học |
| DELETE | `/courses/{id}` | TEACHER | Xóa khóa học |
| GET | `/courses/my-courses` | TEACHER | Khóa học của giảng viên |
| PATCH | `/courses/{id}/publish` | TEACHER | Gửi khóa học để duyệt |
| GET | `/courses/{id}/students` | TEACHER | Danh sách học viên đã đăng ký |
| POST | `/courses/{id}/enrollments` | TEACHER | Gán học viên vào khóa học (by email) |
| POST | `/courses/{id}/bulk-enroll` | TEACHER | Gán nhiều học viên (Excel file) |
| GET | `/courses/{id}/available-students` | TEACHER | Học viên chưa đăng ký (for dropdown) |

### Admin APIs
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/courses/all` | ADMIN | Tất cả khóa học (all statuses) |
| GET | `/admin/courses/pending` | ADMIN | Khóa học chờ duyệt |
| PATCH | `/admin/courses/{id}/approve` | ADMIN | Duyệt khóa học |
| PATCH | `/admin/courses/{id}/reject` | ADMIN | Từ chối khóa học (+ lý do) |
| DELETE | `/admin/courses/{id}` | ADMIN | Xóa khóa học |

---

## 👥 User Management APIs (Admin Only)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/users` | ADMIN | Danh sách người dùng (paginated) |
| GET | `/users/list/all` | ADMIN | Tất cả người dùng (no pagination) |
| GET | `/users/{id}` | ADMIN | Chi tiết người dùng |
| POST | `/users` | ADMIN | Tạo người dùng mới |
| PUT | `/users/{id}` | ADMIN | Cập nhật người dùng |
| DELETE | `/users/{id}` | ADMIN | Vô hiệu hóa người dùng |
| PATCH | `/users/{id}/toggle-status` | ADMIN | Bật/tắt trạng thái người dùng |

---

## 📊 Admin Analytics APIs

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/analytics` | ADMIN | Thống kê tổng quan hệ thống |

**Analytics Response includes**:
- totalUsers, totalTeachers, totalStudents
- totalCourses, approvedCourses, pendingCourses, rejectedCourses, draftCourses
- totalEnrollments, totalAssignments, totalSubmissions
- coursesByStatus, usersByRole, enrollmentsByMonth

---

## 📝 Request/Response Examples

### Login Request
```json
POST /api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Create Course Request
```json
POST /api/v1/courses
Authorization: Bearer <token>
{
  "code": "CS101",
  "title": "Introduction to Computer Science",
  "description": "Learn the fundamentals..."
}
```

### Enroll Student Request (Teacher)
```json
POST /api/v1/courses/{courseId}/enrollments
Authorization: Bearer <token>
{
  "email": "student@example.com"
}
```

### Approve Course Request
```json
PATCH /api/v1/admin/courses/{courseId}/approve
Authorization: Bearer <token>
```

### Reject Course Request
```json
PATCH /api/v1/admin/courses/{courseId}/reject
Authorization: Bearer <token>
{
  "reason": "Nội dung chưa đầy đủ, cần bổ sung thêm bài tập"
}
```

---

## 🔍 Query Parameters

### Pagination (Common)
- `page`: Số trang (default: 1, bắt đầu từ 1)
- `limit` hoặc `size`: Số item/trang (default: 10)

### Search/Filter
- `search`: Tìm kiếm theo tên, email, title
- `status`: Lọc theo trạng thái (DRAFT, PENDING, APPROVED, REJECTED)
- `teacher`: Lọc theo giảng viên
- `role`: Lọc theo vai trò user (ADMIN, TEACHER, STUDENT)

---

## ⚠️ Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request thành công |
| 201 | Created | Tạo resource thành công |
| 400 | Bad Request | Validation error, missing fields |
| 401 | Unauthorized | Token missing/invalid/expired |
| 403 | Forbidden | Không đủ quyền truy cập |
| 404 | Not Found | Resource không tồn tại |
| 500 | Server Error | Lỗi server |

---

## 📦 Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "message": "Error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "totalElements": 100,
    "totalPages": 10,
    "size": 10,
    "number": 0,
    "first": true,
    "last": false
  },
  "message": null
}
```

---

## 🎯 Missing APIs (Recommendations)

### 1. Enrollment Detail Management
```
GET    /api/v1/admin/courses/{courseId}/enrollments
DELETE /api/v1/admin/courses/{courseId}/enrollments/{studentId}
POST   /api/v1/admin/courses/{courseId}/bulk-unenroll
```

### 2. User Enrollment History
```
GET /api/v1/admin/users/{userId}/enrollments
```

### 3. Advanced Search
```
GET /api/v1/admin/courses/search?status=APPROVED&teacher=John&dateFrom=2024-01-01
```

### 4. Enrollment Statistics
```
GET /api/v1/admin/enrollments/stats?period=monthly
```

### 5. Direct Status Change
```
PATCH /api/v1/admin/courses/{courseId}/status
{
  "status": "APPROVED"
}
```

---

## 📚 Related Files

**Controllers**:
- `api/src/main/java/com/example/lms/controller/CourseController.java`
- `api/src/main/java/com/example/lms/controller/AdminController.java`
- `api/src/main/java/com/example/lms/controller/UserController.java`
- `api/src/main/java/com/example/lms/controller/AuthController.java`

**Services**:
- `api/src/main/java/com/example/lms/service/CourseService.java`
- `api/src/main/java/com/example/lms/service/AdminService.java`
- `api/src/main/java/com/example/lms/service/UserService.java`

**Entities**:
- `api/src/main/java/com/example/lms/entity/Course.java`
- `api/src/main/java/com/example/lms/entity/User.java`

---

**Generated**: 2025-12-01  
**Backend Version**: v1.0.0  
**Swagger UI**: http://localhost:8088/swagger-ui/index.html
