# API Documentation - Course & Enrollment Management (Admin)

> **Tài liệu API đầy đủ cho FE Admin - Quản lý Khóa học và Đăng ký**
> 
> **Backend Stack**: Spring Boot 3.5.6 + Java 21 + PostgreSQL 16 + JWT Authentication
> 
> **Base URL**: `http://localhost:8088/api/v1`
> 
> **Swagger UI**: `http://localhost:8088/swagger-ui/index.html`

---

## 📋 Mục lục

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Authentication](#authentication)
3. [Course Management APIs](#course-management-apis)
4. [User Management APIs](#user-management-apis)
5. [Admin Analytics APIs](#admin-analytics-apis)
6. [Enrollment Management APIs](#enrollment-management-apis)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)
9. [Missing APIs & Recommendations](#missing-apis--recommendations)

---

## 🎯 Tổng quan hệ thống

### Tech Stack
- **Backend Framework**: Spring Boot 3.5.6
- **Language**: Java 21 (với Virtual Threads)
- **Database**: PostgreSQL 16 (Supabase)
- **ORM**: Spring Data JPA + Hibernate 6.6.29
- **Authentication**: JWT (jsonwebtoken 0.12.3)
- **Security**: Spring Security 6.x với BCrypt
- **Documentation**: SpringDoc OpenAPI 2.6.0
- **Build Tool**: Maven 3.x

### Database Schema Overview

```
users (User entity)
├── id: UUID (PK)
├── username: VARCHAR(50) UNIQUE
├── email: VARCHAR(100) UNIQUE
├── password: VARCHAR (BCrypt hashed)
├── full_name: VARCHAR
├── role: ENUM (ADMIN, TEACHER, STUDENT)
├── enabled: BOOLEAN
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

courses (Course entity)
├── id: UUID (PK)
├── code: VARCHAR(64) UNIQUE
├── title: VARCHAR(255)
├── description: TEXT
├── status: ENUM (DRAFT, PENDING, APPROVED, REJECTED)
├── teacher_id: UUID (FK -> users.id)
├── review_comment: TEXT
├── reviewed_at: TIMESTAMP
├── reviewed_by_id: UUID (FK -> users.id)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

course_enrollments (Many-to-Many)
├── student_id: UUID (FK -> users.id)
└── course_id: UUID (FK -> courses.id)

sections (Section entity)
├── id: UUID (PK)
├── course_id: UUID (FK -> courses.id)
├── title: VARCHAR
├── description: TEXT
├── order_index: INTEGER
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

lessons (Lesson entity)
├── id: UUID (PK)
├── section_id: UUID (FK -> sections.id)
├── title: VARCHAR
├── content: TEXT
├── description: TEXT
├── video_url: VARCHAR(500)
├── duration_minutes: INTEGER
├── order_index: INTEGER
├── lesson_type: ENUM (LECTURE, ASSIGNMENT, QUIZ)
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP
```

### Course Status Flow
```
DRAFT → PENDING → APPROVED (published)
              ↓
           REJECTED
```

### User Roles & Permissions
- **ADMIN**: Full system access, course approval, user management
- **TEACHER**: Create/manage own courses, view enrolled students
- **STUDENT**: Enroll in courses, view course content

---

## 🔐 Authentication

### Headers Required
Tất cả các API (trừ login/register) yêu cầu JWT token trong header:

```http
Authorization: Bearer <jwt_token>
```

### 1. Login

**Endpoint**: `POST /api/v1/auth/login`

**Description**: Đăng nhập và nhận JWT token

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response Success (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "Admin User",
    "role": "ADMIN",
    "enabled": true
  }
}
```

**Response Error (401)**:
```json
{
  "message": "Email hoặc mật khẩu không đúng"
}
```

**Notes**:
- JWT token expires sau 24 giờ
- Refresh token expires sau 7 ngày
- Password được hash bằng BCrypt

---

## 📚 Course Management APIs

### 2. Get All Courses (Admin)

**Endpoint**: `GET /api/v1/admin/courses/all`

**Description**: Lấy danh sách tất cả khóa học trong hệ thống (admin only)

**Method**: GET

**Authentication**: Required (ADMIN role)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Số trang (bắt đầu từ 1) |
| limit | integer | No | 10 | Số item trên mỗi trang |
| status | string | No | null | Lọc theo trạng thái: DRAFT, PENDING, APPROVED, REJECTED |
| search | string | No | null | Tìm kiếm theo tên khóa học |

**Request Headers**:
```http
Authorization: Bearer <jwt_token>
```

**Response Success (200)**:
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
      }
    ],
    "totalElements": 100,
    "totalPages": 10,
    "size": 10,
    "number": 0
  },
  "message": null
}
```

**Response Error (403)**:
```json
{
  "success": false,
  "data": null,
  "message": "Access denied. Admin role required."
}
```

**File Path**: `api/src/main/java/com/example/lms/controller/AdminController.java:getAllCourses()`

---

### 3. Get Course Details

**Endpoint**: `GET /api/v1/courses/{courseId}`

**Description**: Lấy thông tin chi tiết của một khóa học

**Method**: GET

**Authentication**: Optional (public for APPROVED courses)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | Yes | ID của khóa học |

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "CS101",
    "title": "Introduction to Computer Science",
    "description": "Learn the fundamentals of computer science...",
    "status": "APPROVED",
    "teacherId": "660e8400-e29b-41d4-a716-446655440001",
    "teacherName": "John Doe",
    "enrolledCount": 45,
    "sectionsCount": 8,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-02-20T14:45:00Z"
  },
  "message": null
}
```

**Response Error (404)**:
```json
{
  "success": false,
  "data": null,
  "message": "Không tìm thấy khóa học"
}
```

**File Path**: `api/src/main/java/com/example/lms/controller/CourseController.java:getCourseById()`

---
