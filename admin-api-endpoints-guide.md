# 📋 Hướng Dẫn API Endpoints - Admin LMS

## 📋 Tổng Quan

Tài liệu này cung cấp hướng dẫn chi tiết về tất cả API endpoints dành cho Admin trong hệ thống LMS Hàng Hải, bao gồm request/response format, authentication, và error handling.

## 🔐 Authentication & Authorization

### JWT Token Requirements
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Admin Role Required
Tất cả API endpoints đều yêu cầu user có role `ADMIN`.

## 📊 Analytics & Statistics APIs

### 1. Get System Analytics
**Endpoint:** `GET /api/v1/admin/analytics`

**Description:** Lấy dữ liệu thống kê tổng quan của hệ thống

**Response:**
```json
{
  "success": true,
  "message": "Analytics retrieved successfully",
  "data": {
    "totalUsers": 150,
    "totalTeachers": 15,
    "totalStudents": 135,
    "totalAdmins": 3,
    "totalCourses": 45,
    "approvedCourses": 38,
    "pendingCourses": 5,
    "rejectedCourses": 2,
    "draftCourses": 0,
    "totalAssignments": 120,
    "totalSubmissions": 890,
    "totalEnrollments": 320,
    "coursesByStatus": {
      "APPROVED": 38,
      "PENDING": 5,
      "REJECTED": 2,
      "DRAFT": 0
    },
    "usersByRole": {
      "ADMIN": 3,
      "TEACHER": 15,
      "STUDENT": 135
    },
    "enrollmentsByMonth": {
      "2024-01": 25,
      "2024-02": 30,
      "2024-03": 45
    }
  }
}
```

### 2. Get User Analytics
**Endpoint:** `GET /api/v1/admin/users/analytics`

**Description:** Lấy thống kê chi tiết về người dùng

**Response:**
```json
{
  "success": true,
  "data": {
    "activeUsers": 142,
    "inactiveUsers": 8,
    "newUsersThisMonth": 12,
    "userGrowthRate": 8.5,
    "topActiveUsers": [
      {
        "userId": "uuid",
        "username": "student1",
        "activityCount": 45
      }
    ]
  }
}
```

### 3. Get Course Analytics
**Endpoint:** `GET /api/v1/admin/courses/analytics`

**Description:** Lấy thống kê chi tiết về khóa học

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCourses": 45,
    "averageEnrollmentsPerCourse": 7.1,
    "mostPopularCourses": [
      {
        "courseId": "uuid",
        "title": "Maritime Safety",
        "enrollments": 25
      }
    ],
    "courseCompletionRate": 68.5
  }
}
```

## 👥 User Management APIs

### 4. Get All Users
**Endpoint:** `GET /api/v1/users`

**Query Parameters:**
- `page` (integer, default: 1): Số trang
- `limit` (integer, default: 10): Số item mỗi trang
- `search` (string, optional): Tìm kiếm theo tên hoặc email
- `role` (string, optional): Lọc theo role (ADMIN, TEACHER, STUDENT)

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "username": "admin1",
      "email": "admin@lms.com",
      "fullName": "Administrator",
      "role": "ADMIN",
      "enabled": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "totalItems": 150,
    "totalPages": 15,
    "page": 1,
    "limit": 10,
    "first": true,
    "last": false
  }
}
```

### 5. Get All Users (No Pagination)
**Endpoint:** `GET /api/v1/users/list/all`

**Description:** Lấy tất cả người dùng không phân trang (dành cho dropdown)

**Response:**
```json
{
  "success": true,
  "message": "All users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "username": "student1",
      "email": "student1@lms.com",
      "fullName": "Nguyễn Văn A",
      "role": "STUDENT",
      "enabled": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 6. Get User Details
**Endpoint:** `GET /api/v1/users/{userId}`

**Path Parameters:**
- `userId` (UUID): ID của user

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "student1",
    "email": "student1@lms.com",
    "fullName": "Nguyễn Văn A",
    "role": "STUDENT",
    "enabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 7. Create User
**Endpoint:** `POST /api/v1/users`

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@lms.com",
  "password": "password123",
  "fullName": "New User",
  "role": "STUDENT"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "username": "newuser",
    "email": "newuser@lms.com",
    "fullName": "New User",
    "role": "STUDENT",
    "enabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 8. Update User
**Endpoint:** `PUT /api/v1/users/{userId}`

**Path Parameters:**
- `userId` (UUID): ID của user

**Request Body:**
```json
{
  "email": "updated@lms.com",
  "fullName": "Updated Name",
  "role": "TEACHER",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "username": "newuser",
    "email": "updated@lms.com",
    "fullName": "Updated Name",
    "role": "TEACHER",
    "enabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

### 9. Delete User (Disable)
**Endpoint:** `DELETE /api/v1/users/{userId}`

**Path Parameters:**
- `userId` (UUID): ID của user

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 10. Bulk Import Users
**Endpoint:** `POST /api/v1/users/bulk-import`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Excel file (.xlsx/.xls)
- `defaultRole` (optional): Default role for imported users (default: STUDENT)

**Response:**
```json
{
  "success": true,
  "message": "Bulk import completed",
  "data": {
    "totalProcessed": 100,
    "successCount": 95,
    "errorCount": 5,
    "errors": [
      {
        "row": 5,
        "email": "invalid-email",
        "error": "Invalid email format"
      }
    ]
  }
}
```

### 11. Get Import Template
**Endpoint:** `GET /api/v1/users/bulk-import/template`

**Response:**
```json
{
  "success": true,
  "message": "Import template retrieved",
  "data": "Excel template instructions and format requirements..."
}
```

## 📚 Course Management APIs

### 12. Get Pending Courses
**Endpoint:** `GET /api/v1/admin/courses/pending`

**Query Parameters:**
- `page` (integer, default: 1): Số trang
- `limit` (integer, default: 10): Số item mỗi trang

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "CS101",
      "title": "Introduction to Computer Science",
      "description": "Basic computer science concepts",
      "teacherId": "uuid",
      "teacherName": "Dr. Smith",
      "teacherEmail": "smith@university.edu",
      "sectionsCount": 5,
      "submittedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-10T09:00:00Z"
    }
  ],
  "pagination": {
    "totalItems": 5,
    "totalPages": 1,
    "page": 1,
    "limit": 10,
    "first": true,
    "last": true
  }
}
```

### 13. Get All Courses
**Endpoint:** `GET /api/v1/admin/courses/all`

**Query Parameters:**
- `page` (integer, default: 1): Số trang
- `limit` (integer, default: 10): Số item mỗi trang
- `status` (string, optional): Lọc theo trạng thái (APPROVED, PENDING, REJECTED, DRAFT)
- `search` (string, optional): Tìm kiếm theo tên khóa học

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "CS101",
      "title": "Introduction to Computer Science",
      "status": "APPROVED",
      "teacherName": "Dr. Smith",
      "enrolledCount": 25,
      "sectionsCount": 5,
      "assignmentsCount": 3,
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "totalItems": 45,
    "totalPages": 5,
    "page": 1,
    "limit": 10,
    "first": true,
    "last": false
  }
}
```

### 14. Approve Course
**Endpoint:** `PATCH /api/v1/admin/courses/{courseId}/approve`

**Path Parameters:**
- `courseId` (UUID): ID của khóa học

**Response:**
```json
{
  "success": true,
  "message": "Khóa học đã được duyệt"
}
```

### 15. Reject Course
**Endpoint:** `PATCH /api/v1/admin/courses/{courseId}/reject`

**Path Parameters:**
- `courseId` (UUID): ID của khóa học

**Request Body:**
```json
{
  "reason": "Course content needs improvement"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Khóa học đã bị từ chối"
}
```

### 16. Delete Course
**Endpoint:** `DELETE /api/v1/admin/courses/{courseId}`

**Path Parameters:**
- `courseId` (UUID): ID của khóa học

**Response:**
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

## 📁 File Upload APIs

### 17. Get Signed URL for Upload
**Endpoint:** `POST /api/v1/uploads/signed-url`

**Request Body:**
```json
{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000,
  "purpose": "assignment",
  "relatedId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://storage.googleapis.com/...",
    "fileUrl": "https://storage.googleapis.com/bucket/document.pdf",
    "fileId": "document_20240115_143000_abc123.pdf",
    "expiresAt": 1705329000000,
    "method": "PUT"
  }
}
```

### 18. Validate Upload
**Endpoint:** `POST /api/v1/uploads/validate`

**Request Body:**
```json
{
  "fileId": "document_20240115_143000_abc123.pdf",
  "fileUrl": "https://storage.googleapis.com/bucket/document.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File đã được upload thành công"
}
```

### 19. Delete File
**Endpoint:** `DELETE /api/v1/uploads/file`

**Request Body:**
```json
{
  "fileUrl": "https://storage.googleapis.com/bucket/document.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File đã được xóa"
}
```

## 🔐 Authentication APIs

### 20. Login
**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@lms.com",
    "fullName": "Administrator",
    "role": "ADMIN",
    "enabled": true
  }
}
```

### 21. Refresh Token
**Endpoint:** `POST /api/v1/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@lms.com",
    "fullName": "Administrator",
    "role": "ADMIN",
    "enabled": true
  }
}
```

### 22. Logout
**Endpoint:** `POST /api/v1/auth/logout`

**Response:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

### 23. Get Current User
**Endpoint:** `GET /api/v1/auth/me`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@lms.com",
    "fullName": "Administrator",
    "role": "ADMIN",
    "enabled": true
  }
}
```

### 24. Update Profile
**Endpoint:** `PUT /api/v1/auth/profile`

**Request Body:**
```json
{
  "fullName": "Updated Admin Name",
  "email": "newadmin@lms.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "newadmin@lms.com",
    "fullName": "Updated Admin Name",
    "role": "ADMIN",
    "enabled": true
  }
}
```

### 25. Change Password
**Endpoint:** `PUT /api/v1/auth/password`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mật khẩu đã được thay đổi thành công"
}
```

### 26. Forgot Password
**Endpoint:** `POST /api/v1/auth/forgot-password`

**Request Body:**
```json
{
  "email": "admin@lms.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mã OTP đã được gửi về email của bạn"
}
```

### 27. Reset Password
**Endpoint:** `POST /api/v1/auth/reset-password`

**Request Body:**
```json
{
  "email": "admin@lms.com",
  "otpCode": "123456",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mật khẩu đã được đặt lại thành công"
}
```

## 📊 Error Responses

### Common Error Format
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  "errors": [
    {
      "field": "email",
      "message": "Email không đúng định dạng"
    },
    {
      "field": "password",
      "message": "Mật khẩu phải có ít nhất 6 ký tự"
    }
  ]
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `500`: Internal Server Error

## 🔄 Rate Limiting

### API Rate Limits
- Authentication endpoints: 5 requests per minute per IP
- User management: 100 requests per minute per admin user
- Analytics: 50 requests per minute per admin user
- File uploads: 20 requests per minute per user

## 📝 API Versioning

Current API version: `v1`
All endpoints are prefixed with `/api/v1/`

## 🧪 Testing Examples

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:8088/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

**Get Users:**
```bash
curl -X GET "http://localhost:8088/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Create User:**
```bash
curl -X POST http://localhost:8088/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@lms.com",
    "password": "password123",
    "fullName": "New User",
    "role": "STUDENT"
  }'
```

---

*Tài liệu này cung cấp thông tin chi tiết về tất cả API endpoints dành cho Admin. Hãy sử dụng Postman hoặc Swagger UI để test các API trước khi tích hợp vào frontend.*