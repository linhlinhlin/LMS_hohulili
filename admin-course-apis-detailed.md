# Admin Course Management APIs - Detailed Documentation

## Base Information
- **Base URL**: `http://localhost:8088/api/v1`
- **Authentication**: JWT Bearer Token (Required for all endpoints)
- **Role Required**: ADMIN
- **Content-Type**: `application/json`

---

## 1. GET All Courses (Admin View)

### Endpoint
```
GET /api/v1/admin/courses/all
```

### Description
Lấy danh sách tất cả khóa học trong hệ thống với mọi trạng thái. Admin có thể filter theo status và search theo tên.

### Request Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Số trang (bắt đầu từ 1) |
| limit | integer | No | 10 | Số item trên mỗi trang (max: 100) |
| status | string | No | null | Filter: DRAFT, PENDING, APPROVED, REJECTED |
| search | string | No | null | Tìm kiếm theo title, code, description |

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/admin/courses/all?page=1&limit=20&status=APPROVED&search=computer" \
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
        "status": "APPROVED",
        "teacherName": "John Doe",
        "enrolledCount": 45,
        "sectionsCount": 8,
        "assignmentsCount": 12,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-02-20T14:45:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "code": "CS102",
        "title": "Advanced Computer Programming",
        "status": "PENDING",
        "teacherName": "Jane Smith",
        "enrolledCount": 0,
        "sectionsCount": 6,
        "assignmentsCount": 8,
        "createdAt": "2024-03-01T09:00:00Z",
        "updatedAt": "2024-03-05T11:20:00Z"
      }
    ],
    "totalElements": 150,
    "totalPages": 8,
    "size": 20,
    "number": 0,
    "first": true,
    "last": false
  },
  "message": null
}
```

### Response Error (403 Forbidden)
```json
{
  "success": false,
  "data": null,
  "message": "Access denied. Admin role required."
}
```

### Response Error (401 Unauthorized)
```json
{
  "success": false,
  "data": null,
  "message": "Unauthorized - Invalid or expired token"
}
```

### File Location
`api/src/main/java/com/example/lms/controller/AdminController.java:getAllCourses()`

---

## 2. GET Pending Courses

### Endpoint
```
GET /api/v1/admin/courses/pending
```

### Description
Lấy danh sách các khóa học đang chờ admin duyệt (status = PENDING)

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Query Parameters
| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| page | integer | No | 1 |
| limit | integer | No | 10 |

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/admin/courses/pending?page=1&limit=10" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "code": "MATH201",
        "title": "Calculus II",
        "description": "Advanced calculus topics including...",
        "teacherId": "880e8400-e29b-41d4-a716-446655440003",
        "teacherName": "Dr. Robert Johnson",
        "teacherEmail": "robert.johnson@university.edu",
        "sectionsCount": 10,
        "submittedAt": "2024-03-10T14:30:00Z",
        "createdAt": "2024-03-01T10:00:00Z"
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
`api/src/main/java/com/example/lms/controller/AdminController.java:getPendingCourses()`

---

## 3. PATCH Approve Course

### Endpoint
```
PATCH /api/v1/admin/courses/{courseId}/approve
```

### Description
Admin duyệt một khóa học. Sau khi duyệt, khóa học sẽ chuyển sang trạng thái APPROVED và hiển thị công khai.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học cần duyệt |

### Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body
Không cần body

### Example Request
```bash
curl -X PATCH "http://localhost:8088/api/v1/admin/courses/770e8400-e29b-41d4-a716-446655440002/approve" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": "Khóa học đã được duyệt",
  "message": "Khóa học đã được duyệt"
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

### Response Error (400 Bad Request)
```json
{
  "success": false,
  "data": null,
  "message": "Khóa học không ở trạng thái chờ duyệt"
}
```

### Side Effects
- Course status changes: PENDING → APPROVED
- `reviewedAt` timestamp is set
- `reviewedBy` is set to current admin user
- Course becomes visible in public course list

### File Location
`api/src/main/java/com/example/lms/controller/AdminController.java:approveCourse()`

---

## 4. PATCH Reject Course

### Endpoint
```
PATCH /api/v1/admin/courses/{courseId}/reject
```

### Description
Admin từ chối một khóa học kèm theo lý do. Giảng viên sẽ nhận được thông báo và có thể chỉnh sửa lại.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học cần từ chối |

### Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "reason": "Nội dung khóa học chưa đầy đủ. Cần bổ sung thêm bài tập thực hành và video hướng dẫn."
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| reason | string | Yes | NotBlank | Lý do từ chối (bắt buộc) |

### Example Request
```bash
curl -X PATCH "http://localhost:8088/api/v1/admin/courses/770e8400-e29b-41d4-a716-446655440002/reject" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Nội dung chưa đầy đủ, cần bổ sung thêm bài tập"
  }'
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": "Khóa học đã bị từ chối",
  "message": "Khóa học đã bị từ chối"
}
```

### Response Error (400 Bad Request - Missing Reason)
```json
{
  "success": false,
  "data": null,
  "message": "Lý do từ chối không được để trống"
}
```

### Side Effects
- Course status changes: PENDING → REJECTED
- `reviewComment` is set to rejection reason
- `reviewedAt` timestamp is set
- `reviewedBy` is set to current admin user
- Teacher receives notification (if notification system exists)

### File Location
`api/src/main/java/com/example/lms/controller/AdminController.java:rejectCourse()`

---

## 5. DELETE Course (Admin)

### Endpoint
```
DELETE /api/v1/admin/courses/{courseId}
```

### Description
Admin xóa một khóa học. Chỉ có thể xóa khóa học ở trạng thái DRAFT hoặc REJECTED.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học cần xóa |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X DELETE "http://localhost:8088/api/v1/admin/courses/770e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": "Khóa học đã được xóa",
  "message": "Khóa học đã được xóa"
}
```

### Response Error (400 Bad Request)
```json
{
  "success": false,
  "data": null,
  "message": "Không thể xóa khóa học đã được duyệt hoặc có học viên đăng ký"
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

### Business Rules
- Cannot delete APPROVED courses
- Cannot delete courses with enrolled students
- Can delete DRAFT or REJECTED courses
- Cascade delete: sections, lessons, assignments

### File Location
`api/src/main/java/com/example/lms/controller/AdminController.java:deleteCourse()`

---

## 6. GET System Analytics

### Endpoint
```
GET /api/v1/admin/analytics
```

### Description
Lấy thống kê tổng quan toàn hệ thống cho admin dashboard

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/admin/analytics" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalTeachers": 45,
    "totalStudents": 1180,
    "totalCourses": 156,
    "approvedCourses": 120,
    "pendingCourses": 8,
    "rejectedCourses": 12,
    "draftCourses": 16,
    "totalEnrollments": 5420,
    "totalAssignments": 890,
    "totalSubmissions": 12340,
    "coursesByStatus": {
      "APPROVED": 120,
      "PENDING": 8,
      "REJECTED": 12,
      "DRAFT": 16
    },
    "usersByRole": {
      "ADMIN": 5,
      "TEACHER": 45,
      "STUDENT": 1180
    },
    "enrollmentsByMonth": {
      "2024-01": 450,
      "2024-02": 520,
      "2024-03": 680
    }
  },
  "message": null
}
```

### Response Fields Description
| Field | Type | Description |
|-------|------|-------------|
| totalUsers | number | Tổng số người dùng trong hệ thống |
| totalTeachers | number | Số lượng giảng viên |
| totalStudents | number | Số lượng học viên |
| totalCourses | number | Tổng số khóa học |
| approvedCourses | number | Số khóa học đã duyệt |
| pendingCourses | number | Số khóa học chờ duyệt |
| rejectedCourses | number | Số khóa học bị từ chối |
| draftCourses | number | Số khóa học đang soạn thảo |
| totalEnrollments | number | Tổng số lượt đăng ký |
| totalAssignments | number | Tổng số bài tập |
| totalSubmissions | number | Tổng số bài nộp |
| coursesByStatus | object | Phân bố khóa học theo trạng thái |
| usersByRole | object | Phân bố người dùng theo vai trò |
| enrollmentsByMonth | object | Số lượt đăng ký theo tháng |

### File Location
`api/src/main/java/com/example/lms/controller/AdminController.java:getSystemAnalytics()`

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "data": null,
  "message": "Unauthorized - Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "data": null,
  "message": "Access denied. Admin role required."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "data": null,
  "message": "Lỗi khi xử lý yêu cầu: [error details]"
}
```

---

## Notes for Frontend Implementation

1. **Token Management**: Store JWT token securely (localStorage/sessionStorage)
2. **Token Expiry**: Implement token refresh logic (24h expiry)
3. **Error Handling**: Handle 401/403 errors globally (redirect to login)
4. **Pagination**: Page numbers start from 1 (not 0)
5. **Status Values**: Use exact enum values (DRAFT, PENDING, APPROVED, REJECTED)
6. **UUID Format**: All IDs are UUID v4 format
7. **Timestamps**: All dates in ISO 8601 format (UTC)

---

**Generated**: 2025-12-01  
**Backend Version**: v1.0.0
