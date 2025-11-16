# 🚀 TÓM TẮT API QUẢN LÝ KHÓA HỌC - ADMIN

## 📋 DANH SÁCH API

| STT | Endpoint | Method | Mô tả | Status |
|-----|----------|--------|-------|--------|
| 1 | `/api/v1/admin/courses/pending` | GET | Lấy danh sách khóa học chờ duyệt | ✅ Hoạt động |
| 2 | `/api/v1/admin/courses/{id}/approve` | PATCH | Duyệt khóa học | ✅ Hoạt động |
| 3 | `/api/v1/admin/courses/{id}/reject` | PATCH | Từ chối khóa học | ✅ Hoạt động |
| 4 | `/api/v1/admin/courses/all` | GET | Lấy tất cả khóa học (có filter) | ✅ Hoạt động |
| 5 | `/api/v1/admin/courses/{id}` | DELETE | Xóa khóa học | ⚠️ **Chưa implement** |
| 6 | `/api/v1/admin/analytics` | GET | Lấy thống kê hệ thống | ✅ Hoạt động |

---

## 🔄 FLOW QUẢN LÝ KHÓA HỌC

```
┌─────────────┐
│   TEACHER   │
└──────┬──────┘
       │ 1. Tạo khóa học
       ▼
   ┌────────┐
   │ DRAFT  │ (Nháp)
   └───┬────┘
       │ 2. Submit để duyệt
       ▼
  ┌─────────┐
  │ PENDING │ (Chờ duyệt)
  └────┬────┘
       │
       │ 3. Admin xem xét
       │
       ├──────────┬──────────┐
       │          │          │
       ▼          ▼          ▼
  ┌─────────┐ ┌──────────┐ ┌──────────┐
  │APPROVED │ │ REJECTED │ │ DELETED  │
  └─────────┘ └──────────┘ └──────────┘
   (Xuất bản)  (Từ chối)    (Xóa)
```

---

## 🎯 TRẠNG THÁI KHÓA HỌC

| Trạng thái | Mô tả | Ai có thể thay đổi |
|------------|-------|-------------------|
| `DRAFT` | Nháp, đang soạn thảo | Teacher |
| `PENDING` | Chờ admin duyệt | Teacher (submit) |
| `APPROVED` | Đã duyệt, xuất bản | Admin |
| `REJECTED` | Bị từ chối | Admin |

---

## 📝 EXAMPLES

### 1. Lấy danh sách khóa học chờ duyệt

```bash
GET /api/v1/admin/courses/pending?page=1&limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "title": "Lập trình Java cơ bản",
        "teacherName": "Nguyễn Văn A",
        "sectionsCount": 5,
        "submittedAt": "2025-11-13T10:00:00Z"
      }
    ],
    "totalElements": 10
  }
}
```

---

### 2. Duyệt khóa học

```bash
PATCH /api/v1/admin/courses/{courseId}/approve
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response:**
```json
{
  "success": true,
  "data": "Khóa học đã được duyệt"
}
```

---

### 3. Từ chối khóa học

```bash
PATCH /api/v1/admin/courses/{courseId}/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Nội dung khóa học chưa đầy đủ"
}
```

**Response:**
```json
{
  "success": true,
  "data": "Khóa học đã bị từ chối"
}
```

---

## ⚠️ VẤN ĐỀ CẦN SỬA

### 1. **Thiếu DELETE endpoint** ❌

**File:** `api/src/main/java/com/example/lms/controller/AdminController.java`

**Cần thêm:**
```java
@DeleteMapping("/courses/{courseId}")
public ResponseEntity<ApiResponse<String>> deleteCourse(@PathVariable UUID courseId) {
    try {
        adminService.deleteCourse(courseId);
        return ResponseEntity.ok(ApiResponse.success("Khóa học đã được xóa"));
    } catch (RuntimeException e) {
        return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
    }
}
```

---

### 2. **Course entity thiếu fields** ⚠️

**File:** `api/src/main/java/com/example/lms/entity/Course.java`

**Cần thêm:**
```java
private String reviewComment;      // Nhận xét của admin
private Instant reviewedAt;        // Thời gian duyệt
@ManyToOne
private User reviewedBy;           // Admin nào duyệt
```

---

### 3. **Thiếu notification** ⚠️

Khi admin duyệt/từ chối, cần:
- Gửi email cho teacher
- Tạo thông báo in-app
- Log audit trail

---

## 📂 FILES LIÊN QUAN

### Backend (Spring Boot)
```
api/src/main/java/com/example/lms/
├── controller/
│   └── AdminController.java          ✅ Có sẵn
├── service/
│   └── AdminService.java             ✅ Có sẵn
├── repository/
│   └── CourseRepository.java         ✅ Có sẵn
└── entity/
    └── Course.java                   ⚠️ Cần thêm fields
```

### Frontend (Angular)
```
fe/src/app/
├── api/endpoints/
│   └── admin.endpoints.ts            ✅ Có sẵn
├── features/admin/
│   ├── infrastructure/services/
│   │   └── admin.service.ts          ✅ Có sẵn
│   └── presentation/components/
│       └── dashboard/
│           └── admin-dashboard.component.html  ✅ Có sẵn
```

---

## 🔐 PHÂN QUYỀN

Tất cả API yêu cầu:
- ✅ Authentication: Bearer Token
- ✅ Authorization: Role `ADMIN`

```java
@PreAuthorize("hasRole('ADMIN')")
```

---

## 📊 THỐNG KÊ HIỆN TẠI

| Metric | API Endpoint |
|--------|--------------|
| Tổng khóa học | `/api/v1/admin/analytics` |
| Khóa học chờ duyệt | `/api/v1/admin/analytics` |
| Khóa học đã duyệt | `/api/v1/admin/analytics` |
| Khóa học bị từ chối | `/api/v1/admin/analytics` |

---

## ✅ CHECKLIST

- [x] API lấy khóa học chờ duyệt
- [x] API duyệt khóa học  
- [x] API từ chối khóa học
- [x] API lấy tất cả khóa học
- [x] API thống kê
- [ ] **API xóa khóa học** ← Cần implement
- [ ] **Thêm review fields vào Course entity**
- [ ] **Notification service**
- [ ] **Audit logging**

---

**📌 Kết luận:** Hệ thống đã có đầy đủ API cơ bản cho quản lý khóa học, chỉ cần bổ sung DELETE endpoint và một số tính năng phụ trợ.
