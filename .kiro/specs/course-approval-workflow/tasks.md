# Implementation Plan - Course Approval Workflow

- [x] 1. Update Course Creation to Use DRAFT Status



  - Modify `CourseService.createCourse()` to set status to DRAFT instead of APPROVED
  - Update any existing tests that expect APPROVED status on creation
  - _Requirements: 1.1_

- [ ]* 1.1 Write property test for draft creation
  - **Property 1: Draft Creation**





  - **Validates: Requirements 1.1**

- [x] 2. Implement Course Status Transition Logic

  - [x] 2.1 Add `submitForApproval()` method to CourseService


    - Validate course is in DRAFT or REJECTED status
    - Change status to PENDING
    - Clear previous review data (reviewComment, reviewedAt, reviewedBy)


    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Add `cancelApprovalRequest()` method to CourseService

    - Validate course is in PENDING status
    - Change status back to DRAFT
    - _Requirements: 3.1, 3.2_



  - [ ] 2.3 Modify `updateCourse()` method in CourseService
    - Add check to prevent editing PENDING courses
    - Add logic to change APPROVED courses to PENDING when edited
    - _Requirements: 7.1, 7.4, 7.5, 10.1_

  - [x]* 2.4 Write property test for status transitions




    - **Property 2: Status Transition Validity**
    - **Validates: Requirements 2.1, 2.2, 3.1, 4.1, 5.2, 10.1**

  - [x]* 2.5 Write property test for pending course immutability


    - **Property 3: Pending Course Immutability**
    - **Validates: Requirements 7.1, 7.5**

  - [x]* 2.6 Write property test for re-edit triggers review


    - **Property 11: Re-edit Triggers Review**
    - **Validates: Requirements 7.4, 10.1**

- [ ] 3. Implement Admin Review Methods
  - [x] 3.1 Add `getPendingCourses()` method to AdminService

    - Query courses with PENDING status
    - Support pagination and search
    - _Requirements: 8.1, 8.2_

  - [x] 3.2 Add `approveCourse()` method to AdminService

    - Validate course is in PENDING status
    - Change status to APPROVED
    - Record admin user and timestamp
    - _Requirements: 4.1, 4.2, 4.3, 4.4_


  - [x] 3.3 Add `rejectCourse()` method to AdminService

    - Validate course is in PENDING status
    - Require non-empty review comment
    - Change status to REJECTED






    - Record admin user, timestamp, and comment
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_



  - [x] 3.4 Add `getAllCoursesWithStatus()` method to AdminService

    - Query all courses with optional status filter

    - Support pagination and search
    - _Requirements: 6.4_

  - [x]* 3.5 Write property test for review comment requirement

    - **Property 4: Review Comment Requirement**
    - **Validates: Requirements 5.1, 5.7**


  - [x]* 3.6 Write property test for approval metadata

    - **Property 9: Approval Metadata**
    - **Validates: Requirements 4.3, 4.4**


  - [x]* 3.7 Write property test for rejection metadata


    - **Property 10: Rejection Metadata**
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [x] 4. Add Teacher API Endpoints

  - [x] 4.1 Add POST `/api/v1/courses/{courseId}/submit-for-approval` endpoint

    - Call `CourseService.submitForApproval()`
    - Require TEACHER role
    - Return updated course details
    - _Requirements: 2.1, 2.2_



  - [ ] 4.2 Add POST `/api/v1/courses/{courseId}/cancel-approval` endpoint
    - Call `CourseService.cancelApprovalRequest()`
    - Require TEACHER role
    - Return updated course details


    - _Requirements: 3.1, 3.2_


  - [ ] 4.3 Add GET `/api/v1/courses/{courseId}/review-status` endpoint
    - Return course review status including comment if rejected
    - Require TEACHER role (only course owner)
    - _Requirements: 5.6_

  - [x]* 4.4 Write integration tests for teacher endpoints


    - Test submit for approval flow
    - Test cancel approval flow
    - Test error cases (wrong status, unauthorized)



- [ ] 5. Add Admin API Endpoints
  - [x] 5.1 Add GET `/api/v1/admin/courses/pending` endpoint


    - Call `AdminService.getPendingCourses()`
    - Require ADMIN role
    - Return paginated list of pending courses
    - _Requirements: 8.1, 8.2_



  - [ ] 5.2 Add POST `/api/v1/admin/courses/{courseId}/approve` endpoint
    - Call `AdminService.approveCourse()`
    - Require ADMIN role

    - Return success message
    - _Requirements: 4.1, 4.2, 4.3, 4.4_


  - [ ] 5.3 Add POST `/api/v1/admin/courses/{courseId}/reject` endpoint
    - Call `AdminService.rejectCourse()`
    - Require ADMIN role
    - Require review comment in request body
    - Return success message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_



  - [ ] 5.4 Add GET `/api/v1/admin/courses` endpoint
    - Call `AdminService.getAllCoursesWithStatus()`
    - Require ADMIN role
    - Support status filter and search
    - Return paginated list
    - _Requirements: 6.4_

  - [x] 5.5 Add GET `/api/v1/admin/courses/{courseId}/details` endpoint

    - Return full course details for admin review
    - Include sections, lessons, and all metadata
    - Require ADMIN role
    - _Requirements: 8.3, 8.4_

  - [ ]* 5.6 Write integration tests for admin endpoints
    - Test pending courses list




    - Test approve flow



    - Test reject flow with comment

    - Test error cases (missing comment, wrong status)





- [ ] 6. Update Course Visibility Logic
  - [x] 6.1 Modify `getApprovedCourses()` to only return APPROVED courses


    - Already implemented, verify it works correctly
    - _Requirements: 6.1_

  - [ ] 6.2 Modify `getPublicCourseById()` to reject non-APPROVED courses
    - Already implemented, verify it works correctly
    - _Requirements: 6.2_

  - [ ] 6.3 Modify `enrollStudent()` to check course status
    - Already implemented, verify it works correctly
    - _Requirements: 6.5_

  - [ ]* 6.4 Write property test for marketplace visibility
    - **Property 5: Marketplace Visibility**
    - **Validates: Requirements 6.1**

  - [ ]* 6.5 Write property test for direct access restriction
    - **Property 6: Direct Access Restriction**
    - **Validates: Requirements 6.2**

  - [ ]* 6.6 Write property test for teacher visibility
    - **Property 7: Teacher Visibility**
    - **Validates: Requirements 6.3**

  - [ ]* 6.7 Write property test for enrollment restriction
    - **Property 8: Enrollment Restriction**
    - **Validates: Requirements 6.5**

  - [ ]* 6.8 Write property test for enrolled students access
    - **Property 12: Enrolled Students Access**
    - **Validates: Requirements 10.2**

- [ ] 7. Create DTOs for Course Review
  - [ ] 7.1 Create `CourseReviewRequest` DTO
    - Add `reviewComment` field with validation
    - _Requirements: 5.1_

  - [ ] 7.2 Create `CourseReviewStatus` DTO
    - Add fields for status, comment, timestamp, reviewer name
    - _Requirements: 5.6_

  - [ ] 7.3 Create `PendingCourseDTO` DTO
    - Add fields for course summary with submission info
    - _Requirements: 8.2_

  - [ ]* 7.4 Write unit tests for DTO validation
    - Test review comment validation
    - Test required fields

- [x] 8. Update Teacher Frontend - Course Management



  - [x] 8.1 Add status badge display to course list


    - Show "Nháp", "Chờ duyệt", "Đã duyệt", "Bị từ chối" badges
    - Use different colors for each status
    - _Requirements: 1.4, 2.5_

  - [x] 8.2 Add "Submit for Approval" button

    - Show for DRAFT and REJECTED courses
    - Call submit API endpoint
    - Show success/error message
    - _Requirements: 2.1, 2.2_


  - [x] 8.3 Add "Cancel Request" button

    - Show for PENDING courses
    - Call cancel API endpoint
    - Show confirmation dialog
    - _Requirements: 3.1, 3.2_



  - [x] 8.4 Disable edit button for PENDING courses

    - Show tooltip explaining why
    - _Requirements: 2.4, 7.1_




  - [ ] 8.5 Display review comments for REJECTED courses
    - Show admin feedback in a prominent way
    - _Requirements: 5.6_

- [x] 9. Update Teacher Frontend - Course Editor




  - [x] 9.1 Add status check before allowing edits


    - Redirect to course list if PENDING
    - Show error message
    - _Requirements: 7.1, 7.5_


  - [x] 9.2 Show warning when editing APPROVED course

    - Display modal: "Editing this course will require re-approval"
    - Allow user to confirm or cancel
    - _Requirements: 7.4, 10.1_

  - [x] 9.3 Display review feedback for REJECTED courses

    - Show feedback at top of editor
    - Highlight areas mentioned in feedback if possible
    - _Requirements: 5.6_

- [x] 10. Create Admin Frontend - Course Review Dashboard




  - [x] 10.1 Create new component `CourseReviewComponent`

    - Add to admin routes
    - Create basic layout with tabs
    - _Requirements: 8.1_



  - [ ] 10.2 Implement pending courses list
    - Fetch from `/api/v1/admin/courses/pending`
    - Display in table with course info and teacher name
    - Add pagination

    - _Requirements: 8.1, 8.2_

  - [ ] 10.3 Add search and filter functionality
    - Search by course name or teacher


    - Filter by status (All, Pending, Approved, Rejected)
    - _Requirements: 8.1_

  - [x] 10.4 Create course preview modal

    - Show full course details
    - Display sections and lessons
    - Show teacher information
    - _Requirements: 8.3, 8.4_


  - [ ] 10.5 Add approve button to preview modal
    - Call approve API endpoint
    - Show success message
    - Refresh course list
    - _Requirements: 4.1, 4.2_




  - [ ] 10.6 Add reject button with comment field
    - Show modal with required comment textarea

    - Validate comment is not empty
    - Call reject API endpoint
    - Show success message

    - _Requirements: 5.1, 5.2, 5.7_





- [ ] 11. Update Admin Frontend - Course Management
  - [ ] 11.1 Add status column to course list
    - Display status badge for each course
    - _Requirements: 6.4_


  - [ ] 11.2 Add status filter dropdown
    - Filter by All, Draft, Pending, Approved, Rejected
    - _Requirements: 6.4_




  - [ ] 11.3 Add quick actions for pending courses
    - Show approve/reject buttons in table row
    - _Requirements: 4.1, 5.1_


- [ ] 12. Create API Service Methods (Frontend)
  - [x] 12.1 Add teacher course workflow methods

    - `submitCourseForApproval(courseId)`
    - `cancelApprovalRequest(courseId)`



    - `getCourseReviewStatus(courseId)`

  - [ ] 12.2 Add admin course review methods
    - `getPendingCourses(page, limit, search)`

    - `approveCourse(courseId)`
    - `rejectCourse(courseId, comment)`
    - `getAllCourses(page, limit, status, search)`
    - `getCourseDetailsForReview(courseId)`


- [ ] 13. Update Documentation
  - [ ] 13.1 Update API documentation
    - Document new endpoints

    - Add request/response examples
    - Update Postman collection



  - [ ] 13.2 Update user guides
    - Teacher guide for course submission workflow
    - Admin guide for course review process

  - [ ] 13.3 Update README files
    - Add workflow diagram
    - Explain status transitions

- [ ] 14. Final Testing and Bug Fixes
  - [ ] 14.1 Manual testing of complete workflow
    - Test as teacher: create, submit, cancel, resubmit
    - Test as admin: review, approve, reject
    - Test as student: verify visibility rules

  - [ ] 14.2 Test edge cases
    - Multiple status transitions
    - Concurrent edits
    - Permission boundaries

  - [ ] 14.3 Performance testing
    - Test with large number of courses
    - Verify pagination works correctly
    - Check query performance

  - [ ] 14.4 Fix any bugs discovered
    - Prioritize critical bugs
    - Document known issues

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
