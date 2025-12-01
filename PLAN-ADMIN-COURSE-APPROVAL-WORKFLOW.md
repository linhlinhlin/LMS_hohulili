# 📋 KẾ HOẠCH: Hoàn thiện Luồng Quản lý Khóa học Admin-Teacher

## 🎯 MỤC TIÊU
Thay đổi luồng tạo khóa học từ "auto-approve" sang "admin approval workflow":
- **Hiện tại**: Teacher tạo khóa học → Status = APPROVED (tự động duyệt)
- **Mong muốn**: Teacher tạo khóa học → Status = PENDING → Admin review → APPROVED/REJECTED

---

## 📊 PHÂN TÍCH TÌNH HÌNH HIỆN TẠI

### ✅ Đã có sẵn (Working)
1. **Database Schema** ✅
   - Table `courses` có đầy đủ fields cho approval workflow
   - `status` enum: DRAFT, PENDING, APPROVED, REJECTED
   - `review_comment`, `reviewed_at`, `reviewed_by_id` đã có
   - Migration V3 đã tạo các fields này

2. **Admin APIs** ✅
   - `GET /admin/courses/pending` - Lấy khóa học chờ duyệt
   - `PATCH /admin/courses/{id}/approve` - Duyệt khóa học
   - `PATCH /admin/courses/{id}/reject` - Từ chối khóa học
   - `GET /admin/courses/all` - Xem tất cả khóa học
   - `GET /admin/analytics` - Thống kê hệ thống

3. **AdminService Logic** ✅
   - `approveCourse()` - Logic duyệt khóa học
   - `rejectCourse()` - Logic từ chối khóa học
   - `reviewCourse()` - Core review logic
   - `getPendingCourses()` - Lấy danh sách chờ duyệt

### ❌ Cần sửa (Issues)
1. **CourseService.createCourse()** ❌
   ```java
   // Line 31-32: Auto-approve
   .status(Course.CourseStatus.APPROVED)  // ← CẦN SỬA
   ```
   **Vấn đề**: Tạo khóa học mới tự động set status = APPROVED

2. **CourseService.submitForApproval()** ❌
   ```java
   // Line 72-78: No-op approval
   if (course.getStatus() != Course.CourseStatus.APPROVED) {
       course.setStatus(Course.CourseStatus.APPROVED);  // ← CẦN SỬA
   }
   ```
   **Vấn đề**: Tự động approve thay vì gửi cho admin

3. **CourseService.updateCourse()** ⚠️
   ```java
   // Line 50: Allow editing regardless of status
   // ← CẦN THÊM LOGIC
   ```
   **Vấn đề**: Cho phép edit mọi status, cần logic khi edit APPROVED course

4. **AdminService.reviewCourse()** ⚠️
   ```java
   // Line 42: Only PENDING can be reviewed
   if (course.getStatus() != Course.CourseStatus.PENDING)
   ```
   **Vấn đề**: Đúng nhưng cần thêm validation

---

## 🔧 KẾ HOẠCH THỰC HIỆN

### PHASE 1: Sửa Backend Logic (CRITICAL)

#### Task 1.1: Sửa CourseService.createCourse()
**File**: `api/src/main/java/com/example/lms/service/CourseService.java`

**Thay đổi**:
```java
// FROM:
.status(Course.CourseStatus.APPROVED)

// TO:
.status(Course.CourseStatus.PENDING)  // Chờ admin duyệt
```

**Impact**: 
- Teacher tạo khóa học mới → Status = PENDING
- Khóa học không hiển thị công khai cho đến khi admin approve
- Teacher vẫn thấy khóa học trong "My Courses"

---

#### Task 1.2: Sửa CourseService.submitForApproval()
**File**: `api/src/main/java/com/example/lms/service/CourseService.java`

**Thay đổi**:
```java
// FROM:
if (course.getStatus() != Course.CourseStatus.APPROVED) {
    course.setStatus(Course.CourseStatus.APPROVED);
}

// TO:
// Only allow submitting DRAFT or REJECTED courses
if (course.getStatus() == Course.CourseStatus.DRAFT || 
    course.getStatus() == Course.CourseStatus.REJECTED) {
    course.setStatus(Course.CourseStatus.PENDING);
    courseRepository.save(course);
} else if (course.getStatus() == Course.CourseStatus.PENDING) {
    throw new RuntimeException("Khóa học đang chờ admin duyệt");
} else {
    throw new RuntimeException("Khóa học đã được duyệt");
}
```

**Impact**:
- Teacher có thể submit lại khóa học bị REJECTED
- Không thể submit khóa học đang PENDING hoặc đã APPROVED

---

#### Task 1.3: Cải thiện CourseService.updateCourse()
**File**: `api/src/main/java/com/example/lms/service/CourseService.java`

**Thêm logic**:
```java
// After line 50, add:
// If course is APPROVED, editing will change status back to PENDING
if (course.getStatus() == Course.CourseStatus.APPROVED) {
    course.setStatus(Course.CourseStatus.PENDING);
    // Clear previous review info
    course.setReviewComment(null);
    course.setReviewedAt(null);
    course.setReviewedBy(null);
}
```

**Impact**:
- Khi teacher edit khóa học đã APPROVED → Status quay về PENDING
- Admin phải review lại
- Đảm bảo chất lượng nội dung

---

#### Task 1.4: Thêm validation AdminService.reviewCourse()
**File**: `api/src/main/java/com/example/lms/service/AdminService.java`

**Thêm validation**:
```java
// After line 42, add more checks:
if (course.getStatus() != Course.CourseStatus.PENDING) {
    throw new RuntimeException("Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt. " +
        "Trạng thái hiện tại: " + course.getStatus().getDisplayName());
}

// Validate comment for rejection
if (!request.isApproved() && 
    (request.getComment() == null || request.getComment().trim().isEmpty())) {
    throw new RuntimeException("Vui lòng nhập lý do từ chối");
}
```

---

### PHASE 2: Cập nhật Frontend Admin (UI)

#### Task 2.1: Tạo Course Management Page
**File**: `fe/src/app/features/admin/presentation/components/course-management.component.ts`

**Features cần có**:
1. **Tab Navigation**:
   - All Courses (tất cả)
   - Pending (chờ duyệt) - Badge với số lượng
   - Approved (đã duyệt)
   - Rejected (bị từ chối)
   - Draft (nháp)

2. **Course List Table**:
   - Columns: Code, Title, Teacher, Status, Enrolled, Created Date, Actions
   - Pagination
   - Search by title
   - Filter by status
   - Sort by date

3. **Actions**:
   - View Details (modal)
   - Approve (button - chỉ cho PENDING)
   - Reject (button + modal nhập lý do - chỉ cho PENDING)
   - Delete (button - chỉ cho DRAFT/REJECTED)

---

#### Task 2.2: Tạo Course Detail Modal
**Component**: `course-detail-modal.component.ts`

**Hiển thị**:
- Course Info: Code, Title, Description
- Teacher Info: Name, Email
- Statistics: Sections count, Lessons count, Enrolled students
- Status Badge với màu sắc
- Review History (nếu có): Comment, Reviewed by, Reviewed at
- Content Preview: List sections và lessons

**Actions trong modal**:
- Approve button (nếu PENDING)
- Reject button (nếu PENDING)
- Close button

---

#### Task 2.3: Tạo Reject Reason Modal
**Component**: `course-reject-modal.component.ts`

**Form**:
```typescript
{
  reason: string (required, min 10 chars)
}
```

**Validation**:
- Reason không được để trống
- Tối thiểu 10 ký tự
- Hiển thị character count

---

#### Task 2.4: Cập nhật Admin Service
**File**: `fe/src/app/features/admin/infrastructure/services/admin.service.ts`

**Thêm methods**:
```typescript
// Get all courses with filters
getAllCourses(params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}): Observable<ApiResponse<Page<Course>>>

// Get pending courses
getPendingCourses(page: number, limit: number): Observable<ApiResponse<Page<Course>>>

// Approve course
approveCourse(courseId: string): Observable<ApiResponse<string>>

// Reject course
rejectCourse(courseId: string, reason: string): Observable<ApiResponse<string>>

// Get course details
getCourseDetails(courseId: string): Observable<ApiResponse<Course>>

// Delete course
deleteCourse(courseId: string): Observable<ApiResponse<string>>
```

---

### PHASE 3: Cập nhật Teacher Dashboard

#### Task 3.1: Hiển thị Course Status
**File**: `fe/src/app/features/teacher/courses/course-management.component.ts`

**Thêm**:
- Status badge cho mỗi khóa học
- Tooltip giải thích status
- Filter by status
- Notification khi khóa học bị reject

---

#### Task 3.2: Thêm Submit for Review Button
**Chỉ hiển thị khi**:
- Status = DRAFT hoặc REJECTED
- Teacher là owner

**Action**:
- Call API `PATCH /courses/{id}/publish`
- Show success message
- Refresh course list

---

#### Task 3.3: Hiển thị Review Feedback
**Khi status = REJECTED**:
- Hiển thị review comment từ admin
- Reviewed by (admin name)
- Reviewed at (timestamp)
- Button "Edit & Resubmit"

---

### PHASE 4: Notification System (Optional - Future)

#### Task 4.1: Email Notifications
- Teacher nhận email khi khóa học được approve
- Teacher nhận email khi khóa học bị reject (kèm lý do)
- Admin nhận email khi có khóa học mới chờ duyệt

#### Task 4.2: In-App Notifications
- Badge notification count trên admin menu
- Toast notification khi có khóa học mới
- Notification center

---

## 📝 IMPLEMENTATION CHECKLIST

### Backend Changes
- [ ] 1.1 Sửa CourseService.createCourse() - Set status = PENDING
- [ ] 1.2 Sửa CourseService.submitForApproval() - Logic submit đúng
- [ ] 1.3 Cải thiện CourseService.updateCourse() - Reset status khi edit
- [ ] 1.4 Thêm validation AdminService.reviewCourse()
- [ ] Test tất cả APIs với Postman/Swagger

### Frontend Admin
- [ ] 2.1 Tạo Course Management Page với tabs
- [ ] 2.2 Tạo Course Detail Modal
- [ ] 2.3 Tạo Reject Reason Modal
- [ ] 2.4 Cập nhật Admin Service
- [ ] 2.5 Integrate với backend APIs
- [ ] 2.6 Add loading states và error handling
- [ ] 2.7 Add success/error toasts

### Frontend Teacher
- [ ] 3.1 Hiển thị course status badges
- [ ] 3.2 Thêm Submit for Review button
- [ ] 3.3 Hiển thị review feedback
- [ ] 3.4 Update course list UI
- [ ] 3.5 Add tooltips và help text

### Testing
- [ ] Test create course → PENDING
- [ ] Test submit for approval → PENDING
- [ ] Test admin approve → APPROVED
- [ ] Test admin reject → REJECTED
- [ ] Test edit APPROVED course → PENDING
- [ ] Test resubmit REJECTED course → PENDING
- [ ] Test enrollment chỉ cho APPROVED courses
- [ ] Test permissions (teacher vs admin)

---

## 🎨 UI/UX DESIGN NOTES

### Status Badge Colors
```typescript
DRAFT: gray (#6B7280)
PENDING: yellow (#F59E0B)
APPROVED: green (#10B981)
REJECTED: red (#EF4444)
```

### Course Management Layout
```
┌─────────────────────────────────────────────────────┐
│ Quản lý Khóa học                                    │
├─────────────────────────────────────────────────────┤
│ [All] [Pending (5)] [Approved] [Rejected] [Draft]  │
├─────────────────────────────────────────────────────┤
│ Search: [___________] Filter: [Status ▼]           │
├─────────────────────────────────────────────────────┤
│ Code  │ Title      │ Teacher │ Status  │ Actions   │
│ CS101 │ Intro CS   │ John    │ PENDING │ [View]    │
│ CS102 │ Advanced   │ Jane    │ APPROVED│ [View]    │
└─────────────────────────────────────────────────────┘
```

### Course Detail Modal
```
┌─────────────────────────────────────────────────────┐
│ Chi tiết Khóa học                          [X]      │
├─────────────────────────────────────────────────────┤
│ Mã: CS101                    Status: [PENDING]      │
│ Tên: Introduction to Computer Science               │
│ Giảng viên: John Doe (john@example.com)            │
│                                                      │
│ Mô tả:                                              │
│ Learn the fundamentals of computer science...       │
│                                                      │
│ Thống kê:                                           │
│ - Sections: 8                                       │
│ - Lessons: 26                                       │
│ - Enrolled: 0 (chưa approve)                        │
│                                                      │
│ Nội dung:                                           │
│ 1. Introduction (3 lessons)                         │
│ 2. Variables (4 lessons)                            │
│ ...                                                  │
├─────────────────────────────────────────────────────┤
│ [Approve] [Reject] [Close]                          │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 DEPLOYMENT PLAN

### Step 1: Backend Deployment
1. Backup database
2. Deploy backend changes
3. Test APIs với Swagger
4. Verify existing courses still work

### Step 2: Frontend Deployment
1. Deploy admin UI changes
2. Test admin workflow
3. Deploy teacher UI changes
4. Test teacher workflow

### Step 3: Data Migration (if needed)
```sql
-- Update existing APPROVED courses to PENDING if needed
-- (Optional - chỉ nếu muốn review lại tất cả)
UPDATE courses 
SET status = 'PENDING' 
WHERE status = 'APPROVED' 
AND reviewed_at IS NULL;
```

---

## 📊 SUCCESS METRICS

### Functional Requirements
- ✅ Teacher tạo khóa học → Status = PENDING
- ✅ Admin có thể xem danh sách khóa học chờ duyệt
- ✅ Admin có thể approve/reject với lý do
- ✅ Teacher nhận feedback khi bị reject
- ✅ Teacher có thể resubmit sau khi sửa
- ✅ Chỉ APPROVED courses hiển thị công khai
- ✅ Edit APPROVED course → quay về PENDING

### Performance
- API response time < 500ms
- Page load time < 2s
- Smooth pagination

### User Experience
- Clear status indicators
- Helpful error messages
- Intuitive workflow
- Mobile responsive

---

## 🔗 RELATED FILES

### Backend
- `api/src/main/java/com/example/lms/service/CourseService.java`
- `api/src/main/java/com/example/lms/service/AdminService.java`
- `api/src/main/java/com/example/lms/controller/CourseController.java`
- `api/src/main/java/com/example/lms/controller/AdminController.java`
- `api/src/main/java/com/example/lms/entity/Course.java`

### Frontend Admin
- `fe/src/app/features/admin/presentation/components/course-management.component.ts`
- `fe/src/app/features/admin/infrastructure/services/admin.service.ts`

### Frontend Teacher
- `fe/src/app/features/teacher/courses/course-management.component.ts`
- `fe/src/app/features/teacher/courses/course-editor.component.ts`

---

**Created**: 2025-12-01  
**Status**: Ready for Implementation  
**Priority**: HIGH  
**Estimated Time**: 2-3 days
