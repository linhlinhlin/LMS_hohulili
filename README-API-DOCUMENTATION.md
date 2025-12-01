# 📚 LMS Backend API Documentation - Complete Guide

> **Tài liệu API đầy đủ cho Frontend Admin**  
> **Generated**: December 1, 2025  
> **Backend Version**: v1.0.0  
> **Status**: ✅ Ready for Integration

---

## 📖 Tổng quan

Đây là bộ tài liệu API đầy đủ cho hệ thống LMS Backend, được tạo ra để hỗ trợ Frontend Admin team tích hợp các chức năng quản lý khóa học và người dùng.

### 🎯 Mục đích
- Cung cấp tài liệu API chi tiết, đầy đủ
- Hướng dẫn request/response format
- Liệt kê các API còn thiếu và đề xuất
- Hỗ trợ Frontend team implement nhanh chóng

### 🛠️ Tech Stack Backend
- **Framework**: Spring Boot 3.5.6
- **Language**: Java 21 (Virtual Threads)
- **Database**: PostgreSQL 16 (Supabase)
- **ORM**: Spring Data JPA + Hibernate 6.6.29
- **Authentication**: JWT (24h expiry)
- **Security**: Spring Security 6.x + BCrypt
- **Documentation**: SpringDoc OpenAPI 2.6.0

### 🔗 URLs
- **Base API URL**: `http://localhost:8088/api/v1`
- **Swagger UI**: `http://localhost:8088/swagger-ui/index.html`
- **API Docs JSON**: `http://localhost:8088/v3/api-docs`

---

## 📁 Cấu trúc tài liệu

### 1. **summary.txt** ⭐ START HERE
- Tổng quan hệ thống
- Danh sách tất cả endpoints (28 APIs)
- Files chính chứa logic
- Missing APIs summary
- Quick reference

### 2. **api-endpoints-quick-reference.md** 📋 QUICK LOOKUP
- Bảng tra cứu nhanh tất cả endpoints
- Organized by category
- Request/Response examples
- Error codes reference
- Standard response formats

### 3. **admin-course-apis-detailed.md** 📚 COURSE MANAGEMENT
Chi tiết 6 APIs quản lý khóa học (Admin):
- GET /admin/courses/all - Tất cả khóa học
- GET /admin/courses/pending - Khóa học chờ duyệt
- PATCH /admin/courses/{id}/approve - Duyệt khóa học
- PATCH /admin/courses/{id}/reject - Từ chối khóa học
- DELETE /admin/courses/{id} - Xóa khóa học
- GET /admin/analytics - Thống kê hệ thống

### 4. **admin-user-management-apis.md** 👥 USER MANAGEMENT
Chi tiết 7 APIs quản lý người dùng (Admin):
- GET /users - Danh sách người dùng (paginated)
- GET /users/list/all - Tất cả người dùng (no pagination)
- GET /users/{id} - Chi tiết người dùng
- POST /users - Tạo người dùng mới
- PUT /users/{id} - Cập nhật người dùng
- DELETE /users/{id} - Vô hiệu hóa người dùng
- PATCH /users/{id}/toggle-status - Bật/tắt trạng thái

### 5. **enrollment-management-apis.md** 🎓 ENROLLMENT
Chi tiết 6 APIs quản lý đăng ký:
- POST /courses/{id}/enrollments - Gán học viên (by email)
- POST /courses/{id}/bulk-enroll - Gán nhiều học viên (Excel)
- GET /courses/{id}/students - Danh sách học viên đã đăng ký
- GET /courses/{id}/available-students - Học viên chưa đăng ký
- POST /courses/{id}/enroll - Học viên tự đăng ký
- GET /courses/enrolled-courses - Khóa học đã đăng ký (student)

### 6. **data-models-and-recommendations.md** 🎯 MODELS & MISSING APIs
- TypeScript data models
- 11 Missing/Recommended APIs
- Database schema improvements
- Frontend implementation notes
- Implementation priority roadmap

### 7. **apis-courses-admin.md** 📖 DETAILED REFERENCE
- Tài liệu chi tiết với database schema
- Course status flow
- User roles & permissions
- Comprehensive examples

---

## 🚀 Quick Start Guide

### Bước 1: Đọc Summary
```bash
# Đọc file này trước để có overview
cat summary.txt
```

### Bước 2: Test API với Swagger
1. Mở browser: `http://localhost:8088/swagger-ui/index.html`
2. Click "Authorize" button
3. Login để lấy JWT token:
   ```json
   POST /api/v1/auth/login
   {
     "email": "admin@example.com",
     "password": "password123"
   }
   ```
4. Copy token và paste vào Authorize dialog
5. Test các API endpoints

### Bước 3: Implement trong Angular

#### 3.1. Tạo API Service
```typescript
// src/app/api/admin-course.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminCourseService {
  private baseUrl = 'http://localhost:8088/api/v1';

  constructor(private http: HttpClient) {}

  getAllCourses(page: number = 1, limit: number = 10, status?: string, search?: string) {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);

    return this.http.get(`${this.baseUrl}/admin/courses/all`, { params });
  }

  approveCourse(courseId: string) {
    return this.http.patch(`${this.baseUrl}/admin/courses/${courseId}/approve`, {});
  }

  rejectCourse(courseId: string, reason: string) {
    return this.http.patch(`${this.baseUrl}/admin/courses/${courseId}/reject`, { reason });
  }
}
```

#### 3.2. Tạo Auth Interceptor
```typescript
// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }
}
```

#### 3.3. Sử dụng trong Component
```typescript
// src/app/admin/courses/course-list.component.ts
export class CourseListComponent implements OnInit {
  courses: Course[] = [];
  totalPages: number = 0;
  currentPage: number = 1;

  constructor(private courseService: AdminCourseService) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.courseService.getAllCourses(this.currentPage, 20, 'APPROVED')
      .subscribe({
        next: (response: any) => {
          this.courses = response.data.content;
          this.totalPages = response.data.totalPages;
        },
        error: (error) => {
          console.error('Error loading courses:', error);
        }
      });
  }

  approveCourse(courseId: string) {
    this.courseService.approveCourse(courseId)
      .subscribe({
        next: () => {
          alert('Khóa học đã được duyệt');
          this.loadCourses();
        },
        error: (error) => {
          alert('Lỗi: ' + error.error.message);
        }
      });
  }
}
```

---

## 📊 API Statistics

### Tổng số APIs: 28 endpoints

#### By Category:
- 🔐 Authentication: 4 APIs
- 📚 Course Management: 12 APIs
- 👥 User Management: 7 APIs
- 👨‍💼 Admin Operations: 5 APIs

#### By Role:
- Public: 2 APIs (login, register)
- STUDENT: 3 APIs
- TEACHER: 9 APIs
- ADMIN: 14 APIs

#### By Method:
- GET: 16 APIs
- POST: 7 APIs
- PUT: 2 APIs
- PATCH: 4 APIs
- DELETE: 2 APIs

---

## ⚠️ Important Notes

### 1. Authentication
- Tất cả API (trừ login/register) cần JWT token
- Token expires sau 24 giờ
- Refresh token expires sau 7 ngày
- Header format: `Authorization: Bearer <token>`

### 2. Pagination
- Page numbers bắt đầu từ 1 (không phải 0)
- Default page size: 10
- Max page size: 100
- Response format: Spring Data Page object

### 3. Error Handling
- 400: Bad Request (validation error)
- 401: Unauthorized (token missing/invalid)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

### 4. Response Format
```json
{
  "success": true/false,
  "data": { ... },
  "message": "Optional message"
}
```

### 5. Course Status Values
- `DRAFT`: Đang soạn thảo
- `PENDING`: Chờ admin duyệt
- `APPROVED`: Đã duyệt, hiển thị công khai
- `REJECTED`: Bị từ chối

### 6. User Roles
- `ADMIN`: Toàn quyền hệ thống
- `TEACHER`: Quản lý khóa học của mình
- `STUDENT`: Đăng ký và học

---

## 🎯 Missing APIs (Cần implement)

### Priority 1 - Critical
1. ❌ DELETE /admin/courses/{id}/enrollments/{studentId}
2. ❌ GET /admin/courses/{id}/enrollments (with metadata)
3. ❌ PATCH /admin/courses/{id}/status (direct status change)

### Priority 2 - Important
4. ❌ GET /admin/courses/search (advanced search)
5. ❌ GET /admin/users/{id}/enrollments
6. ❌ POST /admin/courses/{id}/bulk-unenroll

### Priority 3 - Nice to Have
7. ❌ GET /admin/enrollments/stats
8. ❌ GET /admin/courses/{id}/report
9. ❌ POST /admin/users/bulk-create
10. ❌ GET /admin/users/{id}/activity
11. ❌ POST /admin/courses/bulk-status-change

Chi tiết xem file: `data-models-and-recommendations.md`

---

## 📞 Support & Contact

### Backend Team
- **Repository**: `api/src/main/java/com/example/lms/`
- **Swagger UI**: http://localhost:8088/swagger-ui/index.html
- **Database**: PostgreSQL on Supabase

### Frontend Team
- **Admin Dashboard**: http://localhost:4200/admin
- **Angular Version**: 20.3.1

### Báo lỗi hoặc yêu cầu API mới
1. Kiểm tra Swagger UI trước
2. Xem file `data-models-and-recommendations.md`
3. Liên hệ Backend team với:
   - Endpoint cần thiết
   - Request/Response format mong muốn
   - Use case cụ thể

---

## 🔄 Changelog

### v1.0.0 (2025-12-01)
- ✅ Initial API documentation
- ✅ 28 endpoints documented
- ✅ Data models defined
- ✅ 11 missing APIs identified
- ✅ Frontend integration guide
- ✅ Swagger UI available

---

## 📚 Additional Resources

### Backend Documentation
- README.md - Backend project overview
- Swagger UI - Interactive API testing
- Database migrations - `api/src/main/resources/db/migration/`

### Frontend Resources
- Angular Services - `fe/src/app/api/`
- Admin Components - `fe/src/app/features/admin/`
- API Client - `fe/src/app/api/client/api-client.ts`

---

## ✅ Checklist for Frontend Integration

- [ ] Đọc summary.txt
- [ ] Test APIs qua Swagger UI
- [ ] Tạo TypeScript interfaces từ data models
- [ ] Implement API services
- [ ] Setup Auth interceptor
- [ ] Handle error responses
- [ ] Implement pagination
- [ ] Test với real data
- [ ] Báo cáo missing APIs nếu cần
- [ ] Document FE implementation

---

**🎉 Happy Coding!**

Nếu có câu hỏi hoặc cần hỗ trợ, vui lòng liên hệ Backend team hoặc tham khảo Swagger UI.

---

**Generated by**: Kiro AI Assistant  
**Date**: December 1, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
