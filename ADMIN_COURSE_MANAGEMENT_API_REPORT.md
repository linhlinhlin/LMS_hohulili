# 📋 BÁO CÁO API QUẢN LÝ KHÓA HỌC - ADMIN

## 🎯 TỔNG QUAN

Hệ thống LMS Hàng Hải có flow quản lý khóa học như sau:
1. **Teacher** tạo khóa học → Trạng thái: `DRAFT`
2. **Teacher** submit khóa học để duyệt → Trạng thái: `PENDING`
3. **Admin** xem danh sách khóa học chờ duyệt
4. **Admin** duyệt hoặc từ chối khóa học
   - Duyệt → Trạng thái: `APPROVED` (Xuất bản)
   - Từ chối → Trạng thái: `REJECTED`

---

## 🔗 DANH SÁCH API ENDPOINTS

### 1. **Lấy danh sách khóa học chờ duyệt**

**Frontend Endpoint:**
```typescript
PENDING_COURSES: '/api/v1/admin/courses/pending'
```

**Backend Controller:**
```java
@GetMapping("/courses/pending")
public ResponseEntity<ApiResponse<Page<PendingCourseSummary>>> getPendingCourses(
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "10") int limit
)
```

**Service Method:**
```java
public Page<Course> getPendingCourses(Pageable pageable) {
    return courseRepository.findByStatus(Course.CourseStatus.PENDING, pageable);
}
```

**Request:**
- Method: `GET`
- URL: `/api/v1/admin/courses/pending?page=1&limit=10`
- Headers: `Authorization: Bearer <token>`
- Role Required: `ADMIN`

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "code": "COURSE001",
        "title": "Lập trình Java cơ bản",
        "description": "Khóa học Java cho người mới bắt đầu",
        "teacherId": "uuid",
        "teacherName": "Nguyễn Văn A",
        "teacherEmail": "teacher@example.com",
        "sectionsCount": 5,
        "submittedAt": "2025-11-13T10:00:00Z",
        "createdAt": "2025-11-10T08:00:00Z"
      }
    ],
    "totalElements": 10,
    "totalPages": 1,
    "number": 0,
    "size": 10
  }
}
```

---

### 2. **Duyệt khóa học**

**Frontend Endpoint:**
```typescript
APPROVE_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}/approve`
```

**Backend Controller:**
```java
@PatchMapping("/courses/{courseId}/approve")
public ResponseEntity<ApiResponse<String>> approveCourse(
    @PathVariable UUID courseId,
    @AuthenticationPrincipal User currentUser
)
```

**Service Method:**
```java
public void approveCourse(UUID courseId, User currentUser) {
    ReviewCourseRequest request = new ReviewCourseRequest();
    request.setApproved(true);
    reviewCourse(courseId, request);
}

public Course reviewCourse(UUID courseId, ReviewCourseRequest request) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học"));
    
    if (course.getStatus() != Course.CourseStatus.PENDING) {
        throw new RuntimeException("Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt");
    }

    course.setStatus(Course.CourseStatus.APPROVED);
    return courseRepository.save(course);
}
```

**Request:**
- Method: `PATCH`
- URL: `/api/v1/admin/courses/{courseId}/approve`
- Headers: `Authorization: Bearer <token>`
- Role Required: `ADMIN`
- Body: `{}` (empty)

**Response:**
```json
{
  "success": true,
  "data": "Khóa học đã được duyệt",
  "message": "Khóa học đã được duyệt"
}
```

---

### 3. **Từ chối khóa học**

**Frontend Endpoint:**
```typescript
REJECT_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}/reject`
```

**Backend Controller:**
```java
@PatchMapping("/courses/{courseId}/reject")
public ResponseEntity<ApiResponse<String>> rejectCourse(
    @PathVariable UUID courseId,
    @AuthenticationPrincipal User currentUser,
    @Valid @RequestBody RejectCourseRequest request
)
```

**Service Method:**
```java
public void rejectCourse(UUID courseId, User currentUser, RejectCourseRequest request) {
    ReviewCourseRequest reviewRequest = new ReviewCourseRequest();
    reviewRequest.setApproved(false);
    reviewRequest.setComment(request.getReason());
    reviewCourse(courseId, reviewRequest);
}
```

**Request:**
- Method: `PATCH`
- URL: `/api/v1/admin/courses/{courseId}/reject`
- Headers: `Authorization: Bearer <token>`
- Role Required: `ADMIN`
- Body:
```json
{
  "reason": "Nội dung khóa học chưa đầy đủ"
}
```

**Response:**
```json
{
  "success": true,
  "data": "Khóa học đã bị từ chối",
  "message": "Khóa học đã bị từ chối"
}
```

---

### 4. **Lấy tất cả khóa học (với filter)**

**Frontend Endpoint:**
```typescript
ALL_COURSES: '/api/v1/admin/courses/all'
```

**Backend Controller:**
```java
@GetMapping("/courses/all")
public ResponseEntity<ApiResponse<Page<AdminCourseSummary>>> getAllCourses(
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "10") int limit,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String search
)
```

**Service Method:**
```java
public Page<Course> getAllCourses(String search, Course.CourseStatus status, Pageable pageable) {
    if (search != null && !search.trim().isEmpty()) {
        if (status != null) {
            return courseRepository.findByStatusAndTitleContainingIgnoreCase(status, search, pageable);
        } else {
            return courseRepository.findByTitleContainingIgnoreCase(search, pageable);
        }
    } else {
        if (status != null) {
            return courseRepository.findByStatus(status, pageable);
        } else {
            return courseRepository.findAll(pageable);
        }
    }
}
```

**Request:**
- Method: `GET`
- URL: `/api/v1/admin/courses/all?page=1&limit=10&status=APPROVED&search=Java`
- Headers: `Authorization: Bearer <token>`
- Role Required: `ADMIN`
- Query Parameters:
  - `page`: Số trang (default: 1)
  - `limit`: Số item/trang (default: 10)
  - `status`: Filter theo trạng thái (DRAFT, PENDING, APPROVED, REJECTED)
  - `search`: Tìm kiếm theo tên khóa học

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "code": "COURSE001",
        "title": "Lập trình Java cơ bản",
        "status": "APPROVED",
        "teacherName": "Nguyễn Văn A",
        "enrolledCount": 150,
        "sectionsCount": 5,
        "assignmentsCount": 10,
        "createdAt": "2025-11-10T08:00:00Z",
        "updatedAt": "2025-11-13T10:00:00Z"
      }
    ],
    "totalElements": 50,
    "totalPages": 5,
    "number": 0,
    "size": 10
  }
}
```

---

### 5. **Xóa khóa học**

**Frontend Endpoint:**
```typescript
DELETE_COURSE: (courseId: string) => `/api/v1/admin/courses/${courseId}`
```

**Backend Controller:**
```java
// Chưa có endpoint DELETE trong AdminController
// Cần thêm:
@DeleteMapping("/courses/{courseId}")
public ResponseEntity<ApiResponse<String>> deleteCourse(@PathVariable UUID courseId)
```

**Service Method:**
```java
public void deleteCourse(UUID courseId) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học"));
    
    // Only allow deleting courses that are not published
    if (course.getStatus() == Course.CourseStatus.APPROVED) {
        throw new RuntimeException("Không thể xóa khóa học đã được xuất bản");
    }

    courseRepository.delete(course);
}
```

**Request:**
- Method: `DELETE`
- URL: `/api/v1/admin/courses/{courseId}`
- Headers: `Authorization: Bearer <token>`
- Role Required: `ADMIN`

**Response:**
```json
{
  "success": true,
  "data": "Khóa học đã được xóa",
  "message": "Course deleted successfully"
}
```

**⚠️ LƯU Ý:** Endpoint DELETE chưa được implement trong AdminController, cần thêm vào!

---

### 6. **Lấy thống kê hệ thống**

**Frontend Endpoint:**
```typescript
ANALYTICS: '/api/v1/admin/analytics'
```

**Backend Controller:**
```java
@GetMapping("/analytics")
public ResponseEntity<ApiResponse<SystemAnalytics>> getSystemAnalytics()
```

**Service Method:**
```java
public Map<String, Object> getSystemAnalytics() {
    Map<String, Object> analytics = new HashMap<>();
    
    // User statistics
    analytics.put("totalUsers", userRepository.count());
    analytics.put("totalTeachers", userRepository.countByRole(User.Role.TEACHER));
    analytics.put("totalStudents", userRepository.countByRole(User.Role.STUDENT));
    
    // Course statistics
    analytics.put("totalCourses", courseRepository.count());
    analytics.put("publishedCourses", courseRepository.countByStatus(Course.CourseStatus.APPROVED));
    analytics.put("pendingCourses", courseRepository.countByStatus(Course.CourseStatus.PENDING));
    analytics.put("rejectedCourses", courseRepository.countByStatus(Course.CourseStatus.REJECTED));
    analytics.put("draftCourses", courseRepository.countByStatus(Course.CourseStatus.DRAFT));
    
    return analytics;
}
```

**Request:**
- Method: `GET`
- URL: `/api/v1/admin/analytics`
- Headers: `Authorization: Bearer <token>`
- Role Required: `ADMIN`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "totalTeachers": 50,
    "totalStudents": 900,
    "totalAdmins": 5,
    "totalCourses": 100,
    "approvedCourses": 80,
    "pendingCourses": 10,
    "rejectedCourses": 5,
    "draftCourses": 5,
    "totalAssignments": 500,
    "totalSubmissions": 5000
  }
}
```

---

## 📊 TRẠNG THÁI KHÓA HỌC (Course Status)

```java
public enum CourseStatus {
    DRAFT,      // Nháp - Teacher đang soạn thảo
    PENDING,    // Chờ duyệt - Teacher đã submit, chờ Admin duyệt
    APPROVED,   // Đã duyệt - Admin đã duyệt, khóa học được xuất bản
    REJECTED    // Bị từ chối - Admin từ chối, cần chỉnh sửa
}
```

**Flow chuyển trạng thái:**
```
DRAFT → PENDING → APPROVED (hoặc REJECTED)
                ↓
            REJECTED → DRAFT (Teacher chỉnh sửa lại)
```

---

## 🔐 PHÂN QUYỀN (Authorization)

Tất cả các API trên yêu cầu:
- **Authentication**: Bearer Token trong header
- **Authorization**: Role `ADMIN`

```java
@PreAuthorize("hasRole('ADMIN')")
```

---

## 📝 DATA TRANSFER OBJECTS (DTOs)

### PendingCourseSummary
```java
public class PendingCourseSummary {
    private UUID id;
    private String code;
    private String title;
    private String description;
    private UUID teacherId;
    private String teacherName;
    private String teacherEmail;
    private int sectionsCount;
    private Instant submittedAt;
    private Instant createdAt;
}
```

### AdminCourseSummary
```java
public class AdminCourseSummary {
    private UUID id;
    private String code;
    private String title;
    private String status;
    private String teacherName;
    private int enrolledCount;
    private int sectionsCount;
    private int assignmentsCount;
    private Instant createdAt;
    private Instant updatedAt;
}
```

### RejectCourseRequest
```java
public class RejectCourseRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String reason;
}
```

---

## 🛠️ CÁC VẤN ĐỀ CẦN ĐIỀU CHỈNH

### 1. ⚠️ **Thiếu DELETE Endpoint trong AdminController**

**Vấn đề:** Frontend có endpoint `DELETE_COURSE` nhưng backend chưa implement.

**Giải pháp:** Thêm vào `AdminController.java`:

```java
@DeleteMapping("/courses/{courseId}")
@Operation(summary = "Xóa khóa học", description = "Admin xóa một khóa học (chỉ xóa được khóa học chưa xuất bản)")
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

### 2. ⚠️ **Course Entity thiếu fields cho review**

**Vấn đề:** Khi admin duyệt/từ chối, cần lưu thông tin:
- `reviewComment`: Nhận xét của admin
- `reviewedAt`: Thời gian duyệt
- `reviewedBy`: Admin nào duyệt

**Giải pháp:** Thêm vào `Course.java`:

```java
@Entity
public class Course {
    // ... existing fields ...
    
    private String reviewComment;
    private Instant reviewedAt;
    
    @ManyToOne
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;
    
    // Getters and Setters
}
```

Và cập nhật `AdminService.reviewCourse()`:

```java
public Course reviewCourse(UUID courseId, ReviewCourseRequest request) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học"));
    
    if (course.getStatus() != Course.CourseStatus.PENDING) {
        throw new RuntimeException("Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt");
    }

    if (request.isApproved()) {
        course.setStatus(Course.CourseStatus.APPROVED);
    } else {
        course.setStatus(Course.CourseStatus.REJECTED);
    }
    
    // ✅ Thêm thông tin review
    course.setReviewComment(request.getComment());
    course.setReviewedAt(Instant.now());
    course.setReviewedBy(currentUser);
    
    return courseRepository.save(course);
}
```

---

### 3. ⚠️ **Thiếu notification cho Teacher**

**Vấn đề:** Khi admin duyệt/từ chối, teacher không nhận được thông báo.

**Giải pháp:** Thêm notification service:

```java
@Service
public class NotificationService {
    public void notifyCourseApproved(Course course) {
        // Send email to teacher
        // Create in-app notification
    }
    
    public void notifyCourseRejected(Course course, String reason) {
        // Send email to teacher with rejection reason
        // Create in-app notification
    }
}
```

Và gọi trong `AdminService`:

```java
public void approveCourse(UUID courseId, User currentUser) {
    Course course = reviewCourse(courseId, ...);
    notificationService.notifyCourseApproved(course);
}

public void rejectCourse(UUID courseId, User currentUser, RejectCourseRequest request) {
    Course course = reviewCourse(courseId, ...);
    notificationService.notifyCourseRejected(course, request.getReason());
}
```

---

### 4. ⚠️ **Thiếu validation cho course submission**

**Vấn đề:** Teacher có thể submit khóa học chưa hoàn thiện.

**Giải pháp:** Thêm validation trong `CourseService`:

```java
public void submitCourseForReview(UUID courseId) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học"));
    
    // Validate course completeness
    if (course.getSections().isEmpty()) {
        throw new RuntimeException("Khóa học phải có ít nhất 1 chương");
    }
    
    if (course.getTitle() == null || course.getTitle().trim().isEmpty()) {
        throw new RuntimeException("Khóa học phải có tiêu đề");
    }
    
    if (course.getDescription() == null || course.getDescription().trim().isEmpty()) {
        throw new RuntimeException("Khóa học phải có mô tả");
    }
    
    // Change status to PENDING
    course.setStatus(Course.CourseStatus.PENDING);
    courseRepository.save(course);
}
```

---

### 5. ⚠️ **Thiếu audit log**

**Vấn đề:** Không có log để track ai duyệt/từ chối khóa học nào, khi nào.

**Giải pháp:** Thêm `AuditLog` entity:

```java
@Entity
public class AuditLog {
    @Id
    @GeneratedValue
    private UUID id;
    
    private String action; // "APPROVE_COURSE", "REJECT_COURSE"
    private String entityType; // "COURSE"
    private UUID entityId;
    
    @ManyToOne
    private User performedBy;
    
    private Instant performedAt;
    private String details; // JSON with additional info
}
```

---

## 📈 FRONTEND INTEGRATION

### Admin Service (TypeScript)

```typescript
// fe/src/app/features/admin/infrastructure/services/admin.service.ts

getPendingCourses(params: any = {}): Observable<{ data: PendingCourseSummary[]; pagination: any }> {
  return this.apiClient.getWithResponse<PendingCourseSummary[]>(
    ADMIN_ENDPOINTS.PENDING_COURSES, 
    { params }
  );
}

approveCourse(courseId: string): Observable<{ message: string }> {
  return this.apiClient.patchWithResponse<string>(
    ADMIN_ENDPOINTS.APPROVE_COURSE(courseId), 
    {}
  );
}

rejectCourse(courseId: string, reason: string): Observable<{ message: string }> {
  return this.apiClient.patchWithResponse<string>(
    ADMIN_ENDPOINTS.REJECT_COURSE(courseId), 
    { reason }
  );
}

getAllCourses(params: any = {}): Observable<{ data: AdminCourseSummary[]; pagination: any }> {
  return this.apiClient.getWithResponse<AdminCourseSummary[]>(
    ADMIN_ENDPOINTS.ALL_COURSES, 
    { params }
  );
}

deleteCourse(courseId: string): Observable<{ message: string }> {
  return this.apiClient.deleteWithResponse<string>(
    ADMIN_ENDPOINTS.DELETE_COURSE(courseId)
  );
}
```

---

## 🎯 CHECKLIST HOÀN THIỆN HỆ THỐNG

- [x] API lấy danh sách khóa học chờ duyệt
- [x] API duyệt khóa học
- [x] API từ chối khóa học
- [x] API lấy tất cả khóa học với filter
- [x] Service logic xử lý duyệt/từ chối
- [ ] **API xóa khóa học (cần thêm DELETE endpoint)**
- [ ] **Course entity: thêm reviewComment, reviewedAt, reviewedBy**
- [ ] **Notification service: thông báo cho teacher**
- [ ] **Validation: kiểm tra khóa học trước khi submit**
- [ ] **Audit log: track hành động admin**
- [ ] **Email template: gửi email khi duyệt/từ chối**
- [ ] **Frontend UI: trang quản lý khóa học chờ duyệt**
- [ ] **Frontend UI: modal xem chi tiết khóa học**
- [ ] **Frontend UI: form từ chối với lý do**

---

## 📞 LIÊN HỆ & HỖ TRỢ

Nếu cần hỗ trợ thêm về:
- Implement các tính năng còn thiếu
- Tối ưu performance
- Thêm unit tests
- Cải thiện UX/UI

Vui lòng liên hệ team phát triển!

---

**Ngày tạo:** 16/11/2025  
**Phiên bản:** 1.0  
**Tác giả:** Kiro AI Assistant
