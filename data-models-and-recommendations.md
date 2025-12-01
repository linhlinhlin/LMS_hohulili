# Data Models & API Recommendations

## 📊 Data Models

### User Model
```typescript
interface User {
  id: string;                    // UUID
  username: string;              // Unique, 3-50 chars
  email: string;                 // Unique, valid email
  fullName: string;              // Max 100 chars
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  enabled: boolean;              // Account status
  createdAt: string;             // ISO 8601 timestamp
  updatedAt?: string;            // ISO 8601 timestamp
}
```

### Course Model
```typescript
interface Course {
  id: string;                    // UUID
  code: string;                  // Unique, max 64 chars
  title: string;                 // Max 255 chars
  description?: string;          // TEXT
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  teacherId: string;             // UUID
  teacherName: string;           // Denormalized for display
  enrolledCount: number;         // Count of enrolled students
  sectionsCount: number;         // Count of sections
  assignmentsCount?: number;     // Count of assignments
  reviewComment?: string;        // Admin review comment
  reviewedAt?: string;           // ISO 8601 timestamp
  reviewedBy?: string;           // UUID of admin
  createdAt: string;             // ISO 8601 timestamp
  updatedAt?: string;            // ISO 8601 timestamp
  enrolled?: boolean;            // Only for student view
}
```

### Section Model
```typescript
interface Section {
  id: string;                    // UUID
  courseId: string;              // UUID
  title: string;
  description?: string;
  orderIndex: number;            // Display order
  lessons: Lesson[];             // Array of lessons
  createdAt: string;
  updatedAt?: string;
}
```

### Lesson Model
```typescript
interface Lesson {
  id: string;                    // UUID
  sectionId: string;             // UUID
  title: string;
  content?: string;              // TEXT - lesson content
  description?: string;          // TEXT - lesson description
  videoUrl?: string;             // Max 500 chars
  durationMinutes?: number;
  orderIndex: number;            // Display order
  lessonType: 'LECTURE' | 'ASSIGNMENT' | 'QUIZ';
  createdAt: string;
  updatedAt?: string;
}
```

### Enrollment Model (Simplified)
```typescript
interface Enrollment {
  studentId: string;             // UUID
  courseId: string;              // UUID
  enrolledAt?: string;           // Not stored in DB currently
}
```

### Paginated Response Model
```typescript
interface PaginatedResponse<T> {
  content: T[];                  // Array of items
  totalElements: number;         // Total count
  totalPages: number;            // Total pages
  size: number;                  // Items per page
  number: number;                // Current page (0-indexed)
  first: boolean;                // Is first page
  last: boolean;                 // Is last page
}
```

### API Response Model
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
}
```

### Analytics Model
```typescript
interface SystemAnalytics {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  approvedCourses: number;
  pendingCourses: number;
  rejectedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  totalAssignments: number;
  totalSubmissions: number;
  coursesByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
  enrollmentsByMonth: Record<string, number>;
}
```

---

## 🎯 Missing APIs & Recommendations

### Priority 1: Critical for Admin Course Management

#### 1. DELETE Unenroll Student
```
DELETE /api/v1/admin/courses/{courseId}/enrollments/{studentId}
```

**Why Needed**: Admin cần khả năng xóa enrollment khi học viên rút khỏi khóa học hoặc đăng ký nhầm

**Request**: No body needed

**Response**:
```json
{
  "success": true,
  "message": "Đã xóa enrollment thành công"
}
```

**Implementation Suggestion**:
- Check if enrollment exists
- Remove from course_enrollments table
- Return success/error message

---

#### 2. GET Enrollment Details with Metadata
```
GET /api/v1/admin/courses/{courseId}/enrollments?page=1&limit=20
```

**Why Needed**: Admin cần xem chi tiết enrollment với thông tin bổ sung (enrollment date, progress, last accessed)

**Response**:
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "studentId": "uuid",
        "studentName": "John Doe",
        "studentEmail": "john@example.com",
        "enrolledAt": "2024-02-15T10:30:00Z",
        "lastAccessedAt": "2024-03-10T14:20:00Z",
        "progress": 45.5,
        "completedLessons": 12,
        "totalLessons": 26
      }
    ],
    "totalElements": 45
  }
}
```

**Implementation Suggestion**:
- Join course_enrollments with users table
- Add enrollment_date column to course_enrollments table
- Calculate progress from student_lesson_progress table
- Add last_accessed_at tracking

---

#### 3. PATCH Direct Status Change
```
PATCH /api/v1/admin/courses/{courseId}/status
```

**Why Needed**: Admin cần thay đổi trạng thái khóa học trực tiếp mà không cần qua approve/reject flow

**Request Body**:
```json
{
  "status": "APPROVED",
  "comment": "Optional comment"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVED",
    "updatedAt": "2024-03-15T10:00:00Z"
  }
}
```

**Use Cases**:
- Revert REJECTED → DRAFT
- Force DRAFT → APPROVED (skip review)
- APPROVED → DRAFT (unpublish)

---

### Priority 2: Enhanced Search & Filtering

#### 4. GET Advanced Course Search
```
GET /api/v1/admin/courses/search
```

**Query Parameters**:
- `status`: Filter by status
- `teacherId`: Filter by teacher
- `dateFrom`: Created after date
- `dateTo`: Created before date
- `hasEnrollments`: true/false
- `minEnrollments`: Minimum enrollment count
- `search`: Text search
- `sortBy`: Field to sort by
- `sortOrder`: asc/desc

**Why Needed**: Admin dashboard cần tìm kiếm và filter phức tạp

**Response**: Same as GET /admin/courses/all but with advanced filtering

---

#### 5. GET User's All Enrollments (Admin View)
```
GET /api/v1/admin/users/{userId}/enrollments
```

**Why Needed**: Admin cần xem tất cả khóa học mà một user đã đăng ký

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "courseId": "uuid",
      "courseTitle": "Introduction to CS",
      "courseCode": "CS101",
      "teacherName": "John Doe",
      "enrolledAt": "2024-02-15T10:30:00Z",
      "progress": 45.5,
      "status": "APPROVED"
    }
  ]
}
```

---

### Priority 3: Bulk Operations

#### 6. POST Bulk Unenroll
```
POST /api/v1/admin/courses/{courseId}/bulk-unenroll
```

**Why Needed**: Admin cần xóa nhiều enrollment cùng lúc

**Request Body**:
```json
{
  "studentIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalProcessed": 3,
    "successCount": 3,
    "errorCount": 0
  }
}
```

---

#### 7. POST Bulk Status Change
```
POST /api/v1/admin/courses/bulk-status-change
```

**Why Needed**: Admin cần thay đổi trạng thái nhiều khóa học cùng lúc

**Request Body**:
```json
{
  "courseIds": ["uuid1", "uuid2"],
  "status": "APPROVED"
}
```

---

### Priority 4: Statistics & Reports

#### 8. GET Enrollment Statistics
```
GET /api/v1/admin/enrollments/stats
```

**Query Parameters**:
- `period`: daily/weekly/monthly/yearly
- `dateFrom`: Start date
- `dateTo`: End date
- `courseId`: Filter by course (optional)

**Why Needed**: Admin dashboard cần biểu đồ enrollment theo thời gian

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "data": [
      {
        "period": "2024-01",
        "enrollments": 450,
        "newStudents": 120
      },
      {
        "period": "2024-02",
        "enrollments": 520,
        "newStudents": 95
      }
    ]
  }
}
```

---

#### 9. GET Course Performance Report
```
GET /api/v1/admin/courses/{courseId}/report
```

**Why Needed**: Admin cần báo cáo chi tiết về hiệu suất khóa học

**Response**:
```json
{
  "success": true,
  "data": {
    "courseId": "uuid",
    "courseTitle": "Introduction to CS",
    "totalEnrollments": 150,
    "activeStudents": 120,
    "completionRate": 65.5,
    "averageProgress": 72.3,
    "totalLessons": 26,
    "totalAssignments": 12,
    "submissionRate": 85.2,
    "averageGrade": 78.5,
    "enrollmentTrend": [...]
  }
}
```

---

### Priority 5: User Management Enhancements

#### 10. POST Bulk User Creation
```
POST /api/v1/admin/users/bulk-create
```

**Why Needed**: Admin cần tạo nhiều user cùng lúc (import từ Excel)

**Request**: Multipart form with Excel file

**Excel Format**:
```
| username | email | fullName | role | password |
```

**Response**: Similar to bulk-enroll response

---

#### 11. GET User Activity Log
```
GET /api/v1/admin/users/{userId}/activity
```

**Why Needed**: Admin cần theo dõi hoạt động của user

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-03-15T10:30:00Z",
      "action": "LOGIN",
      "details": "Logged in from IP 192.168.1.1"
    },
    {
      "timestamp": "2024-03-15T10:35:00Z",
      "action": "ENROLL_COURSE",
      "details": "Enrolled in CS101"
    }
  ]
}
```

---

## 🔧 Database Schema Improvements

### 1. Add enrollment_date to course_enrollments
```sql
ALTER TABLE course_enrollments 
ADD COLUMN enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### 2. Add last_accessed tracking
```sql
CREATE TABLE user_course_access (
    user_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id)
);
```

### 3. Add activity log table
```sql
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📝 Frontend Implementation Notes

### Angular Service Structure
```typescript
// admin-course.service.ts
@Injectable()
export class AdminCourseService {
  getAllCourses(params: CourseQueryParams): Observable<PaginatedResponse<Course>>
  getPendingCourses(page: number, limit: number): Observable<PaginatedResponse<Course>>
  approveCourse(courseId: string): Observable<ApiResponse<string>>
  rejectCourse(courseId: string, reason: string): Observable<ApiResponse<string>>
  deleteCourse(courseId: string): Observable<ApiResponse<string>>
  getAnalytics(): Observable<ApiResponse<SystemAnalytics>>
}

// admin-user.service.ts
@Injectable()
export class AdminUserService {
  getAllUsers(params: UserQueryParams): Observable<PaginatedResponse<User>>
  getUserById(userId: string): Observable<ApiResponse<User>>
  createUser(user: CreateUserRequest): Observable<ApiResponse<User>>
  updateUser(userId: string, user: UpdateUserRequest): Observable<ApiResponse<User>>
  deleteUser(userId: string): Observable<ApiResponse<string>>
  toggleUserStatus(userId: string): Observable<ApiResponse<User>>
}

// enrollment.service.ts
@Injectable()
export class EnrollmentService {
  enrollStudent(courseId: string, email: string): Observable<ApiResponse<string>>
  bulkEnroll(courseId: string, file: File): Observable<ApiResponse<BulkEnrollmentResponse>>
  getEnrolledStudents(courseId: string): Observable<ApiResponse<EnrolledStudent[]>>
  getAvailableStudents(courseId: string, params: PaginationParams): Observable<PaginatedResponse<Student>>
}
```

### Error Handling
```typescript
// error-interceptor.ts
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  return next.handle(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Redirect to login
        this.router.navigate(['/login']);
      } else if (error.status === 403) {
        // Show permission denied message
        this.notificationService.error('Bạn không có quyền truy cập');
      }
      return throwError(() => error);
    })
  );
}
```

### Token Management
```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  private tokenKey = 'jwt_token';
  private refreshTokenKey = 'refresh_token';
  
  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
  
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  }
  
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    return this.http.post<AuthResponse>('/api/v1/auth/refresh', { refreshToken });
  }
}
```

---

## 🚀 Implementation Priority

### Phase 1: Critical (Week 1)
1. ✅ All existing APIs are working
2. ⚠️ Add enrollment_date to database
3. ⚠️ Implement DELETE unenroll endpoint
4. ⚠️ Implement GET enrollment details with metadata

### Phase 2: Enhanced Features (Week 2)
5. Implement PATCH direct status change
6. Implement advanced search
7. Implement bulk unenroll
8. Add user's enrollments view

### Phase 3: Analytics & Reports (Week 3)
9. Implement enrollment statistics
10. Implement course performance report
11. Add activity logging
12. Create dashboard widgets

### Phase 4: Bulk Operations (Week 4)
13. Implement bulk user creation
14. Implement bulk status change
15. Add export functionality (Excel/CSV)
16. Add import validation

---

**Generated**: 2025-12-01  
**Backend Version**: v1.0.0  
**Status**: Ready for Frontend Integration
