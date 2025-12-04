# 📚 AI ADMIN API SPECIFICATION
**LMS Backend - AI Knowledge Management**

**Version:** 1.0  
**Date:** 05/12/2025  
**For:** Admin Users & Frontend Team

---

## 🎯 OVERVIEW

LMS Backend cung cấp Admin APIs để quản lý AI Knowledge Base và User Data. Các APIs này proxy requests đến Maritime AI Backend và handle business logic của LMS.

**Base URL:** `/api/v1/ai/admin`  
**Authentication:** JWT Token với role `ADMIN`

---

## 📡 ENDPOINTS

### 1. Upload Knowledge Document

**Endpoint:** `POST /api/v1/ai/admin/knowledge/upload`  
**Auth:** Admin only  
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | File PDF (max 50MB) |
| `category` | String | ✅ | COLREGs, SOLAS, MARPOL, etc. |

**Response (200 OK):**
```json
{
  "status": "success",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Tài liệu đã được tải lên và đang được xử lý",
  "filename": "COLREGS_2020.pdf",
  "category": "COLREGS",
  "fileSize": 2048576,
  "uploadedBy": "admin",
  "uploadedAt": "2025-12-05T10:30:00Z"
}
```

---

### 2. Check Job Status

**Endpoint:** `GET /api/v1/ai/admin/knowledge/jobs/{jobId}`  
**Auth:** Admin only

**Response (200 OK):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "nodesCreated": 45,
  "errorMessage": null,
  "filename": "COLREGS_2020.pdf",
  "category": "COLREGS"
}
```

**Status Values:** `processing`, `completed`, `failed`

---

### 3. List Documents

**Endpoint:** `GET /api/v1/ai/admin/knowledge/list`  
**Auth:** Admin only

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Trang (bắt đầu từ 1) |
| `limit` | int | 20 | Số lượng mỗi trang |

**Response (200 OK):**
```json
[
  {
    "id": "doc_123",
    "filename": "COLREGS_2020.pdf",
    "category": "COLREGS",
    "nodesCount": 45,
    "uploadedBy": "admin"
  }
]
```

---

### 4. Knowledge Stats

**Endpoint:** `GET /api/v1/ai/admin/knowledge/stats`  
**Auth:** Admin only

**Response (200 OK):**
```json
{
  "totalDocuments": 5,
  "totalNodes": 230,
  "categories": {
    "COLREGs": 120,
    "SOLAS": 80,
    "MARPOL": 30
  },
  "recentUploads": [
    {
      "id": "doc_123",
      "filename": "COLREGS_2020.pdf",
      "category": "COLREGS",
      "uploadedAt": "2025-12-05T10:30:00Z"
    }
  ]
}
```

---

### 5. Delete Document

**Endpoint:** `DELETE /api/v1/ai/admin/knowledge/{documentId}`  
**Auth:** Admin only

**Response (200 OK):**
```json
{
  "status": "success",
  "documentId": "doc_123",
  "nodesDeleted": 45,
  "message": "Đã xóa document và 45 nodes liên quan",
  "deletedBy": "admin",
  "deletedAt": "2025-12-05T10:35:00Z"
}
```

---

### 6. Delete User Chat History

**Endpoint:** `DELETE /api/v1/ai/admin/history/{userId}`  
**Auth:** Admin (can delete any) or User (can delete own)

**Response (200 OK):**
```json
{
  "status": "success",
  "userId": "student_123",
  "messagesDeleted": 15,
  "message": "Đã xóa 15 tin nhắn của user student_123",
  "deletedBy": "admin",
  "deletedAt": "2025-12-05T10:35:00Z"
}
```

---

## 🔒 SECURITY

### Role-Based Access Control

| Endpoint | Required Role | Notes |
|----------|---------------|-------|
| `POST /knowledge/upload` | `ADMIN` | Only admins can upload |
| `GET /knowledge/jobs/{id}` | `ADMIN` | Only admins can check |
| `GET /knowledge/list` | `ADMIN` | Only admins can list |
| `GET /knowledge/stats` | `ADMIN` | Only admins can view stats |
| `DELETE /knowledge/{id}` | `ADMIN` | Only admins can delete |
| `DELETE /history/{userId}` | `ADMIN` or `SELF` | Admin can delete any, users delete own |

### File Upload Security

- **File Type:** PDF only (`application/pdf`)
- **File Size:** Maximum 50MB
- **File Extension:** Must end with `.pdf`

---

## 🚨 ERROR HANDLING

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Operation completed |
| 400 | Bad Request | Invalid file format |
| 401 | Unauthorized | Missing JWT token |
| 403 | Forbidden | Not admin role |
| 404 | Not Found | Document/User not found |
| 413 | Payload Too Large | File > 50MB |
| 500 | Server Error | AI Backend error |

---

## 🔄 WORKFLOW

### Knowledge Upload Flow

```
Frontend → LMS Backend → AI Backend → Neo4j
   │           │              │           │
   │  POST     │   POST       │  Store    │
   │  /upload  │   /ingest    │  vectors  │
   │           │              │           │
   └───────────┴──────────────┴───────────┘
```

### History Delete Flow

```
Frontend → LMS Backend → AI Backend → Neo4j
   │           │              │           │
   │  DELETE   │   DELETE     │  Remove   │
   │  /history │   /history   │  nodes    │
   │           │              │           │
   └───────────┴──────────────┴───────────┘
```

---

## 🧪 TESTING

### cURL Examples

**Upload Document:**
```bash
curl -X POST http://localhost:8088/api/v1/ai/admin/knowledge/upload \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -F "file=@COLREGS_2020.pdf" \
  -F "category=COLREGS"
```

**Get Stats:**
```bash
curl -X GET http://localhost:8088/api/v1/ai/admin/knowledge/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

**Delete History:**
```bash
curl -X DELETE http://localhost:8088/api/v1/ai/admin/history/student_123 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

---

## 📋 IMPLEMENTATION STATUS

| Feature | Status | Notes |
|---------|--------|-------|
| Knowledge Upload | ✅ Implemented | Ready for testing |
| Job Status | ✅ Implemented | Ready for testing |
| List Documents | ✅ Implemented | Ready for testing |
| Knowledge Stats | ✅ Implemented | Ready for testing |
| Delete Document | ✅ Implemented | Ready for testing |
| Delete History | ✅ Implemented | Ready for testing |

---

**Document Version:** 1.0  
**Last Updated:** 05/12/2025  
**Author:** LMS Backend Team
