# Requirements Document

## Introduction

Hệ thống Giao Bài tập (Assignment Distribution) cho LMS Maritime - cho phép giảng viên giao bài tập cho học viên trong khóa học. Hệ thống được thiết kế theo mô hình Hybrid đơn giản hóa:
- **Mặc định:** 1 Assignment → All Students trong khóa học
- **Nâng cao:** 1 Assignment → List of Student IDs cụ thể

Thiết kế tập trung vào logic đơn giản: **1 Course - 1 Teacher - Many Students**, bỏ qua khái niệm Sections/Groups phức tạp trong Phase 1.

## Glossary

- **Assignment**: Bài tập được giảng viên tạo ra, gắn với một khóa học cụ thể
- **Distribution**: Quá trình giao bài tập cho học viên
- **Allocation**: Bản ghi phân bổ bài tập cho đối tượng cụ thể (toàn bộ khóa học hoặc danh sách học viên)
- **Teacher**: Giảng viên - người tạo và giao bài tập
- **Student**: Học viên - người nhận và làm bài tập
- **Course**: Khóa học chứa các bài tập
- **Due Date**: Hạn nộp bài tập
- **Override**: Ngoại lệ về deadline cho học viên cụ thể
- **My Tasks**: Dashboard hiển thị danh sách bài tập được giao cho học viên
- **Reminder**: Thông báo nhắc nhở về deadline

## Requirements

### Requirement 1: Giao bài tập khi tạo/chỉnh sửa Assignment

**User Story:** As a Teacher, I want to specify who should receive an assignment when I create or edit it, so that the right students are notified and can submit their work.

#### Acceptance Criteria

1. WHEN a Teacher creates a new assignment THEN the System SHALL display distribution options with "All Students" selected by default.
2. WHEN a Teacher selects "All Students" option THEN the System SHALL automatically assign the assignment to all enrolled students in the course when published.
3. WHEN a Teacher selects "Specific Students" option THEN the System SHALL display a searchable multi-select list of enrolled students.
4. WHEN a Teacher publishes an assignment with distribution settings THEN the System SHALL create allocation records for the specified targets.
5. WHEN an assignment is published THEN the System SHALL send notifications to all assigned students.

### Requirement 2: Giao bài tập riêng cho học viên từ Student Detail

**User Story:** As a Teacher, I want to assign additional tasks to specific students from their profile page, so that I can provide remedial or supplementary work.

#### Acceptance Criteria

1. WHEN a Teacher views a student detail page THEN the System SHALL display an "Individual Assignments" tab showing all assignments for that student.
2. WHEN a Teacher clicks "Assign Task" button THEN the System SHALL display a modal with available assignments from the course.
3. WHEN a Teacher selects an assignment and confirms THEN the System SHALL create an individual allocation for that student.
4. WHEN an individual assignment is created THEN the System SHALL send a notification to the student.
5. WHEN viewing individual assignments THEN the System SHALL display assignment title, due date, status, and grade for each item.

### Requirement 3: Student Dashboard - My Tasks

**User Story:** As a Student, I want to see all my assigned tasks in one place, so that I can track my workload and deadlines efficiently.

#### Acceptance Criteria

1. WHEN a Student navigates to "My Tasks" dashboard THEN the System SHALL display all assigned tasks grouped by status (To Do, In Progress, Completed).
2. WHEN displaying tasks THEN the System SHALL show assignment title, course name, due date, and submission status for each task.
3. WHEN a task is overdue and not submitted THEN the System SHALL display a visual indicator showing the task is overdue.
4. WHEN a Student clicks on a task THEN the System SHALL navigate to the assignment detail page for submission.
5. WHEN new assignments are allocated to the student THEN the System SHALL update the task list without requiring page refresh.
6. WHEN displaying tasks THEN the System SHALL sort them by due date with nearest deadline first.

### Requirement 4: Deadline Override (Gia hạn cá nhân)

**User Story:** As a Teacher, I want to extend deadlines for specific students, so that I can accommodate special circumstances like illness or emergency duty.

#### Acceptance Criteria

1. WHEN a Teacher views submission list THEN the System SHALL provide an "Extend Deadline" action for each student.
2. WHEN a Teacher clicks "Extend Deadline" THEN the System SHALL display a form with new date picker and reason field.
3. WHEN a Teacher submits deadline extension THEN the System SHALL create an override record with the new deadline and reason.
4. WHEN a deadline override exists THEN the System SHALL use the override deadline instead of the original for that student.
5. WHEN a deadline is extended THEN the System SHALL log the action in the audit trail with teacher name, old date, new date, and reason.
6. WHEN viewing a student with extended deadline THEN the System SHALL display a visual indicator showing the custom deadline.

### Requirement 5: Automatic Reminders

**User Story:** As a Student, I want to receive reminders about upcoming deadlines, so that I do not miss submission dates.

#### Acceptance Criteria

1. WHEN an assignment deadline is 3 days away THEN the System SHALL send a reminder notification to students who have not submitted.
2. WHEN an assignment deadline is 1 day away THEN the System SHALL send an urgent reminder notification to students who have not submitted.
3. WHEN an assignment becomes overdue THEN the System SHALL send an overdue notification to students who have not submitted.
4. WHEN a student has a custom deadline override THEN the System SHALL use the override date for reminder calculations.
5. WHEN sending reminders THEN the System SHALL include assignment title, course name, and deadline in the notification.

### Requirement 6: Assignment Allocation Tracking

**User Story:** As a Teacher, I want to see which students have been assigned each task, so that I can verify distribution and track completion.

#### Acceptance Criteria

1. WHEN a Teacher views assignment overview THEN the System SHALL display allocation statistics (total assigned, submitted, pending).
2. WHEN a Teacher views submission list THEN the System SHALL show all allocated students including those who have not submitted.
3. WHEN an assignment uses "All Students" distribution THEN the System SHALL automatically include newly enrolled students.
4. WHEN an assignment uses "Specific Students" distribution THEN the System SHALL only show the explicitly assigned students.
5. WHEN viewing allocation details THEN the System SHALL indicate whether each student was assigned via bulk or individual allocation.

### Requirement 7: Notification System Integration

**User Story:** As a User, I want to receive in-app notifications about assignment events, so that I stay informed about important updates.

#### Acceptance Criteria

1. WHEN an assignment is published THEN the System SHALL create in-app notifications for all assigned students.
2. WHEN a grade is posted THEN the System SHALL notify the student that their submission has been graded.
3. WHEN a deadline is extended for a student THEN the System SHALL notify that student of the new deadline.
4. WHEN displaying notifications THEN the System SHALL show notification type, message, timestamp, and read status.
5. WHEN a user clicks a notification THEN the System SHALL navigate to the relevant page (assignment, submission, or grade).

