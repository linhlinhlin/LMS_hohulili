# Design Document - Course Approval Workflow

## Overview

This design implements a comprehensive course approval workflow system that allows teachers to manage course drafts, submit them for admin review, and enables admins to approve or reject courses with detailed feedback. The system maintains the existing database schema while adding new business logic and API endpoints to support the workflow.

## Architecture

### High-Level Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Teacher   │────────▶│  CourseAPI   │────────▶│  Database   │
│   Frontend  │         │  Controller  │         │   (Course)  │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │
                               ▼
                        ┌──────────────┐
                        │ CourseService│
                        │   (Business  │
                        │    Logic)    │
                        └──────────────┘
                               │
                               │
┌─────────────┐                │
│    Admin    │────────────────┘
│   Frontend  │
└─────────────┘
```

### State Machine Diagram

```
                    ┌──────────┐
                    │  DRAFT   │◀────────┐
                    └──────────┘         │
                         │               │
                         │ submit        │ cancel
                         ▼               │
                    ┌──────────┐         │
                    │ PENDING  │─────────┘
                    └──────────┘
                         │
                ┌────────┴────────┐
                │                 │
          approve│                 │reject
                │                 │
                ▼                 ▼
           ┌──────────┐      ┌──────────┐
           │ APPROVED │      │ REJECTED │
           └──────────┘      └──────────┘
                │                 │
                │ edit            │ resubmit
                │                 │
                └────────┬────────┘
                         │
                         ▼
                    ┌──────────┐
                    │ PENDING  │
                    └──────────┘
```

## Components and Interfaces

### 1. Backend Components

#### 1.1 Course Entity (Existing - No Changes Needed)
The `Course` entity already has all required fields:
- `status`: CourseStatus enum (DRAFT, PENDING, APPROVED, REJECTED)
- `reviewComment`: Text field for admin feedback
- `reviewedAt`: Timestamp of review
- `reviewedBy`: Reference to admin who reviewed

#### 1.2 CourseService (Modifications Required)
**File**: `api/src/main/java/com/example/lms/service/CourseService.java`

**New/Modified Methods**:
```java
// Modify existing method
public Course createCourse(User teacher, CreateCourseRequest request) {
    // Change status from APPROVED to DRAFT
    course.setStatus(Course.CourseStatus.DRAFT);
}

// Add new method
public Course submitForApproval(UUID courseId, User teacher) {
    // Validate course is DRAFT or REJECTED
    // Change status to PENDING
    // Clear previous review data
}

// Add new method
public Course cancelApprovalRequest(UUID courseId, User teacher) {
    // Validate course is PENDING
    // Change status back to DRAFT
}

// Modify existing method
public Course updateCourse(UUID courseId, User teacher, UpdateCourseRequest request) {
    // If course is PENDING, throw error
    // If course is APPROVED and edited, change to PENDING
}
```

#### 1.3 AdminService (New Methods Required)
**File**: `api/src/main/java/com/example/lms/service/AdminService.java`

**New Methods**:
```java
public Page<Course> getPendingCourses(Pageable pageable, String search);
public Course approveCourse(UUID courseId, User admin);
public Course rejectCourse(UUID courseId, User admin, String reviewComment);
public Page<Course> getAllCoursesWithStatus(Pageable pageable, String status, String search);
```

#### 1.4 CourseController (New Endpoints Required)
**File**: `api/src/main/java/com/example/lms/controller/CourseController.java`

**New Endpoints**:
```java
// Teacher endpoints
POST   /api/v1/courses/{courseId}/submit-for-approval
POST   /api/v1/courses/{courseId}/cancel-approval
GET    /api/v1/courses/{courseId}/review-status

// Modify existing
POST   /api/v1/courses  // Change to create with DRAFT status
PUT    /api/v1/courses/{courseId}  // Add PENDING check
```

#### 1.5 AdminController (New Endpoints Required)
**File**: `api/src/main/java/com/example/lms/controller/AdminController.java`

**New Endpoints**:
```java
GET    /api/v1/admin/courses/pending
POST   /api/v1/admin/courses/{courseId}/approve
POST   /api/v1/admin/courses/{courseId}/reject
GET    /api/v1/admin/courses  // All courses with filters
GET    /api/v1/admin/courses/{courseId}/details  // Full course preview
```

### 2. Frontend Components

#### 2.1 Teacher Course Management
**File**: `fe/src/app/features/teacher/courses/course-management.component.ts`

**New Features**:
- Display course status badges (Draft, Pending, Approved, Rejected)
- "Submit for Approval" button for DRAFT/REJECTED courses
- "Cancel Request" button for PENDING courses
- Display review comments for REJECTED courses
- Disable edit button for PENDING courses

#### 2.2 Teacher Course Editor
**File**: `fe/src/app/features/teacher/courses/course-editor.component.ts`

**New Features**:
- Check course status before allowing edits
- Show warning when editing APPROVED course (will require re-approval)
- Display review feedback for REJECTED courses

#### 2.3 Admin Course Review Dashboard (New Component)
**File**: `fe/src/app/features/admin/presentation/components/course-review.component.ts`

**Features**:
- List of pending courses
- Course preview modal with full details
- Approve button
- Reject button with required comment field
- Filter by status (All, Pending, Approved, Rejected)
- Search by course name or teacher

#### 2.4 Admin Course Management
**File**: `fe/src/app/features/admin/presentation/components/course-management.component.ts`

**New Features**:
- View all courses with status
- Quick approve/reject actions
- View course details
- Filter and search

## Data Models

### Course Status Enum (Existing)
```java
public enum CourseStatus {
    DRAFT("Bản nháp"),
    PENDING("Chờ duyệt"),
    APPROVED("Đã duyệt"),
    REJECTED("Bị từ chối");
}
```

### New DTOs

#### CourseReviewRequest
```java
public class CourseReviewRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String reviewComment;
}
```

#### CourseReviewStatus
```java
public class CourseReviewStatus {
    private UUID courseId;
    private String status;
    private String reviewComment;
    private Instant reviewedAt;
    private String reviewedByName;
}
```

#### PendingCourseDTO
```java
public class PendingCourseDTO {
    private UUID id;
    private String code;
    private String title;
    private String description;
    private String teacherName;
    private UUID teacherId;
    private Instant submittedAt;  // updatedAt when status changed to PENDING
    private int sectionsCount;
    private int lessonsCount;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Draft Creation
*For any* teacher creating a new course, the course status should be set to DRAFT
**Validates: Requirements 1.1**

### Property 2: Status Transition Validity
*For any* course status transition, the transition should only occur if it follows valid state machine rules (DRAFT→PENDING, PENDING→APPROVED, PENDING→REJECTED, PENDING→DRAFT, REJECTED→PENDING, APPROVED→PENDING)
**Validates: Requirements 2.1, 2.2, 3.1, 4.1, 5.2, 10.1**

### Property 3: Pending Course Immutability
*For any* course in PENDING status, attempts to edit course properties should be rejected
**Validates: Requirements 7.1, 7.5**

### Property 4: Review Comment Requirement
*For any* course rejection, a non-empty review comment must be provided
**Validates: Requirements 5.1, 5.7**

### Property 5: Marketplace Visibility
*For any* student browsing the marketplace, only courses with APPROVED status should be visible
**Validates: Requirements 6.1**

### Property 6: Direct Access Restriction
*For any* student attempting to access a non-APPROVED course by direct URL, the system should return an error
**Validates: Requirements 6.2**

### Property 7: Teacher Visibility
*For any* teacher viewing their course list, all courses they created should be visible regardless of status
**Validates: Requirements 6.3**

### Property 8: Enrollment Restriction
*For any* course in DRAFT, PENDING, or REJECTED status, student enrollment attempts should be rejected
**Validates: Requirements 6.5**

### Property 9: Approval Metadata
*For any* course approval, the system should record the approving admin and timestamp
**Validates: Requirements 4.3, 4.4**

### Property 10: Rejection Metadata
*For any* course rejection, the system should record the rejecting admin, timestamp, and review comment
**Validates: Requirements 5.3, 5.4, 5.5**

### Property 11: Re-edit Triggers Review
*For any* APPROVED course that is edited, the status should change to PENDING
**Validates: Requirements 7.4, 10.1**

### Property 12: Enrolled Students Access
*For any* course that changes from APPROVED to PENDING, already-enrolled students should retain access
**Validates: Requirements 10.2**

## Error Handling

### Error Scenarios

1. **Invalid Status Transition**
   - Error: "Cannot perform this action on a course with status {current_status}"
   - HTTP Status: 400 Bad Request

2. **Edit Pending Course**
   - Error: "Cannot edit course while it is pending admin review. Cancel the approval request first."
   - HTTP Status: 403 Forbidden

3. **Missing Review Comment**
   - Error: "Review comment is required when rejecting a course"
   - HTTP Status: 400 Bad Request

4. **Unauthorized Access**
   - Error: "You do not have permission to perform this action"
   - HTTP Status: 403 Forbidden

5. **Non-Approved Course Access (Student)**
   - Error: "This course is not available. It may be under review or has been rejected."
   - HTTP Status: 404 Not Found

6. **Enrollment on Non-Approved Course**
   - Error: "Cannot enroll in a course that is not approved"
   - HTTP Status: 400 Bad Request

## Testing Strategy

### Unit Testing

We will write unit tests for:
- Course status transitions
- Permission checks for each action
- Validation logic for review comments
- Visibility rules for different user roles

### Property-Based Testing

We will use **JUnit 5** with **jqwik** (Java property-based testing library) for property-based tests.

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with a comment referencing the correctness property
- Use the format: `**Feature: course-approval-workflow, Property {number}: {property_text}**`

Example:
```java
@Property
// **Feature: course-approval-workflow, Property 1: Draft Creation**
void newCourseShouldStartWithDraftStatus(@ForAll("teachers") User teacher, 
                                         @ForAll("courseRequests") CreateCourseRequest request) {
    Course course = courseService.createCourse(teacher, request);
    assertEquals(Course.CourseStatus.DRAFT, course.getStatus());
}
```

### Integration Testing

Integration tests will cover:
- Full workflow from course creation to approval
- API endpoint responses for different user roles
- Database state changes during status transitions

## Implementation Notes

### Phase 1: Backend Core Logic
1. Modify `CourseService.createCourse()` to set DRAFT status
2. Add status transition methods to `CourseService`
3. Add validation logic for status transitions
4. Add admin review methods to `AdminService`

### Phase 2: Backend API Endpoints
1. Add teacher endpoints for submit/cancel approval
2. Add admin endpoints for approve/reject
3. Update existing endpoints with new validation

### Phase 3: Frontend Teacher Interface
1. Update course management UI with status badges
2. Add submit/cancel buttons
3. Add edit restrictions for PENDING courses
4. Display review feedback

### Phase 4: Frontend Admin Interface
1. Create admin course review dashboard
2. Add pending courses list
3. Add course preview modal
4. Add approve/reject actions with comment field

### Phase 5: Testing & Refinement
1. Write unit tests
2. Write property-based tests
3. Write integration tests
4. Manual testing of full workflow
5. Bug fixes and refinements

## Security Considerations

1. **Authorization**: Ensure only course owners can submit/cancel approval
2. **Admin-Only Actions**: Approve/reject actions must be restricted to ADMIN role
3. **Data Validation**: Validate all inputs, especially review comments
4. **Audit Trail**: Log all status changes with user and timestamp
5. **Prevent Tampering**: Validate status transitions server-side, never trust client

## Performance Considerations

1. **Pagination**: All course lists should be paginated
2. **Lazy Loading**: Course relationships should be lazy-loaded
3. **Indexing**: Add database index on `status` column for faster filtering
4. **Caching**: Consider caching approved courses list for marketplace

## Future Enhancements

1. **Email Notifications**: Send emails when course is approved/rejected
2. **Status History Table**: Track all status changes in separate table
3. **Bulk Actions**: Allow admin to approve/reject multiple courses at once
4. **Auto-Approval Rules**: Automatically approve courses from trusted teachers
5. **Review Checklist**: Provide admins with a checklist of items to review
6. **Version Control**: Keep versions of course content for comparison
