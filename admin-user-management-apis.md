# Admin User Management APIs - Detailed Documentation

## Base Information
- **Base URL**: `http://localhost:8088/api/v1`
- **Authentication**: JWT Bearer Token (Required)
- **Role Required**: ADMIN
- **Content-Type**: `application/json`

---

## 1. GET All Users (Paginated)

### Endpoint
```
GET /api/v1/users
```

### Description
Lấy danh sách tất cả người dùng trong hệ thống với phân trang và tìm kiếm

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Số trang (bắt đầu từ 1) |
| limit | integer | No | 10 | Số item trên mỗi trang |
| search | string | No | null | Tìm kiếm theo username, email, fullName |

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/users?page=1&limit=20&search=john" \
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
        "username": "john.doe",
        "email": "john.doe@example.com",
        "fullName": "John Doe",
        "role": "TEACHER",
        "enabled": true,
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "username": "jane.smith",
        "email": "jane.smith@example.com",
        "fullName": "Jane Smith",
        "role": "STUDENT",
        "enabled": true,
        "createdAt": "2024-02-20T14:45:00Z"
      }
    ],
    "totalElements": 1250,
    "totalPages": 63,
    "size": 20,
    "number": 0
  },
  "message": null
}
```

### File Location
`api/src/main/java/com/example/lms/controller/UserController.java:getAllUsers()`

---

## 2. GET All Users (No Pagination)

### Endpoint
```
GET /api/v1/users/list/all
```

### Description
Lấy tất cả người dùng không phân trang (dùng cho dropdown, select box)

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/users/list/all" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john.doe",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "role": "TEACHER",
      "enabled": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "message": null
}
```

### Use Cases
- Populate teacher dropdown in course creation
- Student selection for enrollment
- User assignment forms

### File Location
`api/src/main/java/com/example/lms/controller/UserController.java:getAllUsers()`

---

## 3. GET User Details

### Endpoint
```
GET /api/v1/users/{userId}
```

### Description
Lấy thông tin chi tiết của một người dùng

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | ID của người dùng |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X GET "http://localhost:8088/api/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "role": "TEACHER",
    "enabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-03-10T09:20:00Z"
  },
  "message": null
}
```

### Response Error (404 Not Found)
```json
{
  "success": false,
  "data": null,
  "message": "Không tìm thấy người dùng"
}
```

### File Location
`api/src/main/java/com/example/lms/controller/UserController.java:getUserById()`

---

## 4. POST Create User

### Endpoint
```
POST /api/v1/users
```

### Description
Admin tạo tài khoản người dùng mới

### Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "username": "new.teacher",
  "email": "new.teacher@example.com",
  "password": "SecurePass123!",
  "fullName": "New Teacher Name",
  "role": "TEACHER"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| username | string | Yes | 3-50 chars, unique | Tên đăng nhập |
| email | string | Yes | Valid email, unique | Email |
| password | string | Yes | Min 6 chars | Mật khẩu (sẽ được hash) |
| fullName | string | No | Max 100 chars | Họ tên đầy đủ |
| role | string | Yes | ADMIN/TEACHER/STUDENT | Vai trò |

### Example Request
```bash
curl -X POST "http://localhost:8088/api/v1/users" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new.teacher",
    "email": "new.teacher@example.com",
    "password": "SecurePass123!",
    "fullName": "New Teacher Name",
    "role": "TEACHER"
  }'
```

### Response Success (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "username": "new.teacher",
    "email": "new.teacher@example.com",
    "fullName": "New Teacher Name",
    "role": "TEACHER",
    "enabled": true,
    "createdAt": "2024-03-15T10:00:00Z",
    "updatedAt": null
  },
  "message": null
}
```

### Response Error (400 Bad Request - Duplicate)
```json
{
  "success": false,
  "data": null,
  "message": "Email đã tồn tại trong hệ thống"
}
```

### Response Error (400 Bad Request - Validation)
```json
{
  "success": false,
  "data": null,
  "message": "Mật khẩu phải có ít nhất 6 ký tự"
}
```

### File Location
`api/src/main/java/com/example/lms/controller/UserController.java:createUser()`

---

## 5. PUT Update User

### Endpoint
```
PUT /api/v1/users/{userId}
```

### Description
Admin cập nhật thông tin người dùng

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | ID của người dùng cần cập nhật |

### Request Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "email": "updated.email@example.com",
  "fullName": "Updated Full Name",
  "role": "ADMIN",
  "enabled": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | No | Email mới (phải unique) |
| fullName | string | No | Họ tên mới |
| role | string | No | Vai trò mới |
| enabled | boolean | No | Trạng thái kích hoạt |

### Example Request
```bash
curl -X PUT "http://localhost:8088/api/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe Updated",
    "role": "ADMIN"
  }'
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "fullName": "John Doe Updated",
    "role": "ADMIN",
    "enabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-03-15T11:45:00Z"
  },
  "message": null
}
```

### File Location
`api/src/main/java/com/example/lms/controller/UserController.java:updateUser()`

---

## 6. DELETE Disable User

### Endpoint
```
DELETE /api/v1/users/{userId}
```

### Description
Vô hiệu hóa tài khoản người dùng (soft delete - set enabled = false)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | ID của người dùng cần vô hiệu hóa |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X DELETE "http://localhost:8088/api/v1/users/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": "Người dùng đã được vô hiệu hóa",
  "message": "Người dùng đã được vô hiệu hóa"
}
```

### Notes
- This is a soft delete (enabled = false)
- User data is preserved
- User cannot login after being disabled
- Can be re-enabled using toggle-status endpoint

### File Location
`api/src/main/java/com/example/lms/controller/UserController.java:deleteUser()`

---

## 7. PATCH Toggle User Status

### Endpoint
```
PATCH /api/v1/users/{userId}/toggle-status
```

### Description
Bật/tắt trạng thái kích hoạt của người dùng (enabled ↔ disabled)

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | Yes | ID của người dùng |

### Request Headers
```http
Authorization: Bearer <jwt_token>
```

### Example Request
```bash
curl -X PATCH "http://localhost:8088/api/v1/users/550e8400-e29b-41d4-a716-446655440000/toggle-status" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Response Success (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "role": "TEACHER",
    "enabled": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-03-15T12:00:00Z"
  },
  "message": null
}
```

### Use Cases
- Temporarily disable user account
- Re-enable previously disabled account
- Quick status toggle in admin UI

### File Location
`api/src/main/java/com/example/lms/controller/UserController.java:toggleUserStatus()`

---

## User Roles Reference

| Role | Value | Description | Permissions |
|------|-------|-------------|-------------|
| Admin | ADMIN | Quản trị viên | Full system access |
| Teacher | TEACHER | Giảng viên | Create/manage courses |
| Student | STUDENT | Học viên | Enroll in courses |

---

## Common Validation Rules

### Username
- Required, 3-50 characters
- Must be unique
- Cannot be changed after creation

### Email
- Required, valid email format
- Must be unique
- Can be updated

### Password
- Required on creation
- Minimum 6 characters
- Stored as BCrypt hash

### Full Name
- Optional
- Maximum 100 characters

### Role
- Required
- Must be one of: ADMIN, TEACHER, STUDENT

---

**Generated**: 2025-12-01  
**Backend Version**: v1.0.0
