# 🎓 Maritime LMS Backend System

Hệ thống Learning Management System (LMS) dành cho ngành Hàng hải, được xây dựng với Spring Boot và PostgreSQL. Hệ thống cung cấp đầy đủ các tính năng quản lý khóa học, bài tập, người dùng và báo cáo thống kê.

## 🛠️ Tech Stack

### **Backend Framework**
- **Java 21** - Programming language với Virtual Threads
- **Spring Boot 3.5.6** - Main application framework
- **Spring Security 6.x** - Authentication & Authorization
- **Spring Data JPA** - Data access layer với Hibernate 6.6.29
- **Spring Validation** - Request validation

### **Database & Migration**
- **PostgreSQL 16-alpine** - Primary database
- **Flyway 10.x** - Database versioning và migration (V1→V6)
- **HikariCP** - Connection pooling (default)

### **Security & Authentication**  
- **JWT (jsonwebtoken 0.12.3)** - Stateless authentication
- **BCrypt** - Password hashing
- **Role-based Access Control** - ADMIN/TEACHER/STUDENT

### **Documentation & Development**
- **SpringDoc OpenAPI 2.6.0** - API documentation (Swagger UI)
- **Docker Compose** - Development environment
- **pgAdmin 4** - Database administration
- **Maven 3.x** - Build and dependency management
- **Lombok** - Code generation

## 🚀 Hướng dẫn khởi động nhanh / Quick Start

### **Yêu cầu hệ thống / System Requirements**
- **Java 21** (JDK 21 với Virtual Threads support)
- **Maven 3.6+** 
- **Docker & Docker Compose**
- **Git** (để quản lý phiên bản / for version control)

### **Thiết lập môi trường phát triển / Development Setup**
```powershell
# 1. Clone repository / Tải mã nguồn
git clone https://github.com/linhlinh0222/backend-lms-postgres.git
cd backend-lms-postgres

# 2. Khởi động database services (PostgreSQL + pgAdmin)
docker compose up -d

# 3. Đợi database sẵn sàng (kiểm tra health)
docker compose ps

# 4. Build và chạy ứng dụng
mvn clean package
mvn spring-boot:run

# Tùy chọn: Chạy với profile cụ thể
mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
```

### **Thiết lập lần đầu / First Time Setup**
```powershell
# Kiểm tra migration chạy thành công
curl http://localhost:8088/api/v1/health

# Truy cập Swagger UI để test API
# Mở trình duyệt: http://localhost:8088/swagger-ui
```

## 🔗 Điểm truy cập dịch vụ / Service Endpoints

### **Các URL ứng dụng / Application URLs**
- **API Base URL**: http://localhost:8088/api/v1
- **Swagger UI**: http://localhost:8088/swagger-ui/index.html
- **Health Check**: http://localhost:8088/api/v1/health
- **pgAdmin**: http://localhost:8081
  - **Email**: `admin@devmail.net`
  - **Mật khẩu / Password**: `S3cure!Passw0rd`

## 📚 Tài liệu API đầy đủ / Complete API Documentation

### **🔐 Xác thực & Quản lý người dùng / Authentication & User Management**
```
POST   /api/v1/auth/register     - Đăng ký người dùng / User registration
POST   /api/v1/auth/login        - Đăng nhập (JWT) / User login (JWT)
POST   /api/v1/auth/logout       - Đăng xuất / User logout  
POST   /api/v1/auth/refresh      - Làm mới JWT token / Refresh JWT token
GET    /api/v1/auth/profile      - Lấy thông tin cá nhân / Get user profile
PUT    /api/v1/auth/profile      - Cập nhật thông tin / Update user profile

GET    /api/v1/users             - Danh sách người dùng / List all users (ADMIN)
GET    /api/v1/users/{id}        - Chi tiết người dùng / Get user details
PUT    /api/v1/users/{id}        - Cập nhật người dùng / Update user
DELETE /api/v1/users/{id}        - Xóa người dùng / Delete user (ADMIN)
PUT    /api/v1/users/{id}/role   - Thay đổi vai trò / Change user role (ADMIN)
```

### **📚 Quản lý khóa học / Course Management**
```
GET    /api/v1/courses           - Danh sách khóa học / List courses (with pagination)
GET    /api/v1/courses/{id}      - Chi tiết khóa học / Get course details  
POST   /api/v1/courses           - Tạo khóa học / Create course (TEACHER/ADMIN)
PUT    /api/v1/courses/{id}      - Cập nhật khóa học / Update course (TEACHER/ADMIN)
DELETE /api/v1/courses/{id}      - Xóa khóa học / Delete course (ADMIN)
POST   /api/v1/courses/{id}/enroll - Đăng ký khóa học / Enroll in course (STUDENT)
```

### **📖 Quản lý chương & bài học / Section & Lesson Management**
```
GET    /api/v1/sections          - Danh sách chương / List sections
POST   /api/v1/sections          - Tạo chương / Create section (TEACHER/ADMIN)
PUT    /api/v1/sections/{id}     - Cập nhật chương / Update section
DELETE /api/v1/sections/{id}     - Xóa chương / Delete section

GET    /api/v1/lessons           - Danh sách bài học / List lessons
POST   /api/v1/lessons           - Tạo bài học / Create lesson (TEACHER/ADMIN)
PUT    /api/v1/lessons/{id}      - Cập nhật bài học / Update lesson
DELETE /api/v1/lessons/{id}      - Xóa bài học / Delete lesson
```

### **📎 Quản lý tài liệu đính kèm bài học / Lesson Attachment Management**
```
GET    /api/v1/lessons/{lessonId}/attachments                    - Lấy danh sách file đính kèm / Get lesson attachments
POST   /api/v1/lessons/{lessonId}/attachments                    - Tải file đính kèm lên / Upload lesson attachment (TEACHER/ADMIN)
DELETE /api/v1/lessons/attachments/{attachmentId}               - Xóa file đính kèm / Delete attachment (TEACHER/ADMIN)
PUT    /api/v1/lessons/attachments/{attachmentId}/reorder       - Thay đổi thứ tự file / Reorder attachment (TEACHER/ADMIN)
```

**Supported File Types:**
- 📄 Documents: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX
- 🎥 Videos: MP4, AVI, MOV
- 🎵 Audio: MP3, WAV
- 📦 Archives: ZIP, RAR

**File Validation:**
- Maximum size: 100MB per file
- Security: File type validation and virus scanning
- Storage: Local filesystem with cloud storage support

### **📝 Quản lý bài tập / Assignment Management**
```
GET    /api/v1/assignments       - Danh sách bài tập / List assignments
GET    /api/v1/assignments/{id}  - Chi tiết bài tập / Get assignment details
POST   /api/v1/assignments       - Tạo bài tập / Create assignment (TEACHER/ADMIN)
PUT    /api/v1/assignments/{id}  - Cập nhật bài tập / Update assignment
DELETE /api/v1/assignments/{id}  - Xóa bài tập / Delete assignment

POST   /api/v1/assignments/{id}/submit    - Nộp bài tập / Submit assignment (STUDENT)
GET    /api/v1/assignments/{id}/submissions - Danh sách bài nộp / List submissions (TEACHER/ADMIN)
PUT    /api/v1/assignments/submissions/{id}/grade - Chấm điểm / Grade submission (TEACHER/ADMIN)
```

### **👨‍💼 Bảng điều khiển Admin / Admin Dashboard & Analytics**
```
GET    /api/v1/admin/stats       - Thống kê hệ thống / System statistics
GET    /api/v1/admin/users       - Phân tích người dùng / User analytics
GET    /api/v1/admin/courses     - Phân tích khóa học / Course analytics  
GET    /api/v1/admin/assignments - Phân tích bài tập / Assignment analytics
```

### **📁 Quản lý tải file / File Upload Management**
```
POST   /api/v1/files/upload      - Tải file lên / Upload file
GET    /api/v1/files/{filename}  - Tải file xuống / Download file
DELETE /api/v1/files/{filename}  - Xóa file / Delete file (ADMIN)
```

## 🗄️ Cấu trúc cơ sở dữ liệu / Database Schema

### **Cấu hình PostgreSQL / PostgreSQL Configuration**
- **Phiên bản / Version**: PostgreSQL 16-alpine
- **Kết nối / Connection**: localhost:5432/lms
- **Thông tin đăng nhập / Credentials**: `lms` / `lms`
- **Mã hóa / Encoding**: UTF-8
- **Múi giờ / Timezone**: UTC

### **Lịch sử Migration (Flyway) / Migration History**
```sql
V1__init.sql                          -- Schema ban đầu (khóa học) / Initial schema (courses)
V2__add_users_and_update_courses.sql  -- Quản lý người dùng / User management & course updates  
V3__create_course_content_structure.sql -- Chương & bài học / Sections & lessons
V4__create_assignment_submissions_table.sql -- Hệ thống bài tập / Assignment system
V5__add_instructions_to_assignments.sql -- Cải tiến bài tập / Assignment enhancements
V6__add_description_to_lessons.sql   -- Mô tả bài học / Lesson descriptions
V7__create_lesson_assignments.sql    -- Phân phối bài học / Lesson assignments
V8__enhance_assignments_coursera_style.sql -- Bài tập kiểu Coursera / Coursera-style assignments
V9__add_lesson_attachments.sql       -- File đính kèm bài học / Lesson attachments
```

### **Mối quan hệ thực thể / Database Entity Relations**
```
Users (1) ←→ (N) Courses (đăng ký khóa học / enrollment)
Courses (1) → (N) Sections → (N) Lessons (cấu trúc nội dung)
Lessons (1) → (N) LessonAttachments (file đính kèm / attachments)
Courses (1) → (N) Assignments → (N) AssignmentSubmissions (hệ thống bài tập)
Users (1) → (N) AssignmentSubmissions (bài nộp của sinh viên)
```

## 📁 Kiến trúc dự án / Project Architecture

```
backend-lms-postgres/
├── docker-compose.yml           # Thiết lập PostgreSQL + pgAdmin
├── pom.xml                     # Quản lý dependencies Maven
├── README.md                   # Tài liệu dự án
└── src/main/
    ├── java/com/example/lms/
    │   ├── BackendLmsPostgresApplication.java
    │   ├── config/                     # Security & App configuration
    │   │   ├── JwtAuthenticationFilter.java
    │   │   ├── OpenApiConfig.java
    │   │   ├── PasswordConfig.java 
    │   │   └── SecurityConfig.java
    │   ├── controller/                 # REST API Controllers (8)
    │   │   ├── AdminController.java    # Admin dashboard & analytics
    │   │   ├── AssignmentController.java # Assignment CRUD & submissions
    │   │   ├── AuthController.java     # Authentication & JWT
    │   │   ├── CourseController.java   # Course management
    │   │   ├── FileUploadController.java # File operations
    │   │   ├── HealthController.java   # Health checks
    │   │   ├── LessonController.java   # Lesson management
    │   │   ├── LessonAttachmentController.java # Lesson attachment management
    │   │   ├── SectionController.java  # Section management
    │   │   └── UserController.java     # User CRUD operations
    │   ├── dto/                        # Data Transfer Objects
    │   │   ├── ApiResponse.java        # Standardized API responses
    │   │   └── ErrorResponse.java      # Error handling DTOs
    │   ├── entity/                     # JPA Entities (9)
    │   │   ├── Assignment.java         # Assignment model
    │   │   ├── AssignmentSubmission.java # Submission model  
    │   │   ├── Course.java             # Course model
    │   │   ├── Lesson.java             # Lesson model
    │   │   ├── LessonAttachment.java   # Lesson attachment model
    │   │   ├── LessonAssignment.java   # Lesson assignment model
    │   │   ├── Section.java            # Section model
    │   │   ├── Submission.java         # Legacy submission
    │   │   └── User.java               # User model with roles
    │   ├── repository/                 # JPA Repositories (9)  
    │   │   ├── AssignmentRepository.java
    │   │   ├── AssignmentSubmissionRepository.java
    │   │   ├── CourseRepository.java
    │   │   ├── LessonRepository.java
    │   │   ├── LessonAttachmentRepository.java
    │   │   ├── LessonAssignmentRepository.java
    │   │   ├── SectionRepository.java
    │   │   ├── SubmissionRepository.java
    │   │   └── UserRepository.java
    │   └── service/                    # Business Logic Services (10)
    │       ├── AdminService.java       # Analytics & reporting
    │       ├── AssignmentService.java  # Assignment business logic
    │       ├── AuthenticationService.java # Authentication logic
    │       ├── CourseService.java      # Course business logic
    │       ├── FileUploadService.java  # File handling logic
    │       ├── LessonService.java      # Lesson business logic
    │       ├── LessonAttachmentService.java # Lesson attachment business logic
    │       ├── LessonAssignmentService.java # Lesson assignment business logic
    │       ├── SectionService.java     # Section business logic
    │       └── UserService.java        # User management logic
    └── resources/
        ├── application.yml             # Main configuration
        ├── application-dev.yml         # Development settings
        ├── application-prod.yml        # Production settings
        └── db/migration/              # Flyway migrations (V1-V9)
```

## 🐳 Docker Services

```yaml
services:
  db:                              # PostgreSQL Database
    image: postgres:16-alpine
    container_name: lms-postgres
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: lms
      POSTGRES_PASSWORD: lms  
      POSTGRES_DB: lms
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: pg_isready every 5s

  pgadmin:                         # Database Administration
    image: dpage/pgadmin4
    ports: ["8081:80"]
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@devmail.net
      PGADMIN_DEFAULT_PASSWORD: S3cure!Passw0rd
    depends_on: [db]
```

## 🎯 Tính năng chính đã triển khai / Key Features Implemented

### **✅ Xác thực & Phân quyền / Authentication & Authorization**
- Xác thực stateless dựa trên JWT / JWT-based stateless authentication
- Kiểm soát truy cập theo vai trò (ADMIN/TEACHER/STUDENT) / Role-based access control
- Mã hóa mật khẩu với BCrypt / Password encryption with BCrypt
- Cơ chế làm mới token / Token refresh mechanism
- Quản lý phiên làm việc / Session management

### **✅ Hệ thống quản lý khóa học / Course Management System**
- Đầy đủ các thao tác CRUD cho khóa học / Complete CRUD operations for courses
- Hệ thống đăng ký khóa học / Course enrollment system
- Tổ chức chương và bài học / Section and lesson organization
- Quản lý trạng thái khóa học (DRAFT/PUBLISHED/ARCHIVED) / Course status management

### **✅ Hệ thống bài tập & nộp bài / Assignment & Submission System**
- Tạo bài tập với hạn nộp / Assignment creation with due dates
- Tải file cho bài nộp / File upload for assignment submissions
- Hệ thống chấm điểm với phản hồi / Grading system with feedback
- Theo dõi trạng thái bài tập / Assignment status tracking

### **✅ Quản lý người dùng / User Management**
- Đăng ký và quản lý hồ sơ / User registration and profile management
- Phân công vai trò và kiểm soát quyền / Role assignment and permission control
- Phân tích và báo cáo người dùng / User analytics and reporting

### **✅ Bảng điều khiển Admin / Admin Dashboard**
- Thống kê và phân tích hệ thống / System statistics and analytics
- Giám sát hoạt động người dùng / User activity monitoring
- Số liệu hiệu suất khóa học / Course performance metrics
- Theo dõi hoàn thành bài tập / Assignment completion tracking

### **✅ Tài liệu API / API Documentation**
- Tài liệu Swagger/OpenAPI đầy đủ / Complete Swagger/OpenAPI documentation
- Giao diện test API tương tác / Interactive API testing interface
- Ví dụ request/response / Request/response examples
- Tích hợp xác thực trong Swagger UI / Authentication integration in Swagger UI

## 🔧 Environment Configurations

### **Development Profile** (`application-dev.yml`)
- **Server Port**: 8088
- **Database**: localhost:5432/lms
- **JWT Expiration**: 24 hours
- **Logging Level**: DEBUG for com.example.lms
- **Open-in-view**: true (for lazy loading)

### **Production Profile** (`application-prod.yml`)  
- **Server Port**: 8080
- **Database**: Production PostgreSQL
- **JWT Expiration**: Configurable via environment
- **Logging Level**: INFO
- **Security**: Enhanced configurations

## ⚠️ Vấn đề đã biết & Cần cải thiện / Known Issues & Improvements Needed

### **🔒 Mối quan tâm bảo mật / Security Concerns**
- JWT secret được hard-code (nên dùng biến môi trường) / JWT secret is hard-coded (should use environment variable)
- Thiếu giới hạn tốc độ cho API endpoints / Missing rate limiting for API endpoints
- Cấu hình CORS cần tinh chỉnh / CORS configuration needs refinement
- Không có chiến lược API versioning / No API versioning strategy

### **🗄️ Cơ sở dữ liệu & Hiệu năng / Database & Performance**
- Thiếu chiến lược indexing database / Missing database indexing strategy
- Chưa cấu hình connection pooling / No connection pooling configuration
- Vấn đề lazy loading đã giải quyết một phần / Lazy loading issues partially resolved
- Cần quy trình backup/recovery / Need backup/recovery procedures

### **🧪 Kiểm thử & Chất lượng / Testing & Quality**
- Chưa triển khai unit tests / No unit tests implemented
- Thiếu integration tests / Missing integration tests  
- Không có chiến lược xử lý lỗi / No error handling strategy
- Cần báo cáo code coverage / Need code coverage reports

### **🚀 DevOps & Giám sát / DevOps & Monitoring**
- Không có CI/CD pipeline / No CI/CD pipeline
- Thiếu quản lý biến môi trường / Missing environment variable management
- Không có health check cho ứng dụng trong Docker / No health check for application in Docker
- Thiếu giám sát và tập hợp log / No monitoring and logging aggregation

## 📋 Development Roadmap

### **Phase 1: Testing & Quality**
- [ ] Implement unit tests for all services
- [ ] Add integration tests
- [ ] Setup code coverage reporting
- [ ] Implement error handling strategy

### **Phase 2: Security Enhancement**
- [ ] Move JWT secret to environment variables
- [ ] Implement rate limiting
- [ ] Add API versioning
- [ ] Enhance CORS configuration

### **Phase 3: Performance & Monitoring**
- [ ] Database indexing optimization
- [ ] Connection pooling configuration
- [ ] Application monitoring setup
- [ ] Performance profiling

### **Phase 4: DevOps & Deployment**
- [ ] CI/CD pipeline setup
- [ ] Environment configuration management
- [ ] Docker health checks for application
- [ ] Production deployment strategy

## 📎 Lesson Attachment System

### **System Overview**
The LMS now includes a comprehensive lesson attachment system similar to Udemy/Coursera, allowing teachers to upload multiple files per lesson.

### **Key Features**
- **Multi-file Support**: Upload multiple attachments per lesson
- **File Type Validation**: Support for documents, presentations, videos, audio files
- **Security**: File type validation, size limits, and permission checks
- **Organization**: Display order management for attachments
- **Storage**: Local filesystem with cloud storage ready architecture

### **Database Schema**
```sql
CREATE TABLE lesson_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'document', 'presentation', 'spreadsheet', 'video', 'audio', 'other'
    display_order INTEGER NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **API Usage Examples**
```bash
# Upload attachment
curl -X POST "http://localhost:8088/api/v1/lessons/{lessonId}/attachments" \
  -H "Authorization: Bearer {token}" \
  -F "file=@document.pdf" \
  -F "displayOrder=1"

# Get lesson attachments
curl -X GET "http://localhost:8088/api/v1/lessons/{lessonId}/attachments" \
  -H "Authorization: Bearer {token}"

# Delete attachment
curl -X DELETE "http://localhost:8088/api/v1/lessons/attachments/{attachmentId}" \
  -H "Authorization: Bearer {token}"
```

### **Permission System**
- **Teachers**: Can upload, view, reorder, and delete attachments for their lessons
- **Students**: Can view and download attachments for enrolled courses
- **Admin**: Full access to all lesson attachments

## 📝 License

MIT License

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- **GitHub Issues**: [Create an issue](https://github.com/linhlinh0222/backend-lms-postgres/issues)
- **Documentation**: Check Swagger UI at http://localhost:8088/swagger-ui
