# 🎓 LMS Hàng Hải - Teacher Workflow Documentation v2

## 📋 Tổng Quan Hệ Thống

Đây là tài liệu chi tiết về **Teacher Workflow** trong hệ thống LMS Hàng Hải, tập trung vào các tính năng đã hoàn thành và cần phát triển tiếp. Hệ thống được xây dựng với Java Spring Boot backend và Angular frontend, với focus đặc biệt vào việc quản lý khóa học, bài học và bài tập.

## 🏆 Tình Trạng Phát Triển

### ✅ Đã Hoàn Thành
- **Hệ thống quản lý khóa học** với CRUD đầy đủ
- **Quản lý sections và lessons** với file attachments
- **Assignment system** tích hợp với lessons
- **File upload/download** với PDF viewer
- **Database migrations** cho lesson types
- **API integration** với proper DTO mapping
- **Responsive UI** cho teacher dashboard

### 🚧 Đang Phát Triển/Cần Hoàn Thiện
- **Assignment grading workflow** - cần UI chấm điểm chi tiết
- **Student enrollment management** - cần expand bulk operations
- **Advanced reporting system** - analytics dashboard
- **Real-time notifications** - WebSocket integration
- **Mobile optimization** - responsive improvements

## 🏗️ Kiến Trúc Hệ Thống

### Backend (Java Spring Boot 3.x + PostgreSQL)
```
backend-lms-postgres/
├── controller/
│   ├── CourseController.java           # ✅ CRUD khóa học, enrollment
│   ├── SectionController.java          # ✅ Quản lý sections
│   ├── LessonController.java           # ✅ Lessons với lessonType
│   ├── LessonRestController.java       # ✅ List API với DTO mapping
│   ├── AssignmentController.java       # ✅ Assignment CRUD
│   └── DocumentController.java         # ✅ File upload/download
├── entity/
│   ├── Course.java                     # ✅ Teacher relationship
│   ├── Section.java                    # ✅ Ordered sections
│   ├── Lesson.java                     # ✅ LessonType enum support
│   ├── Assignment.java                 # ✅ Due dates, scoring
│   └── LessonAssignment.java           # ✅ Junction table
├── dto/response/
│   └── LessonItem.java                 # ✅ Includes lessonType field
└── migration/
    ├── V11__unify_assignments_as_lessons.sql  # ✅ Data consistency
    └── V12__update_missing_lesson_types.sql   # ✅ Default types
```

### Frontend (Angular 20 Standalone + Signals)
```
Front-end-NCKH_v2-main/src/app/features/teacher/
├── dashboard/
│   └── teacher-dashboard.component.ts  # ✅ Overview + quick actions
├── courses/
│   ├── course-management.component.ts  # ✅ List với filter/search
│   ├── course-editor.component.ts      # ✅ Edit + section management  
│   └── section-editor.component.ts     # ✅ Lesson/assignment creation
├── assignments/
│   ├── assignment-management.component.ts      # ✅ List + sorting
│   ├── assignment-creation.component.ts        # ✅ Multi-step wizard
│   ├── enhanced-assignment-creation.component.ts # ✅ Advanced features
│   ├── assignment-detail.component.ts          # ✅ View details
│   └── assignment-submissions.component.ts     # 🚧 Grading workflow
└── students/
    └── student-management.component.ts         # 🚧 Enrollment tools
```

## 🎯 Teacher Workflow Chi Tiết

### 1. 📚 Quản Lý Khóa Học (Course Management)

#### **Dashboard Overview**
- **Component**: `teacher-dashboard.component.ts`
- **Status**: ✅ **Hoàn thành**
- **Features**:
  - Hiển thị thống kê tổng quan (courses, students, assignments)
  - Quick access đến recent courses và assignments
  - Revenue tracking và performance metrics

#### **Course List Management**  
- **Component**: `course-management.component.ts`
- **Status**: ✅ **Hoàn thành**
- **Features**:
  - Danh sách khóa học với pagination
  - Filter theo status (DRAFT, APPROVED, ARCHIVED)
  - Search theo title/description
  - Bulk actions (publish, archive)

#### **Course Creation & Editing**
- **Component**: `course-editor.component.ts` 
- **Status**: ✅ **Hoàn thành**
- **Features**:
  - Form validation với reactive forms
  - Upload thumbnail với preview
  - Section management integration
  - Student enrollment tools

### 2. 📖 Quản Lý Nội Dung (Content Management)

#### **Section & Lesson Editor** 
- **Component**: `section-editor.component.ts`
- **Status**: ✅ **Hoàn thành** (Major Update)
- **Key Features**:
  ```typescript
  // Lesson type selection với proper UI
  lessonTypeOptions = [
    { value: 'LECTURE', label: '📖 Bài giảng', icon: 'book' },
    { value: 'ASSIGNMENT', label: '📋 Bài tập', icon: 'assignment' },
    { value: 'QUIZ', label: '❓ Trắc nghiệm', icon: 'quiz' }
  ];
  ```
  - **Smart form switching**: Content hiển thị theo lesson type
  - **Unified file upload**: Consolidated attachment system
  - **Assignment integration**: Direct assignment creation từ lesson
  - **PDF preview**: Inline PDF viewer với fullscreen mode

#### **File Attachment System**
- **Status**: ✅ **Hoàn thành và Tối Ưu**
- **Recent Improvements**:
  - Merged duplicate upload containers
  - Conditional labeling based on lesson type  
  - Progress tracking cho multi-file uploads
  - CORS-compliant PDF viewing

### 3. 📝 Hệ Thống Bài Tập (Assignment System)

#### **Assignment Management**
- **Component**: `assignment-management.component.ts`
- **Status**: ✅ **Hoàn thành**
- **Features**:
  ```typescript
  // Sorting và filtering
  sortKey: 'title'|'courseTitle'|'dueDate'|'status'|'submissionsCount';
  statusFilter: '' | 'pending' | 'published' | 'closed';
  ```
  - Table view với sortable columns
  - Real-time submission count
  - Status-based filtering
  - Quick actions (edit, view submissions, close)

#### **Assignment Creation Wizard**
- **Components**: 
  - `assignment-creation.component.ts` ✅ 
  - `enhanced-assignment-creation.component.ts` ✅
- **Status**: ✅ **Hoàn thành**
- **Features**:
  - Multi-step creation process
  - Course và lesson linking
  - Due date management với timezone support
  - File attachments cho assignment materials
  - Template upload functionality

#### **Assignment-Lesson Integration**  
- **Status**: ✅ **Hoàn thành** (Recent Fix)
- **Key Achievement**:
  ```typescript
  // Fixed API response để show đúng assignment icons
  toItem(): LessonItem {
    return {
      id: this.id,
      title: this.title, 
      lessonType: this.lessonType,  // ← Added field
      // ...
    };
  }
  ```
  - Assignments hiện hiển thị đúng với 📋 icon
  - Lectures hiển thị với 📚 icon
  - Database migration đã sync existing data

### 4. 🔍 Assignment Workflow Cần Hoàn Thiện

#### **Submission Review & Grading** 
- **Component**: `assignment-submissions.component.ts`
- **Status**: 🚧 **Cần Hoàn Thiện**
- **Current State**:
  ```typescript
  interface AssignmentSubmission {
    id: string;
    studentName: string;
    submittedAt: string;
    content: string;
    fileUrl?: string;
    grade?: number;      // ← Cần UI chấm điểm
    feedback?: string;   // ← Cần rich text editor
    status: 'PENDING' | 'GRADED' | 'LATE' | 'RETURNED';
  }
  ```

**Cần Phát Triển**:
- **Grading Interface**: UI chấm điểm với rubric support
- **Batch Grading**: Chấm điểm hàng loạt cho assignments tương tự  
- **Feedback System**: Rich text editor cho comments chi tiết
- **Grade Export**: Export điểm số ra Excel/CSV
- **Plagiarism Detection**: Tích hợp công cụ kiểm tra đạo văn

#### **Advanced Assignment Features**
**Cần Bổ Sung**:
- **Peer Review**: Học viên chấm chéo bài của nhau
- **Timed Assignments**: Bài tập có giới hạn thời gian
- **Group Assignments**: Bài tập nhóm với member management
- **Auto-Grading**: Tự động chấm cho multiple choice questions

### 5. 👥 Student Management

#### **Enrollment System**
- **Component**: `course-editor.component.ts` (gán học viên)
- **Status**: ✅ **Cơ bản hoàn thành**, 🚧 **Cần mở rộng**
- **Current Features**:
  ```typescript
  // Basic enrollment by email
  assignStudentToCourse() {
    const email = this.assign.email.trim();
    if (!email) return;
    // API call to enroll student
  }
  ```

**Cần Phát Triển**:
- **Bulk Enrollment**: Upload Excel file với danh sách học viên
- **Enrollment Approval**: Workflow phê duyệt đăng ký
- **Student Progress Tracking**: Dashboard theo dõi tiến độ chi tiết
- **Communication Tools**: Gửi thông báo, announcements

## 🔧 API Endpoints Đã Triển Khai

### Course Management
```bash
# ✅ Hoàn thành đầy đủ
GET    /api/v1/courses                    # List teacher's courses
POST   /api/v1/courses                    # Create new course
PUT    /api/v1/courses/{id}               # Update course
DELETE /api/v1/courses/{id}               # Delete course
POST   /api/v1/courses/{id}/enroll       # Enroll student by email
```

### Section & Lesson Management
```bash
# ✅ Hoàn thành với lesson type support
GET    /api/v1/lessons/section/{sectionId}  # List lessons (includes lessonType)
POST   /api/v1/lessons                      # Create lesson
PUT    /api/v1/lessons/{id}                 # Update lesson
DELETE /api/v1/lessons/{id}                 # Delete lesson

# ✅ Assignment integration
POST   /api/v1/lessons/{id}/assignment      # Create assignment for lesson
GET    /api/v1/lessons/{id}/assignment      # Get lesson assignment
PUT    /api/v1/lessons/{id}/assignment      # Update assignment
```

### Assignment Management
```bash
# ✅ Core CRUD hoàn thành
GET    /api/v1/assignments                  # List assignments with pagination
POST   /api/v1/assignments                  # Create assignment
GET    /api/v1/assignments/{id}             # Get assignment details
PUT    /api/v1/assignments/{id}             # Update assignment
DELETE /api/v1/assignments/{id}             # Delete assignment

# 🚧 Cần hoàn thiện
GET    /api/v1/assignments/{id}/submissions # List submissions
POST   /api/v1/assignments/{id}/grade       # Grade submission
```

### File Management
```bash
# ✅ Hoàn thành với CORS support
POST   /api/v1/documents/upload             # Upload files (PDF, Word, etc.)
GET    /api/v1/documents/{id}/download      # Download with proper headers
GET    /api/v1/documents/{id}/view          # View PDF inline

# ✅ Lesson attachments
POST   /api/v1/lesson-attachments           # Attach file to lesson
GET    /api/v1/lesson-attachments/lesson/{id} # List lesson attachments
DELETE /api/v1/lesson-attachments/{id}      # Remove attachment
```

## 🎨 UI/UX Improvements Đã Thực Hiện

### Recent Major Updates (Tháng 10/2025)

#### **Lesson Type Display Fix**
```typescript
// Before: Tất cả hiển thị như lectures
<span class="text-blue-600">📚 Bài học</span>

// After: Hiển thị đúng theo type
<ng-container *ngIf="l.lessonType === 'ASSIGNMENT'">
  <span class="text-green-600">📋 Bài tập</span>
</ng-container>
<ng-container *ngIf="!l.lessonType || l.lessonType === 'LECTURE'">
  <span class="text-blue-600">📚 Bài học</span>
</ng-container>
```

#### **File Upload Consolidation**
- **Problem**: Duplicate file upload containers gây confusion
- **Solution**: Merged purple và gray containers thành unified system
- **Benefit**: Cleaner UI, tập trung vào functionality

#### **Smart Content Display**
```typescript
// Dynamic form fields based on lesson type
get isAssignmentType(): boolean {
  return this.createForm.get('lessonType')?.value === 'ASSIGNMENT';
}

// Conditional rendering trong template
<div *ngIf="isAssignmentType" class="space-y-4">
  <!-- Assignment-specific fields -->
</div>
```

## 📊 Database Schema Updates

### Recent Migrations
```sql
-- V11: Unify assignments as lessons
UPDATE lessons 
SET lesson_type = 'ASSIGNMENT'
WHERE id IN (
  SELECT DISTINCT la.lesson_id 
  FROM lesson_assignments la
);

-- V12: Set default lesson types  
UPDATE lessons 
SET lesson_type = 'LECTURE'
WHERE lesson_type IS NULL;
```

### Current Schema Status
```sql
-- ✅ Lessons table với proper typing
CREATE TABLE lessons (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  video_url VARCHAR(500),
  lesson_type lesson_type_enum DEFAULT 'LECTURE',  -- ✅ Enum support
  section_id UUID REFERENCES sections(id),
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Junction table for assignment links
CREATE TABLE lesson_assignments (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  assignment_id UUID REFERENCES assignments(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Kế Hoạch Phát Triển Tiếp Theo

### Priorities Cao (Cần hoàn thành ngay)

#### 1. **Assignment Grading System** 🔥
- **Timeline**: 1-2 tuần
- **Components cần tạo**:
  - `assignment-grading.component.ts`
  - `rubric-editor.component.ts`  
  - `grade-export.component.ts`
- **Backend APIs cần bổ sung**:
  ```bash
  POST /api/v1/assignments/{id}/submissions/{submissionId}/grade
  GET  /api/v1/assignments/{id}/rubric
  POST /api/v1/assignments/{id}/rubric
  ```

#### 2. **Bulk Student Management** 🔥
- **Timeline**: 1 tuần
- **Features**:
  - Excel upload cho enrollment
  - Batch operations (enroll, unenroll, message)
  - Student progress dashboard

#### 3. **Real-time Notifications** 
- **Timeline**: 2 tuần  
- **Tech Stack**: WebSocket + Angular
- **Use Cases**: 
  - New assignment submissions
  - Student enrollment requests
  - System announcements

### Priorities Trung Bình (Tháng tiếp theo)

#### 4. **Advanced Reporting Dashboard**
- Course analytics với charts
- Student performance tracking
- Assignment completion rates
- Revenue và engagement metrics

#### 5. **Mobile Optimization**
- Responsive improvements cho tablet/mobile
- Touch-friendly assignment grading
- Offline capability cho content viewing

### Priorities Thấp (Tương lai)

#### 6. **Integration Features**
- Zoom/Teams integration cho live classes  
- Google Drive/OneDrive sync
- Email automation
- Calendar integration

## 💻 Development Guidelines

### Code Structure Best Practices
```typescript
// ✅ Sử dụng Angular Signals cho state management
export class AssignmentManagementComponent {
  assignments = signal<AssignmentSummary[]>([]);
  loading = signal(true);
  error = signal('');
  
  // ✅ Computed values cho derived state
  filtered = computed(() => this.assignments().filter(/* logic */));
}

// ✅ Reactive Forms với proper validation
createForm = this.fb.group({
  title: ['', [Validators.required, Validators.maxLength(255)]],
  lessonType: ['LECTURE', [Validators.required]],
  // ...
});
```

### API Integration Pattern
```typescript
// ✅ Consistent error handling
this.assignmentApi.create(payload).subscribe({
  next: (res) => {
    this.assignments.update(list => [...list, res.data]);
    this.showSuccess('Tạo bài tập thành công');
  },
  error: (err) => {
    this.error.set(err.message || 'Có lỗi xảy ra');
  }
});
```

## 📝 Notes for Development Team

### Completed Recent Work
- ✅ Fixed assignment/lecture display issue với proper lessonType mapping
- ✅ Consolidated duplicate file upload UI elements  
- ✅ Database migrations cho data consistency
- ✅ Enhanced assignment creation workflow

### Next Developer Steps
1. **Focus on grading interface** - này là priority #1
2. **Implement bulk student operations** 
3. **Add comprehensive error handling** cho file operations
4. **Performance optimization** cho large course loads

### Technical Debt to Address
- File upload progress tracking cần improvements
- PDF viewer memory management cho large files  
- Mobile responsiveness cho assignment forms
- Caching strategy cho frequent API calls

---

**📞 Contact**: Liên hệ team development để sync về priorities và technical requirements cho các features tiếp theo.
│   └── student-detail.component.ts        # Chi tiết học viên
├── dashboard/
│   └── teacher-dashboard.component.ts     # Dashboard giảng viên
└── shared/
    ├── teacher-layout-simple.component.ts # Layout chung
    └── teacher-sidebar-simple.component.ts # Sidebar điều hướng
```

## 🔄 Input/Output Specifications

### 1. Course Management (Quản Lý Khóa Học)

#### Backend - CourseController

**Input:**
```java
// Tạo khóa học mới
POST /api/v1/courses
{
    "code": "string (max 64 chars, required)",
    "title": "string (max 255 chars, required)",
    "description": "string (optional)"
}

// Cập nhật khóa học
PUT /api/v1/courses/{courseId}
{
    "code": "string (max 64 chars, optional)",
    "title": "string (max 255 chars, optional)",
    "description": "string (optional)"
}

// Gán học viên vào khóa học
POST /api/v1/courses/{courseId}/enrollments
{
    "email": "string (required, must be STUDENT role)"
}

// Bulk enrollment từ Excel
POST /api/v1/courses/{courseId}/bulk-enroll
Content-Type: multipart/form-data
{
    "file": "Excel file (.xlsx/.xls)"
}
```

**Output:**
```java
// CourseSummary
{
    "id": "UUID",
    "code": "string",
    "title": "string",
    "description": "string",
    "status": "APPROVED|PENDING|DRAFT",
    "teacherName": "string",
    "enrolledCount": "number",
    "createdAt": "ISO 8601 timestamp"
}

// CourseDetail
{
    "id": "UUID",
    "code": "string",
    "title": "string",
    "description": "string",
    "status": "string",
    "teacherId": "UUID",
    "teacherName": "string",
    "enrolledCount": "number",
    "sectionsCount": "number",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp | null"
}

// BulkEnrollmentResponse
{
    "totalProcessed": "number",
    "successCount": "number",
    "errorCount": "number",
    "errors": [
        {
            "email": "string",
            "errorType": "INVALID_EMAIL_FORMAT|EMAIL_NOT_FOUND|ALREADY_ENROLLED|SYSTEM_ERROR",
            "message": "string"
        }
    ]
}
```

#### Frontend - CourseApi

**Input:**
```typescript
// Tạo khóa học
createCourse(payload: CreateCourseRequest): Observable<ApiResponse<CourseDetail>>

// Cập nhật khóa học
updateCourse(id: string, payload: Partial<CreateCourseRequest>): Observable<ApiResponse<CourseDetail>>

// Gán học viên
enrollStudentAsTeacher(courseId: string, payload: EnrollStudentRequest): Observable<ApiResponse<string>>

// Bulk enrollment
bulkEnrollStudents(courseId: string, file: File): Observable<ApiResponse<any>>
```

**Output:**
```typescript
interface CourseSummary {
    id: string;
    code: string;
    title: string;
    description: string;
    status: string;
    teacherName: string;
    enrolledCount: number;
    createdAt: string;
}

interface CourseDetail {
    id: string;
    code: string;
    title: string;
    description: string;
    status: string;
    teacherId: string;
    teacherName: string;
    enrolledCount: number;
    sectionsCount: number;
    createdAt: string;
    updatedAt: string | null;
}

interface EnrollStudentRequest {
    email: string;
}
```

### 2. Section Management (Quản Lý Chương Học)

#### Backend - SectionController

**Input:**
```java
// Tạo chương mới
POST /api/v1/sections
{
    "courseId": "UUID (required)",
    "title": "string (required)",
    "description": "string (optional)",
    "orderIndex": "integer (optional)"
}

// Cập nhật chương
PUT /api/v1/sections/{sectionId}
{
    "title": "string (optional)",
    "description": "string (optional)",
    "orderIndex": "integer (optional)"
}
```

**Output:**
```java
// SectionDetail
{
    "id": "UUID",
    "title": "string",
    "description": "string",
    "orderIndex": "integer",
    "courseId": "UUID",
    "courseTitle": "string",
    "lessonsCount": "number",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp | null"
}
```

### 3. Lesson Management (Quản Lý Bài Học)

#### Backend - LessonController

**Input:**
```java
// Tạo bài học mới
POST /api/v1/lessons
{
    "sectionId": "UUID (required)",
    "title": "string (required)",
    "description": "string (optional)",
    "content": "string (optional)",
    "videoUrl": "string (optional)",
    "durationMinutes": "integer (optional)",
    "orderIndex": "integer (optional)"
}

// Cập nhật bài học
PUT /api/v1/lessons/{lessonId}
{
    "title": "string (optional)",
    "description": "string (optional)",
    "content": "string (optional)",
    "videoUrl": "string (optional)",
    "durationMinutes": "integer (optional)",
    "orderIndex": "integer (optional)"
}
```

**Output:**
```java
// LessonDetail
{
    "id": "UUID",
    "title": "string",
    "description": "string",
    "content": "string",
    "videoUrl": "string",
    "durationMinutes": "integer",
    "orderIndex": "integer",
    "sectionId": "UUID",
    "sectionTitle": "string",
    "courseId": "UUID",
    "courseTitle": "string",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp | null"
}
```

### 4. Assignment Management (Quản Lý Bài Tập)

#### Backend - AssignmentController

**Input:**
```java
// Tạo bài tập mới
POST /api/v1/assignments
{
    "courseId": "UUID (required)",
    "title": "string (required)",
    "description": "string (optional)",
    "instructions": "string (optional)",
    "dueDate": "ISO 8601 timestamp (optional)"
}

// Cập nhật bài tập
PUT /api/v1/assignments/{assignmentId}
{
    "title": "string (optional)",
    "description": "string (optional)",
    "instructions": "string (optional)",
    "dueDate": "ISO 8601 timestamp (optional)"
}
```

**Output:**
```java
// AssignmentDetail
{
    "id": "UUID",
    "title": "string",
    "description": "string",
    "instructions": "string",
    "dueDate": "ISO 8601 timestamp | null",
    "courseId": "UUID",
    "courseTitle": "string",
    "submissionsCount": "number",
    "createdAt": "ISO 8601 timestamp",
    "updatedAt": "ISO 8601 timestamp | null"
}
```

## 🔗 API Endpoints - Teacher Features

### Course Management
```
GET    /api/v1/courses/my-courses           - Danh sách khóa học của giảng viên
POST   /api/v1/courses                     - Tạo khóa học mới
PUT    /api/v1/courses/{id}                - Cập nhật khóa học
DELETE /api/v1/courses/{id}                - Xóa khóa học
PATCH  /api/v1/courses/{id}/publish        - Xuất bản khóa học
GET    /api/v1/courses/{id}/content        - Lấy nội dung khóa học
POST   /api/v1/courses/{id}/enrollments    - Gán học viên vào khóa học
POST   /api/v1/courses/{id}/bulk-enroll    - Gán nhiều học viên từ Excel
```

### Section Management
```
GET    /api/v1/sections                     - Danh sách chương học
POST   /api/v1/sections                     - Tạo chương mới
PUT    /api/v1/sections/{id}                - Cập nhật chương
DELETE /api/v1/sections/{id}                - Xóa chương
```

### Lesson Management
```
GET    /api/v1/lessons                      - Danh sách bài học
POST   /api/v1/lessons                      - Tạo bài học mới
PUT    /api/v1/lessons/{id}                 - Cập nhật bài học
DELETE /api/v1/lessons/{id}                 - Xóa bài học
```

### Assignment Management
```
GET    /api/v1/assignments                  - Danh sách bài tập
POST   /api/v1/assignments                  - Tạo bài tập mới
PUT    /api/v1/assignments/{id}             - Cập nhật bài tập
DELETE /api/v1/assignments/{id}             - Xóa bài tập
GET    /api/v1/assignments/{id}/submissions - Danh sách bài nộp
```

## 🔐 Authorization & Security

### Role-based Access Control
- **TEACHER**: Có thể quản lý khóa học của mình, gán học viên, tạo nội dung
- **ADMIN**: Có thể quản lý tất cả khóa học, gán học viên cho bất kỳ khóa học nào
- **STUDENT**: Chỉ có thể xem và đăng ký khóa học đã được duyệt

### Authentication
- JWT-based stateless authentication
- Bearer token required cho tất cả API calls
- Role validation tại controller level

## 📊 Detailed System Flow Diagrams

### 1. Course Creation Flow (Chi Tiết)

```
┌─────────────────┐
│   Frontend      │
│ course-creation │
│ .component.ts   │
└─────────────────┘
         │
         │ User fills form: code, title, description
         │ Form validation (Angular Reactive Forms)
         ▼
┌─────────────────┐    POST /api/v1/courses
│   CourseApi     │ ─────────────────────────────►
│ createCourse()  │    Headers: Authorization: Bearer {jwt}
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   ApiClient     │
│ (HTTP Interceptor)
│ - Auth header   │
│ - Error handling│
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────────────────┐
│ CourseController│    │ @PreAuthorize("hasRole('TEACHER')")
│ @PostMapping    │    │ @Valid CreateCourseRequest  │
└─────────────────┘    └─────────────────────────────┘
         │
         │ 1. Extract User from JWT token
         │ 2. Validate input (JSR-303 annotations)
         ▼
┌─────────────────┐
│ CourseService   │
│ createCourse()  │
└─────────────────┘
         │
         │ 1. Check duplicate course code
         │    CourseRepository.existsByCode(code)
         │ 2. Create Course entity
         │    - Set teacher = currentUser
         │    - Set status = APPROVED (immediate approval)
         │    - Set timestamps
         ▼
┌─────────────────┐
│ CourseRepository│
│ .save(course)   │
└─────────────────┘
         │
         │ JPA/Hibernate: INSERT INTO courses (...)
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  courses table  │
└─────────────────┘
         │
         │ Return saved Course entity
         ▼
┌─────────────────┐
│ CourseController│
│ convertToCourseDetail()
└─────────────────┘
         │
         │ Build CourseDetail DTO with:
         │ - id, code, title, description
         │ - teacher info, counts, timestamps
         ▼
┌─────────────────┐    HTTP 201 Created
│   ApiResponse   │ ◄─────────────────────────────
│ success(courseDetail)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│ course-creation │
│ .component.ts   │
└─────────────────┘
         │
         │ 1. Receive ApiResponse<CourseDetail>
         │ 2. Show success notification
         │ 3. Navigate to course list or editor
         ▼
    User sees success message
```

### 2. Student Enrollment Flow (Chi Tiết)

```
┌─────────────────┐
│   Frontend      │
│ student-mgmt    │
│ .component.ts   │
└─────────────────┘
         │
         │ User enters student email
         │ Form validation
         ▼
┌─────────────────┐    POST /api/v1/courses/{courseId}/enrollments
│   CourseApi     │ ──────────────────────────────────────────────►
│ enrollStudent  │    Body: {"email": "student@lms.com"}
│ AsTeacher()    │    Headers: Authorization: Bearer {jwt}
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   ApiClient     │
│ (HTTP Interceptor)
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────────────────────────┐
│ CourseController│    │ @PreAuthorize("hasRole('TEACHER')   │
│ enrollStudent   │    │ or hasRole('ADMIN')")              │
│ ByTeacher       │    │ @Valid EnrollStudentRequest        │
└─────────────────┘    └─────────────────────────────────────┘
         │
         │ 1. Extract currentUser from JWT
         │ 2. Validate email format
         ▼
┌─────────────────┐
│ CourseService   │
│ enrollStudent   │
│ ByTeacher()     │
└─────────────────┘
         │
         │ 1. Find course by courseId
         │    CourseRepository.findById(courseId)
         │ 2. Check teacher permission:
         │    - course.teacher.id == currentUser.id OR
         │    - currentUser.role == ADMIN
         │ 3. Find student by email + STUDENT role
         │    UserRepository.findByEmailAndRole(email, STUDENT)
         │ 4. Check course status == APPROVED
         │ 5. Check if already enrolled
         │    UserRepository.existsByCourseEnrollment(courseId, studentId)
         ▼
┌─────────────────┐
│ UserRepository  │
│ .save(student)  │
│ (update enrolledCourses)
└─────────────────┘
         │
         │ JPA: UPDATE users SET enrolled_courses = ... WHERE id = ?
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  users table    │
│  (Many-to-Many  │
│   relationship) │
└─────────────────┘
         │
         │ Return success message
         ▼
┌─────────────────┐    HTTP 200 OK
│   ApiResponse   │ ◄─────────────────────────────
│ success("Đã gán học viên vào khóa học")
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│ student-mgmt    │
│ .component.ts   │
└─────────────────┘
         │
         │ 1. Show success notification
         │ 2. Refresh enrolled students list
         │ 3. Update UI counters
         ▼
    User sees updated enrollment list
```

### 3. Bulk Enrollment Flow (Excel Upload)

```
┌─────────────────┐
│   Frontend      │
│ student-mgmt    │
│ .component.ts   │
└─────────────────┘
         │
         │ User selects Excel file (.xlsx/.xls)
         │ Client-side validation:
         │ - File type check
         │ - File size limit (< 10MB)
         ▼
┌─────────────────┐    POST /api/v1/courses/{courseId}/bulk-enroll
│   CourseApi     │ ──────────────────────────────────────────────►
│ bulkEnroll      │    Content-Type: multipart/form-data
│ Students()      │    Body: FormData with 'file'
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   ApiClient     │
│ (File upload interceptor)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ CourseController│
│ bulkEnroll      │
│ Students        │
└─────────────────┘
         │
         │ 1. Extract MultipartFile
         │ 2. Validate file not empty
         ▼
┌─────────────────┐
│ ExcelProcessing │
│ Service         │
│ extractEmails   │
│ FromExcel()     │
└─────────────────┘
         │
         │ Apache POI processing:
         │ 1. Open workbook
         │ 2. Read sheet (assume column A = emails)
         │ 3. Extract email strings
         │ 4. Validate email format
         │ 5. Return List<String> emails
         ▼
┌─────────────────┐
│ CourseService   │
│ bulkEnroll      │
│ Students()      │
└─────────────────┘
         │
         │ For each email in list:
         │ ┌─────────────────────────────────────┐
         │ │ 1. Validate email format            │
         │ │ 2. Find student by email + STUDENT  │
         │ │ 3. Check if already enrolled        │
         │ │ 4. Enroll student (update user)     │
         │ │ 5. Track success/error              │
         │ └─────────────────────────────────────┘
         ▼
┌─────────────────┐
│ BulkEnrollment  │
│ Response        │
│ Builder         │
└─────────────────┘
         │
         │ Build response with:
         │ - totalProcessed
         │ - successCount
         │ - errorCount
         │ - detailed error list
         ▼
┌─────────────────┐    HTTP 200 OK
│   ApiResponse   │ ◄─────────────────────────────
│ success(bulkResponse)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│ student-mgmt    │
│ .component.ts   │
└─────────────────┘
         │
         │ 1. Parse bulk response
         │ 2. Show summary notification
         │    "Processed: X, Success: Y, Errors: Z"
         │ 3. Display detailed error list if any
         │ 4. Refresh enrolled students count
         ▼
    User sees bulk enrollment results
```

### 4. Course Content Management Flow

```
┌─────────────────┐
│   Frontend      │
│ section-list    │
│ .component.ts   │
└─────────────────┘
         │
         │ User clicks "Add Section" or "Edit Section"
         ▼
┌─────────────────┐    POST/PUT /api/v1/sections
│   SectionApi    │ ─────────────────────────────────►
│ createSection/  │    Body: {courseId, title, description, orderIndex}
│ updateSection   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ SectionController│
│ @PostMapping/   │
│ @PutMapping     │
└─────────────────┘
         │
         │ 1. Validate teacher owns course
         │ 2. Validate section belongs to course
         ▼
┌─────────────────┐
│ SectionService  │
│ create/update   │
│ Section()       │
└─────────────────┘
         │
         │ 1. Create/update Section entity
         │ 2. Handle orderIndex (reorder if needed)
         │ 3. Save to database
         ▼
┌─────────────────┐
│ SectionRepository│
│ .save(section)  │
└─────────────────┘
         │
         │ Cascade save/update lessons if needed
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  sections table │
│  lessons table  │
└─────────────────┘
         │
         │ Return SectionDetail with lessons count
         ▼
┌─────────────────┐    HTTP 200/201 OK
│   ApiResponse   │ ◄─────────────────────────────
│ success(sectionDetail)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│ section-list    │
│ .component.ts   │
└─────────────────┘
         │
         │ 1. Update sections signal
         │ 2. Re-render section list
         │ 3. Show success notification
         ▼
    UI updates with new/updated section
```

### 5. Assignment Creation & Grading Flow

```
┌─────────────────┐
│   Frontend      │
│ assignment-     │
│ creation.comp   │
└─────────────────┘
         │
         │ Teacher creates assignment
         ▼
┌─────────────────┐    POST /api/v1/assignments
│ AssignmentApi   │ ─────────────────────────────►
│ createAssignment│    Body: {courseId, title, description, dueDate}
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Assignment      │
│ Controller      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Assignment      │
│ Service         │
└─────────────────┘
         │
         │ 1. Validate teacher owns course
         │ 2. Create Assignment entity
         │ 3. Save to database
         ▼
┌─────────────────┐
│ Assignment      │
│ Repository      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  assignments    │
│  table          │
└─────────────────┘
         │
         │ Students submit assignments...
         ▼
┌─────────────────┐
│ Student submits │
│ assignment      │
└─────────────────┘
         │
         ▼
┌─────────────────┐    GET /api/v1/assignments/{id}/submissions
│ AssignmentApi   │ ◄─────────────────────────────
│ getSubmissions  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│ assignment-     │
│ grading.comp    │
└─────────────────┘
         │
         │ Teacher reviews and grades
         ▼
┌─────────────────┐    PUT /api/v1/assignments/{id}/submissions/{subId}
│ AssignmentApi   │ ─────────────────────────────►
│ gradeSubmission │    Body: {grade, feedback}
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Assignment      │
│ Controller      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Assignment      │
│ Service         │
└─────────────────┘
         │
         │ 1. Find submission
         │ 2. Update grade and feedback
         │ 3. Save to database
         ▼
┌─────────────────┐
│ Assignment      │
│ Repository      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  assignment_    │
│  submissions    │
└─────────────────┘
         │
         │ Student receives notification
         ▼
    Grading complete
```

### 6. Authentication & Authorization Flow

```
┌─────────────────┐
│   Frontend      │
│ Login Component │
└─────────────────┘
         │
         │ User enters credentials
         ▼
┌─────────────────┐    POST /api/v1/auth/login
│   AuthApi       │ ─────────────────────────────►
│ login()         │    Body: {email, password}
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ AuthController  │
│ @PostMapping    │
│ /login          │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Authentication  │
│ Service         │
└─────────────────┘
         │
         │ 1. Find user by email
         │ 2. Verify password (BCrypt)
         │ 3. Check user role and status
         │ 4. Generate JWT token
         ▼
┌─────────────────┐
│   JwtService    │
│ generateToken() │
└─────────────────┘
         │
         │ JWT contains: userId, email, role, exp
         ▼
┌─────────────────┐    HTTP 200 OK
│   ApiResponse   │ ◄─────────────────────────────
│ success({token, user})
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │
│ Auth Service    │
└─────────────────┘
         │
         │ Store token in localStorage/sessionStorage
         ▼
┌─────────────────┐
│   Any API Call  │
│   (Teacher ops) │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Auth Interceptor│
│ (Angular)       │
└─────────────────┘
         │
         │ Add Authorization: Bearer {token} header
         ▼
┌─────────────────┐
│ Backend API     │
│ Controller      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ JwtAuthFilter   │
│ (Spring Security)
└─────────────────┘
         │
         │ 1. Extract token from header
         │ 2. Validate token signature
         │ 3. Check expiration
         │ 4. Extract user details
         │ 5. Set SecurityContext
         ▼
┌─────────────────┐
│ @PreAuthorize   │
│ Annotation      │
└─────────────────┘
         │
         │ Check role permissions:
         │ - hasRole('TEACHER') for course operations
         │ - hasRole('ADMIN') for admin operations
         ▼
    Access granted or 403 Forbidden
```

### 7. Error Handling Flow

```
┌─────────────────┐
│   Frontend      │
│ Any Component   │
└─────────────────┘
         │
         │ API call fails
         ▼
┌─────────────────┐
│ Error Interceptor│
│ (Angular)        │
└─────────────────┘
         │
         │ 1. Catch HTTP error
         │ 2. Check status code
         │ 3. Parse error response
         ▼
┌─────────────────┐
│ Global Error    │
│ Handler         │
└─────────────────┘
         │
         │ Based on error type:
         │ - 400: Show validation errors
         │ - 401: Redirect to login
         │ - 403: Show permission error
         │ - 404: Show not found message
         │ - 500: Show generic error
         ▼
┌─────────────────┐
│   UI Feedback   │
│ - Toast/Alert   │
│ - Form errors   │
│ - Loading states │
└─────────────────┘
```

### 8. Database Transaction Flow

```
┌─────────────────┐
│   Service       │
│   Method        │
└─────────────────┘
         │
         │ @Transactional annotation
         ▼
┌─────────────────┐
│ Spring TX       │
│ Manager         │
└─────────────────┘
         │
         │ 1. Begin transaction
         │ 2. Execute business logic
         ▼
┌─────────────────┐
│ Repository      │
│ Operations      │
└─────────────────┘
         │
         │ JPA/Hibernate operations
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   Transaction   │
└─────────────────┘
         │
         │ Execute SQL statements
         │ - INSERT/UPDATE/DELETE
         │ - Foreign key constraints
         │ - Triggers if any
         ▼
         │
         │ Success: COMMIT
         │ Failure: ROLLBACK
         ▼
┌─────────────────┐
│   Service       │
│   Returns       │
└─────────────────┘
```

## 🧪 Testing & Validation

### Backend Validation Rules
- **Course Code**: Max 64 chars, unique, required
- **Course Title**: Max 255 chars, required
- **Email**: Valid email format, must exist as STUDENT role
- **Order Index**: Integer, auto-assigned if not provided

### Frontend Validation
- Form validation using Angular Reactive Forms
- Real-time validation feedback
- File upload validation (Excel format, size limits)

## 🚀 Integration Points

### Database Entities Relationship
```
User (TEACHER) 1:N Course
Course 1:N Section
Section 1:N Lesson
Course 1:N Assignment
Assignment 1:N AssignmentSubmission
Course N:M User (enrolled students)
```

### File Upload Integration
- Excel processing cho bulk enrollment
- Video upload cho lessons (future enhancement)
- Document upload cho assignments

## 📝 Error Handling

### Common Error Responses
```json
{
    "success": false,
    "message": "Error description",
    "data": null
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized
- **403**: Forbidden (permission denied)
- **404**: Not Found
- **500**: Internal Server Error

## 🔄 State Management (Frontend)

### Signals Usage
```typescript
// Course management state
courses = signal<CourseSummary[]>([]);
loading = signal(true);
error = signal('');

// Reactive computations
filteredCourses = computed(() => {
    // Filter logic based on search/status
});
```

### API Integration
- Centralized API client (`CourseApi`)
- Error interceptors cho global error handling
- Auth interceptors cho JWT token management

## 📋 Component Dependencies

### Frontend Component Tree
```
teacher.component.ts (main layout)
├── teacher-dashboard.component.ts
├── course-management.component.ts
│   ├── course-creation.component.ts
│   ├── course-editor.component.ts
│   └── section-list.component.ts
├── assignment-management.component.ts
│   ├── assignment-creation.component.ts
│   └── assignment-editor.component.ts
└── student-management.component.ts
    └── student-detail.component.ts
```

### Shared Dependencies
- `teacher-layout-simple.component.ts`: Common layout wrapper
- `teacher-sidebar-simple.component.ts`: Navigation sidebar
- `CourseApi`: API client service
- `course.types.ts`: TypeScript interfaces

## 🎯 Key Features Summary

1. **Course CRUD**: Tạo, đọc, cập nhật, xóa khóa học
2. **Content Management**: Quản lý chương học và bài học
3. **Student Enrollment**: Gán học viên thủ công hoặc bulk từ Excel
4. **Assignment Management**: Tạo và quản lý bài tập
5. **Dashboard & Analytics**: Theo dõi tiến độ và thống kê
6. **File Upload**: Hỗ trợ upload Excel cho bulk operations

## 🔧 Configuration Requirements

### Backend Configuration
```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/lms_db
  jpa:
    hibernate:
      ddl-auto: validate
  security:
    jwt:
      secret: your-jwt-secret
```

### Frontend Configuration
```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8088/api/v1'
};
```

---

**Tài liệu này được tạo để hỗ trợ quá trình merge teacher components vào dự án chính. Tất cả input/output specifications đã được document chi tiết để đảm bảo compatibility và integration mượt mà.**