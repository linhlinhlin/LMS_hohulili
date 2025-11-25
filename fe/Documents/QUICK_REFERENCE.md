# 🎯 Quick Reference - API Lấy Khóa Học Đã Đăng Ký

**Để lấy danh sách khóa học mà sinh viên đã đăng ký:**

## 🌟 Endpoint Chính

```http
GET /api/v1/courses/enrolled-courses?page=1&limit=10
Authorization: Bearer <JWT_TOKEN>
```

---

## 📋 Query Parameters (Tùy Chọn)

| Tham Số | Giá Trị Mặc Định | Mô Tả |
|---------|-----------------|-------|
| `page` | 1 | Số trang (bắt đầu từ 1) |
| `limit` | 10 | Số item mỗi trang |

---

## ✅ Response Success (HTTP 200)

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
    "totalElements": 5,
    "totalPages": 1,
    "number": 0,
    "size": 10
  },
  "message": "Success"
}
```

---

## ❌ Common Errors

| Error | Nguyên Nhân | Giải Pháp |
|-------|-----------|----------|
| `401 Unauthorized` | Không có token hoặc token hết hạn | Gửi Bearer token hợp lệ |
| `403 Forbidden` | Người dùng không phải STUDENT | Đăng nhập bằng tài khoản sinh viên |
| `500 Internal Server Error` | Lỗi server | Thử lại sau hoặc kiểm tra logs |

---

## 💻 Code Examples

### JavaScript (Fetch)
```javascript
const enrolledCourses = await fetch(
  'http://localhost:8088/api/v1/courses/enrolled-courses?page=1&limit=10',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
).then(r => r.json());

console.log(enrolledCourses.data.content);
```

### React Hook
```jsx
import { useEffect, useState } from 'react';

function EnrolledCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/v1/courses/enrolled-courses', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setCourses(data.data.content))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Đang tải...</div>;
  
  return (
    <div>
      {courses.map(course => (
        <div key={course.id}>
          <h3>{course.title}</h3>
          <p>{course.description}</p>
          <p>Giáo viên: {course.teacherName}</p>
        </div>
      ))}
    </div>
  );
}
```

### Python (Requests)
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'http://localhost:8088/api/v1/courses/enrolled-courses',
    params={'page': 1, 'limit': 10},
    headers=headers
)

courses = response.json()['data']['content']
for course in courses:
    print(f"{course['title']} - {course['teacherName']}")
```

---

## 🔧 Các API Liên Quan

| Endpoint | Method | Mô Tả |
|----------|--------|-------|
| `/api/v1/courses` | GET | Danh sách khóa học công khai |
| `/api/v1/courses/{id}` | GET | Chi tiết khóa học |
| `/api/v1/courses/{id}/content` | GET | Nội dung (sections + lessons) |
| `/api/v1/courses/{id}/enroll` | POST | Đăng ký khóa học |

---

## 📱 Response Fields

```javascript
{
  // ID và mã khóa học
  "id": UUID,                    
  "code": "NAVI101",             

  // Thông tin cơ bản
  "title": "Nguyên Lý Điều Hướng",
  "description": "Mô tả...",
  
  // Trạng thái
  "status": "APPROVED",          // APPROVED, DRAFT, ARCHIVED
  "enrolled": true,              // Sinh viên đã đăng ký?
  
  // Giáo viên
  "teacherName": "TS. Nguyễn Văn A",
  
  // Thống kê
  "enrolledCount": 45,           // Số sinh viên
  
  // Thời gian
  "createdAt": "2025-01-15T08:30:00Z"
}
```

---

## 🔐 JWT Token

Lấy token khi đăng nhập:
```json
POST /api/v1/auth/login
{
  "username": "student001",
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

**📌 Dùng token này trong header `Authorization: Bearer <token>` cho tất cả request**

**Thời hạn token:** 24 giờ (có thể refresh trước khi hết hạn)

---

*Xem chi tiết tại: [ENROLLED_COURSES_API.md](./ENROLLED_COURSES_API.md)*
