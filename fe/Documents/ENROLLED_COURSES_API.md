# 📚 API Lấy Khóa Học Đã Đăng Ký - Tài Liệu Chi Tiết

> Tài liệu này tổng hợp tất cả các API liên quan đến lấy thông tin khóa học mà người dùng (sinh viên) đã đăng ký trên hệ thống LMS Hàng Hải.

---

## 📋 Mục Lục
1. [Các Endpoint Chính](#các-endpoint-chính)
2. [Chi Tiết Từng API](#chi-tiết-từng-api)
3. [DTOs và Data Structures](#dtos-và-data-structures)
4. [Ví Dụ Request/Response](#ví-dụ-requestresponse)
5. [Luồng Xử Lý](#luồng-xử-lý)

---

## 🎯 Các Endpoint Chính

| STT | Endpoint | Method | Mô Tả | Quyền Truy Cập | 
|-----|----------|--------|-------|----------------|
| 1 | `/api/v1/courses/enrolled-courses` | GET | **Lấy danh sách khóa học đã đăng ký** | STUDENT |
| 2 | `/api/v1/courses` | GET | Lấy danh sách khóa học công khai + trạng thái đăng ký | PUBLIC (có auth tốt hơn) |
| 3 | `/api/v1/courses/{courseId}` | GET | Lấy chi tiết khóa học cụ thể | PUBLIC |
| 4 | `/api/v1/courses/{courseId}/content` | GET | Lấy nội dung (sections + lessons) khóa học | STUDENT/TEACHER |
| 5 | `/api/v1/courses/{courseId}/enroll` | POST | Đăng ký khóa học | STUDENT |

---

## 🔍 Chi Tiết Từng API

### 1️⃣ **Lấy Danh Sách Khóa Học Đã Đăng Ký** (⭐ ENDPOINT CHÍNH)

**Endpoint:**
```
GET /api/v1/courses/enrolled-courses
```

**Mô Tả:**
- Lấy **toàn bộ khóa học mà người dùng sinh viên đã đăng ký**
- Hỗ trợ **phân trang** (pagination)
- Trả về danh sách khóa học dưới dạng `Page<CourseSummary>`

**Yêu Cầu Xác Thực:**
- ✅ **Bắt buộc**: Bearer Token (JWT)
- ✅ **Vai trò**: STUDENT

**Query Parameters:**

| Tham Số | Kiểu | Bắt Buộc | Mô Tả | Ví Dụ |
|---------|------|---------|-------|-------|
| `page` | Integer | ❌ Không | Số trang (bắt đầu từ 1) | `page=1` |
| `limit` | Integer | ❌ Không | Số lượng item mỗi trang | `limit=10` |

**Giá Trị Mặc Định:**
- `page` = 1
- `limit` = 10

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**HTTP Status Codes:**

| Status | Nghĩa | Ghi Chú |
|--------|-------|---------|
| 200 | OK | Lấy dữ liệu thành công |
| 401 | Unauthorized | Không có token hoặc token không hợp lệ |
| 403 | Forbidden | Người dùng không có quyền (không phải STUDENT) |
| 500 | Internal Server Error | Lỗi server khi xử lý |

**Response Body (Success):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "code": "NAVI101",
        "title": "Nguyên Lý Điều Hướng Tàu",
        "description": "Khóa học cơ bản về lý thuyết điều hướng và định vị tàu biển",
        "status": "APPROVED",
        "teacherName": "TS. Nguyễn Văn A",
        "enrolledCount": 45,
        "createdAt": "2025-01-15T08:30:00Z",
        "enrolled": true
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "code": "ENG201",
        "title": "Tiếng Anh Hàng Hải",
        "description": "Tiếng Anh chuyên ngành cho ngành Hàng Hải",
        "status": "APPROVED",
        "teacherName": "ThS. Trần Thị B",
        "enrolledCount": 32,
        "createdAt": "2025-02-01T10:15:00Z",
        "enrolled": true
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10,
      "sort": {
        "empty": true,
        "sorted": false,
        "unsorted": true
      },
      "offset": 0,
      "paged": true,
      "unpaged": false
    },
    "last": true,
    "totalElements": 2,
    "totalPages": 1,
    "size": 10,
    "number": 0,
    "sort": {
      "empty": true,
      "sorted": false,
      "unsorted": true
    },
    "first": true,
    "numberOfElements": 2,
    "empty": false
  },
  "message": "Success"
}
```

**Response Body (Error):**
```json
{
  "success": false,
  "error": "Lỗi khi lấy danh sách khóa học đã đăng ký: Database connection error",
  "message": "Error"
}
```

---

### 2️⃣ **Lấy Danh Sách Khóa Học Công Khai** (Với Trạng Thái Enrollment)

**Endpoint:**
```
GET /api/v1/courses
```

**Mô Tả:**
- Lấy **danh sách khóa học đã được duyệt (APPROVED)**
- Nếu sinh viên đã xác thực, sẽ thấy trạng thái đăng ký (`enrolled: true/false/null`)
- Hỗ trợ **tìm kiếm theo tên khóa học**
- Hỗ trợ **lọc theo giảng viên**

**Yêu Cầu Xác Thực:**
- ⚠️ **Tùy chọn**: Bearer Token (JWT) - tăng thêm thông tin nếu có

**Query Parameters:**

| Tham Số | Kiểu | Bắt Buộc | Mô Tả | Ví Dụ |
|---------|------|---------|-------|-------|
| `page` | Integer | ❌ Không | Số trang (bắt đầu từ 1) | `page=1` |
| `limit` | Integer | ❌ Không | Số lượng item mỗi trang | `limit=10` |
| `search` | String | ❌ Không | Tìm kiếm theo tên khóa học | `search=Hàng Hải` |
| `teacher` | String | ❌ Không | Lọc theo tên giảng viên | `teacher=Nguyễn` |

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>  (Optional)
Content-Type: application/json
```

**Response Body (Success):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "code": "NAVI101",
        "title": "Nguyên Lý Điều Hướng Tàu",
        "description": "Khóa học cơ bản...",
        "status": "APPROVED",
        "teacherName": "TS. Nguyễn Văn A",
        "enrolledCount": 45,
        "createdAt": "2025-01-15T08:30:00Z",
        "enrolled": true
      }
    ],
    "totalPages": 5,
    "totalElements": 48,
    "size": 10,
    "number": 0,
    "first": true,
    "last": false,
    "empty": false
  },
  "message": "Success"
}
```

---

### 3️⃣ **Lấy Chi Tiết Khóa Học**

**Endpoint:**
```
GET /api/v1/courses/{courseId}
```

**Path Parameters:**

| Tham Số | Kiểu | Mô Tả | Ví Dụ |
|---------|------|-------|-------|
| `courseId` | UUID | ID của khóa học | `550e8400-e29b-41d4-a716-446655440000` |

**Mô Tả:**
- Lấy **thông tin chi tiết của một khóa học**
- Bao gồm số lượng chương (sections), số sinh viên đã đăng ký, thông tin giảng viên

**Headers:**
```http
Content-Type: application/json
```

**Response Body (Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "NAVI101",
    "title": "Nguyên Lý Điều Hướng Tàu",
    "description": "Khóa học cơ bản về lý thuyết điều hướng và định vị tàu biển",
    "status": "APPROVED",
    "teacherId": "770e8400-e29b-41d4-a716-446655440002",
    "teacherName": "TS. Nguyễn Văn A",
    "enrolledCount": 45,
    "sectionsCount": 8,
    "createdAt": "2025-01-15T08:30:00Z",
    "updatedAt": "2025-02-10T14:20:00Z"
  },
  "message": "Success"
}
```

---

### 4️⃣ **Lấy Nội Dung Khóa Học (Sections + Lessons)**

**Endpoint:**
```
GET /api/v1/courses/{courseId}/content
```

**Path Parameters:**

| Tham Số | Kiểu | Mô Tả |
|---------|------|-------|
| `courseId` | UUID | ID của khóa học |

**Mô Tả:**
- Lấy **toàn bộ nội dung của khóa học** (tất cả chương và bài học)
- **Chỉ cho phép** sinh viên đã đăng ký hoặc giảng viên chủ sở hữu
- Danh sách chương được **sắp xếp theo thứ tự** (orderIndex)

**Yêu Cầu Xác Thực:**
- ✅ **Bắt buộc**: Bearer Token (JWT)
- ✅ **Vai trò**: STUDENT (nếu đã đăng ký) hoặc TEACHER (chủ sở hữu)

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Response Body (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440010",
      "title": "Chương 1: Kiến Thức Cơ Bản",
      "description": "Giới thiệu các khái niệm cơ bản về điều hướng",
      "orderIndex": 1,
      "lessons": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440020",
          "title": "Bài 1.1: Khái Niệm Tọa Độ",
          "description": "Hệ tọa độ địa lý và hệ tọa độ tương đối",
          "orderIndex": 1
        },
        {
          "id": "990e8400-e29b-41d4-a716-446655440021",
          "title": "Bài 1.2: Đơn Vị Đo Lường",
          "description": "Các đơn vị đo khoảng cách và góc trong điều hướng",
          "orderIndex": 2
        }
      ]
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440011",
      "title": "Chương 2: Công Cụ Định Vị",
      "description": "Các công cụ và phương pháp định vị hiện đại",
      "orderIndex": 2,
      "lessons": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440030",
          "title": "Bài 2.1: GPS",
          "description": "Hệ thống định vị toàn cầu",
          "orderIndex": 1
        }
      ]
    }
  ],
  "message": "Success"
}
```

**Response Body (Error - Không có quyền truy cập):**
```json
{
  "success": false,
  "error": "Bạn không có quyền truy cập nội dung khóa học này",
  "message": "Error"
}
```

---

### 5️⃣ **Đăng Ký Khóa Học**

**Endpoint:**
```
POST /api/v1/courses/{courseId}/enroll
```

**Path Parameters:**

| Tham Số | Kiểu | Mô Tả |
|---------|------|-------|
| `courseId` | UUID | ID của khóa học |

**Mô Tả:**
- Sinh viên **đăng ký vào một khóa học**
- Khóa học phải ở trạng thái **APPROVED**
- Sinh viên **không thể đăng ký lại nếu đã đăng ký**

**Yêu Cầu Xác Thực:**
- ✅ **Bắt buộc**: Bearer Token (JWT)
- ✅ **Vai trò**: STUDENT

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```
(No body - empty POST)
```

**Response Body (Success):**
```json
{
  "message": "Đăng ký thành công!"
}
```

**Response Body (Error - Đã đăng ký):**
```json
{
  "message": "Bạn đã đăng ký khóa học này rồi"
}
```

---

## 📦 DTOs và Data Structures

### **CourseSummary** (Dùng trong danh sách)

Cấu trúc dữ liệu trả về khi lấy danh sách khóa học:

```java
{
  "id": UUID,                    // ID của khóa học
  "code": String,               // Mã khóa học (VD: NAVI101)
  "title": String,              // Tên khóa học
  "description": String,        // Mô tả khóa học
  "status": String,             // Trạng thái (APPROVED, DRAFT, ARCHIVED)
  "teacherName": String,        // Tên giảng viên
  "enrolledCount": Integer,     // Số sinh viên đã đăng ký
  "createdAt": Instant,         // Thời gian tạo (ISO 8601)
  "enrolled": Boolean|Null      // Trạng thái đăng ký của người dùng
                                // true = đã đăng ký
                                // false = chưa đăng ký
                                // null = không xác thực
}
```

### **CourseDetail** (Dùng khi lấy chi tiết)

```java
{
  "id": UUID,                    // ID của khóa học
  "code": String,               // Mã khóa học
  "title": String,              // Tên khóa học
  "description": String,        // Mô tả chi tiết
  "status": String,             // Trạng thái
  "teacherId": UUID,            // ID giảng viên
  "teacherName": String,        // Tên giảng viên
  "enrolledCount": Integer,     // Số sinh viên đã đăng ký
  "sectionsCount": Integer,     // Số chương/sections
  "createdAt": Instant,         // Thời gian tạo
  "updatedAt": Instant          // Thời gian cập nhật
}
```

### **SectionWithLessons** (Nội dung khóa học)

```java
{
  "id": UUID,                    // ID chương
  "title": String,              // Tên chương
  "description": String,        // Mô tả chương
  "orderIndex": Integer,        // Thứ tự sắp xếp
  "lessons": [                  // Danh sách bài học
    {
      "id": UUID,
      "title": String,
      "description": String,
      "orderIndex": Integer
    }
  ]
}
```

### **ApiResponse<T>** (Wrapper chung cho tất cả responses)

```java
{
  "success": Boolean,           // true = thành công, false = lỗi
  "data": T,                    // Dữ liệu trả về (generic type)
  "error": String,              // Thông báo lỗi (nếu có)
  "message": String             // Thông báo chung (Success/Error)
}
```

---

## 💡 Ví Dụ Request/Response

### **Kịch Bản 1: Sinh Viên Lấy Danh Sách Khóa Học Đã Đăng Ký**

**cURL Command:**
```bash
curl -X GET "http://localhost:8088/api/v1/courses/enrolled-courses?page=1&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**JavaScript (Fetch API):**
```javascript
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const page = 1;
const limit = 5;

fetch(`http://localhost:8088/api/v1/courses/enrolled-courses?page=${page}&limit=${limit}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Danh sách khóa học:', data.data.content);
})
.catch(error => console.error('Lỗi:', error));
```

**TypeScript (Axios):**
```typescript
import axios from 'axios';

const getEnrolledCourses = async (token: string, page: number = 1, limit: number = 10) => {
  try {
    const response = await axios.get(
      `http://localhost:8088/api/v1/courses/enrolled-courses`,
      {
        params: { page, limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data.content; // Trả về danh sách khóa học
  } catch (error) {
    console.error('Lỗi khi lấy khóa học:', error);
    throw error;
  }
};
```

---

### **Kịch Bản 2: Lấy Nội Dung Chi Tiết Của Một Khóa Học**

**cURL Command:**
```bash
curl -X GET "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/content" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**JavaScript:**
```javascript
const courseId = "550e8400-e29b-41d4-a716-446655440000";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

fetch(`http://localhost:8088/api/v1/courses/${courseId}/content`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Nội dung khóa học:', data.data);
  // data.data là mảng các Section có chứa Lessons
})
.catch(error => console.error('Lỗi:', error));
```

---

### **Kịch Bản 3: Đăng Ký Khóa Học**

**cURL Command:**
```bash
curl -X POST "http://localhost:8088/api/v1/courses/550e8400-e29b-41d4-a716-446655440000/enroll" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**JavaScript:**
```javascript
const courseId = "550e8400-e29b-41d4-a716-446655440000";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

fetch(`http://localhost:8088/api/v1/courses/${courseId}/enroll`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Kết quả:', data.message); // "Đăng ký thành công!"
})
.catch(error => console.error('Lỗi:', error));
```

---

## 🔄 Luồng Xử Lý

### **Luồng Lấy Khóa Học Đã Đăng Ký (Workflow)**

```
┌─────────────────────────────────────┐
│  Frontend Request                   │
│  GET /api/v1/courses/enrolled-courses
│  Headers: Authorization Bearer ...  │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Spring Security Filter           │
│ - Kiểm tra JWT Token            │
│ - Lấy User từ Token             │
│ - Kiểm tra Role (STUDENT)       │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ CourseController                │
│ getEnrolledCourses()            │
│ - PageRequest(page-1, limit)   │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ CourseService                   │
│ getEnrolledCourses()            │
│ - Query: findByEnrolledStudents │
│          (user, pageable)       │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ CourseRepository (JPA)          │
│ findByEnrolledStudentsContaining│
│ - Execute SQL Query             │
│ - Return Page<Course>           │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Convert to CourseSummary        │
│ - Map fields                    │
│ - Set enrollment status         │
│ - Return Page<CourseSummary>   │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Wrap in ApiResponse<Page>       │
│ - success: true                 │
│ - data: Page<CourseSummary>    │
│ - message: "Success"            │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ HTTP 200 OK                     │
│ Content-Type: application/json  │
│ Body: ApiResponse JSON          │
└──────────────────────────────────┘
```

---

### **Luồng Xử Lý Lỗi**

```
┌─────────────────────────────┐
│ Request đến API            │
└────────────┬────────────────┘
             │
             ▼
        ┌─────────┐
        │ Hợp Lệ? │
        └────┬────┘
        ▼    │    ▼
      YES   │   NO
       │    │    │
       │    │    └─────────────┐
       │    │                  ▼
       │    │          ┌──────────────────┐
       │    │          │ HTTP 401         │
       │    │          │ Unauthorized     │
       │    │          │ (No Token)       │
       │    │          └──────────────────┘
       │    │
       ▼    │
   ┌─────────────┐
   │ Check Role? │
   └────┬────────┘
        ▼        │
     STUDENT?   │
       │        │
      YES      NO
       │        │
       │        ▼
       │   ┌──────────────────┐
       │   │ HTTP 403         │
       │   │ Forbidden        │
       │   │ (Not STUDENT)    │
       │   └──────────────────┘
       │
       ▼
   ┌──────────────────────────┐
   │ Execute Query            │
   │ findByEnrolledStudents   │
   └────────┬─────────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
  SUCCESS      DB ERROR
     │             │
     │             ▼
     │      ┌──────────────────┐
     │      │ HTTP 500         │
     │      │ Server Error     │
     │      │ Message: error   │
     │      └──────────────────┘
     │
     ▼
 ┌──────────────────────┐
 │ HTTP 200             │
 │ Return Page<Course>  │
 └──────────────────────┘
```

---

## 🔐 Bảo Mật và Xác Thực

### **JWT Token Format**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### **Token Payload (Example)**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User ID
  "username": "student001",
  "email": "student@example.com",
  "role": "STUDENT",
  "iat": 1704067200,                              // Issued At
  "exp": 1704153600                               // Expiration
}
```

### **Các Lỗi Xác Thực Phổ Biến**

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| `401 Unauthorized` | Token không tồn tại | Gửi kèm token hợp lệ |
| `401 Unauthorized` | Token hết hạn | Refresh token hoặc đăng nhập lại |
| `401 Unauthorized` | Token không hợp lệ | Kiểm tra format token |
| `403 Forbidden` | Người dùng không có quyền | Đảm bảo role là STUDENT |

---

## 📊 Thống Kê và Phân Tích

### **Các Trường Hữu Ích cho Frontend**

**Từ CourseSummary:**
- `enrolled`: Boolean - Dùng để xác định hiển thị nút "Đăng ký" hay "Vào học"
- `enrolledCount`: Integer - Hiển thị số lượng sinh viên
- `status`: String - Kiểm tra khóa học có khả dụng không

**Từ SectionWithLessons:**
- `orderIndex`: Integer - Sắp xếp chương theo thứ tự
- `lessons`: Array - Tính toán progress của sinh viên

---

## 🚀 Best Practices for Frontend Implementation

### ✅ **Nên Làm**
1. ✅ **Luôn cache dữ liệu** khi lấy danh sách khóa học
2. ✅ **Implement pagination** để tránh load toàn bộ dữ liệu
3. ✅ **Kiểm tra `enrolled` field** trước khi render UI
4. ✅ **Handle lỗi 401/403** bằng cách redirect đến login
5. ✅ **Refresh token** trước khi hết hạn

### ❌ **Không Nên Làm**
1. ❌ **Không lưu token** vào localStorage (nên dùng httpOnly cookie)
2. ❌ **Không gọi API** quá sớm khi component mount
3. ❌ **Không làm request** mà không xử lý error
4. ❌ **Không để page load vô hạn** nếu API bị hang

---

## 🔗 Tài Liệu Liên Quan

- [📘 README Dự Án](./README.md)
- [🗄️ Database Schema](./DATABASE_SCHEMA.md)
- [🔐 Authentication API](./AUTH_API.md)
- [📝 Assignment API](./ASSIGNMENT_API.md)

---

**Cập nhật lần cuối:** 11/11/2025  
**Phiên bản:** 1.0  
**Tác giả:** LMS Development Team
