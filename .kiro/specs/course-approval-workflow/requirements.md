# Requirements Document - Course Approval Workflow

## Introduction

This feature implements a comprehensive course approval workflow system for the LMS platform. The system allows teachers to create courses in draft mode, submit them for admin review, and enables admins to approve or reject courses with feedback. The workflow ensures quality control while maintaining flexibility for teachers to iterate on their content.

## Glossary

- **LMS System**: The Learning Management System platform
- **Teacher**: A user with TEACHER role who creates and manages courses
- **Admin**: A user with ADMIN role who reviews and approves/rejects courses
- **Student**: A user with STUDENT role who can enroll in approved courses
- **Course Status**: The current state of a course in the approval workflow (DRAFT, PENDING, APPROVED, REJECTED)
- **Review Comment**: Feedback provided by admin when rejecting a course
- **Course Marketplace**: The public-facing area where students can browse and enroll in approved courses

## Requirements

### Requirement 1: Course Creation with Draft Status

**User Story:** As a teacher, I want to create courses that start in draft mode, so that I can work on content before making it public.

#### Acceptance Criteria

1. WHEN a teacher creates a new course, THE LMS System SHALL set the course status to DRAFT
2. WHEN a course is in DRAFT status, THE LMS System SHALL allow the teacher to edit all course properties
3. WHEN a course is in DRAFT status, THE LMS System SHALL hide the course from the student marketplace
4. WHEN a course is in DRAFT status, THE LMS System SHALL display the course in the teacher's course management interface with "Nháp" status indicator

### Requirement 2: Submit Course for Approval

**User Story:** As a teacher, I want to submit my draft course for admin review, so that it can be published to students.

#### Acceptance Criteria

1. WHEN a teacher submits a DRAFT course for approval, THE LMS System SHALL change the course status to PENDING
2. WHEN a teacher submits a REJECTED course for approval, THE LMS System SHALL change the course status to PENDING
3. WHEN a course status changes to PENDING, THE LMS System SHALL clear any previous review comments
4. WHEN a course is in PENDING status, THE LMS System SHALL prevent the teacher from editing the course content
5. WHEN a course is in PENDING status, THE LMS System SHALL display the course in the admin's review queue

### Requirement 3: Cancel Approval Request

**User Story:** As a teacher, I want to cancel my approval request, so that I can make changes to my course while it's being reviewed.

#### Acceptance Criteria

1. WHEN a teacher cancels an approval request for a PENDING course, THE LMS System SHALL change the course status back to DRAFT
2. WHEN a course status changes from PENDING to DRAFT, THE LMS System SHALL allow the teacher to edit the course again
3. WHEN a teacher attempts to cancel approval for a non-PENDING course, THE LMS System SHALL reject the request with an error message

### Requirement 4: Admin Course Approval

**User Story:** As an admin, I want to approve courses that meet quality standards, so that students can access high-quality content.

#### Acceptance Criteria

1. WHEN an admin approves a PENDING course, THE LMS System SHALL change the course status to APPROVED
2. WHEN a course status changes to APPROVED, THE LMS System SHALL make the course visible in the student marketplace
3. WHEN a course status changes to APPROVED, THE LMS System SHALL record the admin user who approved it
4. WHEN a course status changes to APPROVED, THE LMS System SHALL record the approval timestamp
5. WHEN a course is APPROVED, THE LMS System SHALL allow students to enroll in the course

### Requirement 5: Admin Course Rejection

**User Story:** As an admin, I want to reject courses with quality issues and provide feedback, so that teachers can improve their content.

#### Acceptance Criteria

1. WHEN an admin rejects a PENDING course, THE LMS System SHALL require the admin to provide a review comment
2. WHEN an admin rejects a course with a review comment, THE LMS System SHALL change the course status to REJECTED
3. WHEN a course status changes to REJECTED, THE LMS System SHALL store the review comment
4. WHEN a course status changes to REJECTED, THE LMS System SHALL record the admin user who rejected it
5. WHEN a course status changes to REJECTED, THE LMS System SHALL record the rejection timestamp
6. WHEN a course is REJECTED, THE LMS System SHALL allow the teacher to view the review comment
7. WHEN an admin attempts to reject a course without a review comment, THE LMS System SHALL reject the request with an error message

### Requirement 6: Course Visibility Rules

**User Story:** As a system administrator, I want courses to be visible only to appropriate users based on status, so that content quality is maintained.

#### Acceptance Criteria

1. WHEN a student browses the marketplace, THE LMS System SHALL display only courses with APPROVED status
2. WHEN a student attempts to access a non-APPROVED course by direct URL, THE LMS System SHALL return an error message
3. WHEN a teacher views their course list, THE LMS System SHALL display all courses they created regardless of status
4. WHEN an admin views the course management interface, THE LMS System SHALL display all courses with their current status
5. WHEN a course is in DRAFT or REJECTED status, THE LMS System SHALL prevent student enrollment

### Requirement 7: Course Editing Restrictions

**User Story:** As a system administrator, I want to prevent course edits during review, so that admins review consistent content.

#### Acceptance Criteria

1. WHEN a course is in PENDING status, THE LMS System SHALL prevent the teacher from editing course properties
2. WHEN a course is in DRAFT status, THE LMS System SHALL allow the teacher to edit all course properties
3. WHEN a course is in REJECTED status, THE LMS System SHALL allow the teacher to edit all course properties
4. WHEN a course is in APPROVED status and the teacher edits it, THE LMS System SHALL change the status to PENDING for re-review
5. WHEN a teacher attempts to edit a PENDING course, THE LMS System SHALL return an error message

### Requirement 8: Admin Review Queue

**User Story:** As an admin, I want to see all courses pending review, so that I can efficiently manage the approval process.

#### Acceptance Criteria

1. WHEN an admin accesses the review queue, THE LMS System SHALL display all courses with PENDING status
2. WHEN displaying pending courses, THE LMS System SHALL show course title, teacher name, and submission date
3. WHEN an admin selects a pending course, THE LMS System SHALL display full course details for review
4. WHEN displaying course details for review, THE LMS System SHALL show all course content including sections and lessons

### Requirement 9: Course Status History

**User Story:** As an admin, I want to see the history of status changes for a course, so that I can track the review process.

#### Acceptance Criteria

1. WHEN a course status changes, THE LMS System SHALL record the previous status, new status, timestamp, and user who made the change
2. WHEN an admin views a course, THE LMS System SHALL display the complete status change history
3. WHEN displaying status history, THE LMS System SHALL show the most recent changes first
4. WHEN a status change includes a review comment, THE LMS System SHALL display the comment in the history

### Requirement 10: Approved Course Re-editing

**User Story:** As a teacher, I want to update my approved course, so that I can improve content based on student feedback.

#### Acceptance Criteria

1. WHEN a teacher edits an APPROVED course, THE LMS System SHALL change the status to PENDING
2. WHEN an APPROVED course status changes to PENDING, THE LMS System SHALL keep the course visible to already-enrolled students
3. WHEN an APPROVED course status changes to PENDING, THE LMS System SHALL hide the course from new student enrollments
4. WHEN an APPROVED course is re-submitted and approved, THE LMS System SHALL make it available for new enrollments again
