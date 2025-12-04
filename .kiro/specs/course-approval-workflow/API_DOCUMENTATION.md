# Course Approval Workflow - API Documentation

## Overview

This document describes the API endpoints for the Course Approval Workflow feature. The workflow allows teachers to submit courses for admin review, and enables admins to approve or reject courses with feedback.

## Base URL

```
http://localhost:8088/api/v1
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Teacher Endpoints

### 1. Submit Course for Approval

Submit a DRAFT or REJECTED course for admin review.

**Endpoint:** `POST /courses/{courseId}/submit-for-approval`

**Authorization:** TEACHER role (course owner only)

**Path Parameters:**
- `courseId` (UUID) - ID of the course to submit

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Khóa học đã được gửi để phê duyệt",
  "data": {
    "id": "uuid",
    "code": "COURSE001",
    "title": "Kỹ thuật Tàu biển Cơ bản",
    "status": "PENDING",
    "updatedAt": "2024-12-01T10:30:00Z"
  },
  "timestamp": "2024-12-01T10:30:00Z"
}
```

**Status Codes:**
- `200 OK` - Course submitted successfully
- `400 Bad Request` - Course is not in DRAFT or REJECTED status
- `403 Forbidden` - User is not the course owner
- `404 Not Found` - Course not found

**Example:**
```bash
curl -X POST http://localhost:8088/api/v1/courses/123e4567-e89b-12d3-a456-426614174000/submit-for-approval \
  -H "Authorization: Bearer <token>"
```

---

### 2. Cancel Approval Request

Cancel a pending approval request and return course to DRAFT status.

**Endpoint:** `POST /courses/{courseId}/cancel-approval`

**Authorization:** TEACHER role (course owner only)

**Path Parameters:**
- `courseId` (UUID) - ID of the course

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Yêu cầu phê duyệt đã được hủy",
  "data": {
    "id": "uuid",
    "code": "COURSE001",
    "title": "Kỹ thuật Tàu biển Cơ bản",
    "status": "DRAFT",
    "updatedAt": "2024-12-01T10:35:00Z"
  },
  "timestamp": "2024-12-01T10:35:00Z"
}
```

**Status Codes:**
- `200 OK` - Request cancelled successfully
- `400 Bad Request` - Course is not in PENDING status
- `403 Forbidden` - User is not the course owner
- `404 Not Found` - Course not found

---

### 3. Get Course Review Status

Get the review status and feedback for a course.

**Endpoint:** `GET /courses/{courseId}/review-status`

**Authorization:** TEACHER role (course owner only)

**Path Parameters:**
- `courseId` (UUID) - ID of the course

**Response:**
```json
{
  "success": true,
  "data": {
    "courseId": "uuid",
    "status": "REJECTED",
    "reviewComment": "Nội dung khóa học cần bổ sung thêm ví dụ thực tế",
    "reviewedAt": "2024-12-01T09:00:00Z",
    "reviewedByName": "Admin Nguyễn Văn A"
  },
  "timestamp": "2024-12-01T10:40:00Z"
}
```

**Status Codes:**
- `200 OK` - Status retrieved successfully
- `403 Forbidden` - User is not the course owner
- `404 Not Found` - Course not found

---

## Admin Endpoints

### 4. Get Pending Courses

Get a paginated list of courses pending review.

**Endpoint:** `GET /admin/courses/pending`

**Authorization:** ADMIN role

**Query Parameters:**
- `page` (integer, optional) - Page number (0-based), default: 0
- `size` (integer, optional) - Page size, default: 10
- `search` (string, optional) - Search by course title or teacher name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "COURSE001",
      "title": "Kỹ thuật Tàu biển Cơ bản",
      "description": "Khóa học cung cấp kiến thức cơ bản...",
      "teacherId": "uuid",
      "teacherName": "Nguyễn Văn Teacher",
      "teacherEmail": "teacher@example.com",
      "sectionsCount": 5,
      "submittedAt": "2024-12-01T08:00:00Z",
      "createdAt": "2024-11-25T10:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 0,
    "pageSize": 10,
    "totalPages": 3,
    "totalElements": 25
  },
  "timestamp": "2024-12-01T10:45:00Z"
}
```

**Status Codes:**
- `200 OK` - Courses retrieved successfully
- `403 Forbidden` - User is not an admin

**Example:**
```bash
curl -X GET "http://localhost:8088/api/v1/admin/courses/pending?page=0&size=10&search=tàu" \
  -H "Authorization: Bearer <token>"
```

---

### 5. Get All Courses with Filters

Get a paginated list of all courses with optional status filter.

**Endpoint:** `GET /admin/courses/all`

**Authorization:** ADMIN role

**Query Parameters:**
- `page` (integer, optional) - Page number (0-based), default: 0
- `size` (integer, optional) - Page size, default: 10
- `status` (string, optional) - Filter by status: DRAFT, PENDING, APPROVED, REJECTED
- `search` (string, optional) - Search by course title or teacher name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "COURSE001",
      "title": "Kỹ thuật Tàu biển Cơ bản",
      "description": "Khóa học cung cấp kiến thức cơ bản...",
      "status": "APPROVED",
      "teacherId": "uuid",
      "teacherName": "Nguyễn Văn Teacher",
      "teacherEmail": "teacher@example.com",
      "enrolledCount": 32,
      "sectionsCount": 5,
      "assignmentsCount": 10,
      "submittedAt": "2024-11-25T08:00:00Z",
      "approvedAt": "2024-11-26T09:00:00Z",
      "createdAt": "2024-11-20T10:00:00Z",
      "updatedAt": "2024-11-26T09:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 0,
    "pageSize": 10,
    "totalPages": 10,
    "totalElements": 95
  },
  "timestamp": "2024-12-01T10:50:00Z"
}
```

**Status Codes:**
- `200 OK` - Courses retrieved successfully
- `403 Forbidden` - User is not an admin

---

### 6. Approve Course

Approve a pending course.

**Endpoint:** `PATCH /admin/courses/{courseId}/approve`

**Authorization:** ADMIN role

**Path Parameters:**
- `courseId` (UUID) - ID of the course to approve

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Khóa học đã được phê duyệt thành công",
  "timestamp": "2024-12-01T11:00:00Z"
}
```

**Status Codes:**
- `200 OK` - Course approved successfully
- `400 Bad Request` - Course is not in PENDING status
- `403 Forbidden` - User is not an admin
- `404 Not Found` - Course not found

**Example:**
```bash
curl -X PATCH http://localhost:8088/api/v1/admin/courses/123e4567-e89b-12d3-a456-426614174000/approve \
  -H "Authorization: Bearer <token>"
```

---

### 7. Reject Course

Reject a pending course with a required comment.

**Endpoint:** `PATCH /admin/courses/{courseId}/reject`

**Authorization:** ADMIN role

**Path Parameters:**
- `courseId` (UUID) - ID of the course to reject

**Request Body:**
```json
{
  "reason": "Nội dung khóa học cần bổ sung thêm ví dụ thực tế và cập nhật tài liệu tham khảo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Khóa học đã bị từ chối",
  "timestamp": "2024-12-01T11:05:00Z"
}
```

**Status Codes:**
- `200 OK` - Course rejected successfully
- `400 Bad Request` - Course is not in PENDING status or comment is empty
- `403 Forbidden` - User is not an admin
- `404 Not Found` - Course not found

**Validation:**
- `reason` field is required and cannot be empty

**Example:**
```bash
curl -X PATCH http://localhost:8088/api/v1/admin/courses/123e4567-e89b-12d3-a456-426614174000/reject \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Nội dung cần bổ sung"}'
```

---

### 8. Get Course Details for Review

Get full course details including sections and lessons for admin review.

**Endpoint:** `GET /admin/courses/{courseId}/details`

**Authorization:** ADMIN role

**Path Parameters:**
- `courseId` (UUID) - ID of the course

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "COURSE001",
    "title": "Kỹ thuật Tàu biển Cơ bản",
    "description": "Khóa học cung cấp kiến thức cơ bản...",
    "status": "PENDING",
    "teacherId": "uuid",
    "teacherName": "Nguyễn Văn Teacher",
    "teacherEmail": "teacher@example.com",
    "sections": [
      {
        "id": "uuid",
        "title": "Chương 1: Giới thiệu",
        "orderIndex": 1,
        "lessons": [
          {
            "id": "uuid",
            "title": "Bài 1: Tổng quan",
            "type": "VIDEO",
            "orderIndex": 1
          }
        ]
      }
    ],
    "enrolledCount": 0,
    "sectionsCount": 5,
    "assignmentsCount": 10,
    "submittedAt": "2024-12-01T08:00:00Z",
    "createdAt": "2024-11-25T10:00:00Z",
    "updatedAt": "2024-12-01T08:00:00Z"
  },
  "timestamp": "2024-12-01T11:10:00Z"
}
```

**Status Codes:**
- `200 OK` - Course details retrieved successfully
- `403 Forbidden` - User is not an admin
- `404 Not Found` - Course not found

---

## Status Workflow

```
DRAFT ──────────────────────────────────────┐
  │                                          │
  │ submit-for-approval                      │
  ▼                                          │
PENDING ────────────────────────────────────┤
  │                                          │
  ├─── approve ──▶ APPROVED                  │
  │                    │                     │
  │                    │ edit                │
  │                    └──────────────────┐  │
  │                                       │  │
  └─── reject ───▶ REJECTED               │  │
       │                                  │  │
       │ resubmit                         │  │
       └──────────────────────────────────┴──┘
                                          │
                                          ▼
                                       PENDING
```

## Course Status Values

- `DRAFT` - Course is being created/edited by teacher
- `PENDING` - Course is waiting for admin review
- `APPROVED` - Course has been approved and is visible to students
- `REJECTED` - Course has been rejected with feedback

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message in Vietnamese",
  "error": "DETAILED_ERROR_CODE",
  "timestamp": "2024-12-01T11:15:00Z"
}
```

### Common Error Codes

- `INVALID_STATUS_TRANSITION` - Cannot perform action on course with current status
- `UNAUTHORIZED` - User does not have permission
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request validation failed
- `MISSING_REQUIRED_FIELD` - Required field is missing

---

## Testing with Postman

A Postman collection is available at: `LMS-API-Postman-Collection.json`

Import the collection and set the following environment variables:
- `base_url`: http://localhost:8088/api/v1
- `auth_token`: Your JWT token

---

## Rate Limiting

Currently no rate limiting is implemented. This may be added in future versions.

---

## Changelog

### Version 1.0.0 (2024-12-01)
- Initial release of Course Approval Workflow API
- Added teacher endpoints for submit/cancel approval
- Added admin endpoints for approve/reject courses
- Added course review status endpoint
