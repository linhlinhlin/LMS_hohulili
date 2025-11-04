# 🚢 Maritime Learning Management System (LMS)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.6-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Angular](https://img.shields.io/badge/Angular-20.3.0-red.svg)](https://angular.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

## 📋 Mô Tả Dự Án

**Maritime LMS** là một hệ thống quản lý học tập toàn diện được thiết kế đặc biệt cho ngành hàng hải. Hệ thống hỗ trợ đào tạo thủy thủ, nhân viên hàng hải và các khóa học chuyên ngành với đầy đủ các tính năng hiện đại.

### 🎯 Mục Tiêu Chính
- 🎓 **Đào tạo chuyên nghiệp**: Nền tảng học tập chất lượng cao
- 📊 **Quản lý tập trung**: Hệ thống quản lý toàn diện
- 📈 **Theo dõi tiến độ**: Giám sát học tập real-time
- 🎥 **Tương tác đa phương tiện**: Hỗ trợ video, PDF, documents

## 🏗️ Kiến Trúc Hệ Thống

### Backend (Spring Boot)
```
📁 backend-lms-postgres/
├── 🔧 Java 21 + Spring Boot 3.5.6
├── 🗄️ PostgreSQL 16 Database
├── 🔐 JWT Authentication
├── 📚 Flyway Migration (V1→V9)
├── 📖 Swagger API Documentation
└── 📁 File Storage System
```

### Frontend (Angular)
```
📁 Front-end-NCKH_v2-main/
├── ⚡ Angular 20.3.0 (Standalone)
├── 🎨 Tailwind CSS 4.1.13
├── 🔄 Angular Signals
├── 📱 PWA + SSR Support
├── 📄 Advanced PDF Viewer
└── 📤 Multi-file Upload
```

## 🚀 Cài Đặt Nhanh

### Yêu Cầu Hệ Thống
- **Java**: JDK 21+
- **Node.js**: 22.12.0+
- **PostgreSQL**: 16+
- **Docker**: 20.0+ (tùy chọn)

### 1️⃣ Backend Setup

```bash
cd backend-lms-postgres

# Cấu hình database trong application-dev.yml
# Chạy PostgreSQL (Docker)
docker-compose up -d

# Build và chạy Spring Boot
./mvnw spring-boot:run

# API sẽ chạy tại: http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### 2️⃣ Frontend Setup

```bash
cd Front-end-NCKH_v2-main

# Cài đặt dependencies
npm install

# Chạy development server
npm start

# Ứng dụng sẽ chạy tại: http://localhost:4200
```

### 3️⃣ Database Migration

```bash
# Migration tự động chạy khi start Spring Boot
# Hoặc chạy thủ công:
./mvnw flyway:migrate
```

## � Phân Quyền Hệ Thống

### 🎓 **STUDENT** (Học Viên)
- ✅ Đăng ký khóa học
- ✅ Xem nội dung bài học
- ✅ Xem video, tài liệu PDF
- ✅ Theo dõi tiến độ học tập
- ✅ Tải xuống tài liệu

### 👨‍🏫 **TEACHER** (Giảng Viên)
- ✅ Tạo và quản lý khóa học
- ✅ Tạo section và lesson
- ✅ Upload video, PDF, documents
- ✅ Quản lý nội dung bài học
- ✅ Theo dõi tiến độ học viên
- ✅ Xuất bản khóa học

### 👑 **ADMIN** (Quản Trị Viên)
- ✅ Quản lý toàn bộ hệ thống
- ✅ Quản lý người dùng
- ✅ Phê duyệt khóa học
- ✅ Báo cáo và thống kê
- ✅ Cấu hình hệ thống

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

---

## 🎓 STUDENT FEATURES - CHI TIẾT PHÂN TÍCH

### ✅ **ĐÃ HOÀN THIỆN**

#### 🎯 **Lesson Viewer Component** - **HOÀN THIỆN 90%**
**File**: `student-lesson-viewer.component.ts`

**Tính năng đã có:**
- ✅ **Video Playback**: Hỗ trợ YouTube embed và direct video URLs
- ✅ **Content Rendering**: HTML content với safe rendering
- ✅ **Navigation**: Previous/Next lesson buttons với logic validation
- ✅ **Progress Tracking**: Mark as completed functionality
- ✅ **Error Handling**: Comprehensive error states và retry logic
- ✅ **Responsive Design**: Mobile-first approach với Tailwind CSS
- ✅ **Loading States**: Skeleton loading và progress indicators
- ✅ **Resource Display**: Mock resources sidebar (ready for real data)

**Technical Implementation:**
```typescript
// Video URL processing
getYouTubeEmbedUrl(url: string): string {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
}

// Safe content rendering
getSafeContent(content: string): SafeResourceUrl {
  return this.sanitizer.bypassSecurityTrustHtml(content);
}
```

**Giao diện người dùng:**
- Header với lesson info và navigation
- Video player section với YouTube support
- Content area với rich text rendering
- Action buttons (Previous/Next/Mark Complete)
- Resources sidebar với file type icons
- Progress indicators và completion status

#### 🎯 **Student Layout System** - **HOÀN THIỆN**
**Files**: `student-layout.component.ts`, `student-sidebar.component.ts`

**Tính năng đã có:**
- ✅ **Responsive Layout**: Desktop sidebar + mobile overlay
- ✅ **Navigation Structure**: Clean routing với Angular Router
- ✅ **Authentication Integration**: User info display và logout
- ✅ **Mobile Optimization**: Collapsible sidebar cho mobile
- ✅ **Consistent Styling**: Tailwind CSS với design system

#### 🎯 **Enrollment Service** - **HOÀN THIỆN 80%**
**File**: `enrollment.service.ts`

**Tính năng đã có:**
- ✅ **Reactive State Management**: Signals-based state với computed properties
- ✅ **Mock Data Integration**: Development mode với realistic mock data
- ✅ **API Ready Architecture**: Prepared cho real backend integration
- ✅ **Pagination Support**: Page-based loading với metadata
- ✅ **Error Handling**: Comprehensive error states và user feedback
- ✅ **Type Safety**: Full TypeScript typing với custom interfaces

**Mock Data Structure:**
```typescript
export const MOCK_ENROLLED_COURSES = [
  {
    id: 'course-001',
    title: 'Cơ bản về Hàng hải',
    progress: 75,
    status: 'in-progress',
    instructor: 'Thầy Nguyễn Văn A',
    // ... additional fields
  }
];
```

#### 🎯 **Dashboard Components** - **HOÀN THIỆN 70%**
**Files**: `enhanced-student-dashboard.component.ts`, dashboard sub-components

**Tính năng đã có:**
- ✅ **Hero Section**: User greeting với stats display
- ✅ **Quick Actions**: Navigation buttons cho main features
- ✅ **Course Progress**: Visual progress bars và completion tracking
- ✅ **Mock Achievements**: Achievement system với badges
- ✅ **Responsive Grid**: Mobile-first layout với Tailwind
- ✅ **Loading States**: Integration với enrollment service

### ❌ **CHƯA HOÀN THIỆN - CẦN ƯU TIÊN**

#### 🚨 **Real API Integration** - **CHƯA CÓ (0%)**
**Vấn đề hiện tại:**
- Tất cả components đang dùng mock data
- Không có real backend communication
- Development mode luôn active

**Cần implement:**
```typescript
// Trong enrollment.service.ts
async loadEnrolledCourses(page: number = 1, limit: number = 10): Promise<void> {
  // PRODUCTION MODE: Use real API
  const response = await firstValueFrom(this.courseApi.enrolledCourses({ page, limit }));
  // Process real data instead of mock
}
```

#### 🚨 **Progress Tracking System** - **CHƯA CÓ (0%)**
**Thiếu:**
- Real-time progress updates
- Lesson completion persistence
- Course completion calculations
- Progress analytics và reporting

#### 🚨 **Assignment System** - **CHƯA CÓ (0%)**
**Files hiện tại:** `student-assignments-simple.component.ts` (chỉ mock UI)

**Cần implement:**
- Assignment fetching từ API
- Submission functionality
- File upload cho assignments
- Grading display
- Due date tracking

#### 🚨 **Quiz/Test System** - **CHƯA CÓ (0%)**
**Thiếu:**
- Quiz rendering
- Answer submission
- Result display
- Time tracking

#### 🚨 **Resource/Attachment Display** - **MOCK ONLY (20%)**
**Trong lesson viewer:**
```typescript
// Hiện tại chỉ có mock resources
resources: [], // Placeholder for resources
```

**Cần implement:**
- Real attachment fetching
- File type detection
- Download functionality
- Preview capabilities

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

### **Phase 1**: Student API Integration (In Progress - URGENT)
- [ ] **Real API Integration**: Replace mock data với real backend calls
- [ ] **Progress Tracking**: Implement real progress updates
- [ ] **Resource Loading**: Load real attachments và resources
- [ ] **Assignment System**: Full assignment functionality
- [ ] **Quiz System**: Quiz taking và result display

### **Phase 2**: Advanced Analytics
- [ ] **Learning analytics**: Chi tiết tiến độ học tập
- [ ] **Performance reports**: Báo cáo hiệu suất học tập
- [ ] **Completion certificates**: Chứng chỉ hoàn thành khóa học
- [ ] **Export reports**: Xuất báo cáo Excel/PDF

### **Phase 3**: Communication Features
- [ ] **Discussion forums**: Diễn đàn thảo luận theo khóa học
- [ ] **Chat system**: Chat real-time giữa users
- [ ] **Announcements**: Thông báo từ giảng viên
- [ ] **Email notifications**: Gửi email tự động

### **Phase 4**: Mobile App
- [ ] **React Native mobile application**
- [ ] **Offline learning capabilities**
- [ ] **Push notifications**

### **Phase 5**: Scalability & Performance
- [ ] **Cloud storage integration (AWS S3)**
- [ ] **Redis caching**
- [ ] **Load balancing**
- [ ] **Microservices architecture**

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

*Last updated: October 31, 2025*