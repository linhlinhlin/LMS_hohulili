# 🎓 Hệ Thống LMS Hàng Hải - Maritime Learning Management System

## 📋 Tổng Quan Dự Án

**Maritime LMS** là một hệ thống quản lý học tập toàn diện được thiết kế đặc biệt cho ngành hàng hải. Hệ thống hỗ trợ đào tạo thủy thủ, nhân viên hàng hải và các khóa học chuyên ngành với đầy đủ các tính năng quản lý khóa học, bài học, tài liệu đính kèm, bài tập và báo cáo chi tiết.

### 🎯 Mục Tiêu Chính
- **Đào tạo chuyên nghiệp**: Nền tảng học tập chất lượng cao cho ngành hàng hải
- **Quản lý tập trung**: Hệ thống quản lý toàn diện cho khóa học và người dùng
- **Theo dõi tiến độ**: Giám sát và báo cáo tiến độ học tập real-time
- **Tương tác đa phương tiện**: Hỗ trợ video, PDF, documents và file đính kèm đa dạng

---

## 🏗️ Kiến Trúc Hệ Thống

### Backend (Spring Boot)
- **Framework**: Spring Boot 3.5.6
- **Java Version**: Java 21 với Virtual Threads
- **Database**: PostgreSQL 16-alpine
- **Authentication**: JWT-based stateless authentication
- **Migration**: Flyway database versioning (V1→V9)
- **API Documentation**: SpringDoc OpenAPI 2.6.0 (Swagger UI)
- **Security**: Spring Security 6.x với role-based access control
- **File Storage**: Local filesystem với cloud-ready architecture
- **Connection Pool**: HikariCP (default)

### Frontend (Angular)
- **Framework**: Angular 20.3.0 (Standalone Components)
- **Styling**: Tailwind CSS 4.1.13
- **State Management**: Angular Signals
- **Architecture**: Feature-based với lazy loading
- **SSR**: Angular Universal
- **PWA**: Service Worker enabled
- **PDF Viewer**: Advanced PDF preview với blob URL và CORS support
- **File Upload**: Multi-file upload với progress tracking
- **UI/UX**: Responsive design với collapsible forms

---

## 📱 Tính Năng Đã Hoàn Thành

### 👨‍🏫 TEACHER (Giảng Viên)

#### ✅ Quản Lý Khóa Học
- **Tạo khóa học mới**: Tạo với mã, tên, mô tả chi tiết
- **Chỉnh sửa khóa học**: Cập nhật thông tin, nội dung
- **Xuất bản khóa học**: Chuyển từ DRAFT → APPROVED
- **Xóa khóa học**: Xóa với xác nhận an toàn
- **Danh sách khóa học**: Lọc theo trạng thái, tìm kiếm

#### ✅ Quản Lý Chương Học (Section)
- **Tạo chương mới**: Thêm chương với tiêu đề và mô tả
- **Sắp xếp thứ tự**: Drag & drop hoặc số thứ tự
- **Chỉnh sửa chương**: Cập nhật thông tin
- **Xóa chương**: Xóa với xác nhận và cascade delete

#### ✅ Quản Lý Bài Học (Lesson) - **HOÀN THIỆN**
- **Thêm bài học**: Tạo với title, content, video URL
- **Upload tài liệu đa dạng**: PDF, Word, Excel, PowerPoint, Video, Audio
- **Xem trước PDF tích hợp**: Inline PDF viewer với blob URL
- **Quản lý file đính kèm**: Upload, xem, xóa, sắp xếp thứ tự
- **Giao diện thông minh**: Auto-hide video player, collapsible forms
- **Sửa nội dung**: Form edit với upload Word để replace content
- **Upload trực tiếp**: Thêm attachments ngay trong lesson viewer
- **File validation**: Kiểm tra type, size, permission

#### ✅ Hệ Thống File Đính Kèm (Attachments) - **HOÀN THIỆN**
- **Multi-file upload**: Hỗ trợ nhiều file cùng lúc
- **File type support**: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, MP4, MP3, v.v.
- **Progress tracking**: Thanh progress bar khi upload
- **Inline preview**: Xem PDF và PowerPoint trực tiếp
- **Download support**: Tải file về máy
- **Permission control**: Teacher có thể upload/delete, Student chỉ view
- **Display order**: Sắp xếp thứ tự hiển thị

### 👤 USER MANAGEMENT & AUTH

#### ✅ Authentication System
- **JWT-based authentication**: Stateless, secure token
- **Role-based access**: ADMIN, TEACHER, STUDENT
- **Login/Logout**: Đăng nhập/đăng xuất với validation
- **Password encryption**: BCrypt hashing
- **Token expiration**: Auto-logout khi hết hạn

#### ✅ User Registration & Management
- **User registration**: Đăng ký tài khoản mới
- **Profile management**: Cập nhật thông tin cá nhân
- **Role assignment**: Phân quyền user roles

### 📊 ADMIN FEATURES

#### ✅ User Management
- **Danh sách users**: Xem tất cả users trong hệ thống
- **CRUD operations**: Tạo, sửa, xóa user accounts
- **Role management**: Gán và thay đổi vai trò
- **User analytics**: Thống kê số lượng user theo role

#### ✅ Course Management (Admin)
- **Xem tất cả khóa học**: Overview toàn bộ courses
- **Approve/Reject courses**: Duyệt khóa học từ teacher
- **Course analytics**: Thống kê courses theo trạng thái
- **System settings**: Cấu hình hệ thống

### 🎓 STUDENT FEATURES

#### ✅ Course Enrollment & Learning
- **Xem khóa học**: Browse available courses
- **Enrollment**: Đăng ký học khóa học
- **Lesson viewer**: Xem bài học với video và attachments
- **Progress tracking**: Theo dõi tiến độ học tập
- **Download materials**: Tải tài liệu học tập

#### ✅ Dashboard & Profile
- **Student dashboard**: Tổng quan khóa học đã đăng ký
- **Learning progress**: Hiển thị tiến độ từng khóa học
- **Profile management**: Cập nhật thông tin cá nhân

---

## 🔴 Tính Năng Chưa Hoàn Thành

### 📝 Assignment System (Bài Tập)
- **Tạo bài tập**: Thiết lập assignment với deadline
- **Submit assignment**: Học viên nộp bài
- **Grading system**: Chấm điểm và feedback
- **Assignment analytics**: Thống kê tình trạng nộp bài

### 📊 Advanced Analytics & Reporting
- **Learning analytics**: Chi tiết tiến độ học tập
- **Performance reports**: Báo cáo hiệu suất học tập
- **Completion certificates**: Chứng chỉ hoàn thành khóa học
- **Export reports**: Xuất báo cáo Excel/PDF

### 💬 Communication Features
- **Discussion forums**: Diễn đàn thảo luận theo khóa học
- **Chat system**: Chat real-time giữa users
- **Announcements**: Thông báo từ giảng viên
- **Email notifications**: Gửi email tự động

### 🔔 Advanced Student Features
- **Calendar integration**: Lịch học và deadline
- **Note taking**: Ghi chú trong bài học
- **Bookmarks**: Đánh dấu bài học quan trọng
- **Learning path**: Lộ trình học tập được đề xuất

### 🏆 Gamification
- **Points & badges**: Điểm số và huy hiệu
- **Leaderboards**: Bảng xếp hạng
- **Achievement system**: Hệ thống thành tích
- **Progress visualization**: Biểu đồ tiến độ

### 🔐 Advanced Security
- **Two-factor authentication**: Xác thực 2 lớp
- **Session management**: Quản lý phiên đăng nhập
- **API rate limiting**: Giới hạn request rate
- **Audit logging**: Log hoạt động hệ thống

---

## 💾 Hệ Thống Lưu Trữ File Đính Kèm

### 🔄 Luồng Upload File (File Storage Flow)

#### **1. Frontend Upload Process**
```typescript
// Angular Frontend - LessonAttachmentApi
uploadFile(lessonId: string, file: File, displayOrder: number) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('displayOrder', displayOrder.toString());
  
  return this.http.post<ApiResponse<AttachmentDetail>>(
    `${this.baseUrl}/lessons/${lessonId}/attachments`, 
    formData,
    { 
      headers: { Authorization: `Bearer ${token}` },
      reportProgress: true,
      observe: 'events'
    }
  );
}
```

#### **2. Backend Processing Flow**
```java
// Controller → Service → File Storage
LessonAttachmentController.addAttachment()
  ↓
LessonAttachmentService.addAttachment()
  ↓  
FileUploadService.uploadFile()
  ↓
Physical File Storage (Local Filesystem)
```

#### **3. File Storage Structure**
```
backend-lms-postgres/
└── uploads/
    ├── documents/          # PDF, DOC, DOCX, XLS, XLSX
    │   └── 2025/
    │       └── 10/
    │           ├── uuid-filename.pdf
    │           └── uuid-filename.docx
    ├── presentations/      # PPT, PPTX
    │   └── 2025/10/
    ├── videos/            # MP4, AVI, MOV
    │   └── 2025/10/
    ├── audio/             # MP3, WAV
    │   └── 2025/10/
    └── general/           # Other files
        └── 2025/10/
```

#### **4. Database Schema (lesson_attachments)**
```sql
CREATE TABLE lesson_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,           -- UUID-generated name
    original_file_name VARCHAR(255) NOT NULL,  -- User's original filename
    file_url VARCHAR(500) NOT NULL,            -- Public access URL
    file_size BIGINT NOT NULL,                 -- File size in bytes
    content_type VARCHAR(100) NOT NULL,        -- MIME type
    file_type VARCHAR(50) NOT NULL,            -- Category: document, presentation, etc.
    display_order INTEGER NOT NULL DEFAULT 0,  -- Sort order
    uploaded_by UUID REFERENCES users(id),     -- Uploader
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **5. File Access Flow**
```
User Request → Spring Boot Controller → FileServeController
  ↓
Permission Check (Teacher/Student enrollment)
  ↓
Physical File Retrieval → Stream Response
  ↓
Frontend Blob URL → PDF Viewer/Download
```

#### **6. Security & Validation**
- **File Type Validation**: Whitelist allowed extensions
- **File Size Limits**: Max 10MB per file (configurable)
- **Permission Checks**: 
  - Teachers: Upload/Delete own course attachments
  - Students: View/Download enrolled course attachments
  - Admin: Full access
- **Unique File Names**: UUID-based để tránh conflict
- **CORS Support**: Proper headers cho cross-origin requests

#### **7. File URL Generation**
```java
// Generated URL format
String fileUrl = baseUrl + "/api/v1/files/" + subDir + "/" + fileName;
// Example: http://localhost:8088/api/v1/files/documents/2025/10/uuid-filename.pdf

// Frontend access with authentication
GET /api/v1/files/documents/2025/10/uuid-filename.pdf
Authorization: Bearer <jwt-token>
```

#### **8. Frontend PDF Viewer Integration**
```typescript
// Safe URL generation for iframe
getSafeUrl(url: string): SafeResourceUrl {
  return this.sanitizer.bypassSecurityTrustResourceUrl(url);
}

// Blob URL creation for better performance
createBlobUrl(fileUrl: string): Promise<string> {
  return fetch(fileUrl, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(response => response.blob())
  .then(blob => URL.createObjectURL(blob));
}
```

---

## 🚀 API Endpoints Summary

### **Authentication**
```
POST /api/v1/auth/login          - User login
POST /api/v1/auth/register       - User registration  
POST /api/v1/auth/logout         - User logout
GET  /api/v1/auth/me            - Get current user info
```

### **Courses Management**
```
GET    /api/v1/courses           - List courses
POST   /api/v1/courses           - Create course
PUT    /api/v1/courses/{id}      - Update course
DELETE /api/v1/courses/{id}      - Delete course
PATCH  /api/v1/courses/{id}/publish - Publish course
```

### **Sections Management**
```
GET    /api/v1/sections          - List sections by course
POST   /api/v1/sections          - Create section
PUT    /api/v1/sections/{id}     - Update section  
DELETE /api/v1/sections/{id}     - Delete section
```

### **Lessons Management**
```
GET    /api/v1/lessons           - List lessons by section
POST   /api/v1/lessons           - Create lesson
PUT    /api/v1/lessons/{id}      - Update lesson
DELETE /api/v1/lessons/{id}      - Delete lesson
```

### **File Attachments** ⭐
```
GET    /api/v1/lessons/{lessonId}/attachments     - Get lesson attachments
POST   /api/v1/lessons/{lessonId}/attachments     - Upload attachment
DELETE /api/v1/lessons/attachments/{attachmentId} - Delete attachment
PUT    /api/v1/lessons/attachments/{attachmentId} - Update attachment order
GET    /api/v1/files/{subdir}/{filename}         - Serve file with auth
```

### **User Management (Admin)**
```
GET    /api/v1/users             - List all users
POST   /api/v1/users             - Create user
PUT    /api/v1/users/{id}        - Update user
DELETE /api/v1/users/{id}        - Delete user
PATCH  /api/v1/users/{id}/role   - Change user role
```

---

## 🛠️ Setup & Installation

### **Backend Setup**
```bash
# 1. Clone repository
git clone <backend-repo-url>
cd backend-lms-postgres

# 2. Start database services
docker compose up -d

# 3. Run Spring Boot application
./mvnw spring-boot:run

# 4. Access Swagger UI
http://localhost:8088/swagger-ui/index.html
```

### **Frontend Setup**  
```bash
# 1. Clone repository
git clone <frontend-repo-url>
cd Front-end-NCKH_v2-main

# 2. Install dependencies
npm install

# 3. Start development server
npm start

# 4. Access application
http://localhost:4200
```

### **Database Access**
- **pgAdmin**: http://localhost:5050
- **Direct PostgreSQL**: localhost:5432
- **Username/Password**: Check docker-compose.yml

---

## 📈 Roadmap & Next Steps

### **Phase 1**: Assignment System (In Progress)
- Assignment creation and management
- Student submission system
- Grading and feedback system

### **Phase 2**: Advanced Analytics
- Learning progress tracking
- Performance analytics dashboard
- Completion certificates

### **Phase 3**: Communication Features
- Discussion forums
- Real-time chat system
- Email notifications

### **Phase 4**: Mobile App
- React Native mobile application
- Offline learning capabilities
- Push notifications

### **Phase 5**: Scalability & Performance
- Cloud storage integration (AWS S3)
- Redis caching
- Load balancing
- Microservices architecture

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support & Documentation

- **API Documentation**: http://localhost:8088/swagger-ui/index.html
- **GitHub Issues**: Create issues for bugs and feature requests
- **Technical Stack**: Java 21, Spring Boot 3.5.6, Angular 20.3.0, PostgreSQL 16

---

*Last updated: October 18, 2025*