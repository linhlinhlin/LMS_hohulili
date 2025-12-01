# Requirements Document

## Introduction

Hệ thống Quản lý Bài tập và Chấm điểm (Teacher Assignments & Grading System) cho LMS Maritime - một nền tảng học tập trực tuyến chuyên về lĩnh vực hàng hải. Hệ thống này cho phép giảng viên tạo, quản lý bài tập, theo dõi bài nộp của học viên, và thực hiện chấm điểm với hỗ trợ Rubric. Thiết kế tham khảo luồng UX/UI của Coursera, đảm bảo tính chuyên nghiệp và dễ sử dụng.

## Glossary

- **Assignment**: Bài tập được giảng viên tạo ra, gắn với một khóa học cụ thể
- **Submission**: Bài nộp của học viên cho một Assignment
- **Rubric**: Bảng tiêu chí chấm điểm chi tiết với các mức điểm và mô tả cụ thể
- **Grading**: Quá trình chấm điểm bài nộp của học viên
- **Teacher**: Giảng viên - người tạo và quản lý bài tập, chấm điểm
- **Student**: Học viên - người nộp bài và nhận điểm
- **Course**: Khóa học chứa các bài tập
- **Section**: Phần/Chương trong khóa học
- **Feedback**: Nhận xét của giảng viên cho bài nộp
- **Due Date**: Hạn nộp bài tập
- **Max Score**: Điểm tối đa của bài tập
- **Draft**: Trạng thái nháp - bài tập chưa công bố
- **Published**: Trạng thái đã xuất bản - học viên có thể xem và nộp bài
- **Closed**: Trạng thái đã đóng - không nhận bài nộp mới

## Requirements

### Requirement 1: Quản lý danh sách bài tập

**User Story:** As a Teacher, I want to view and manage all my assignments across courses, so that I can efficiently track and organize my teaching workload.

#### Acceptance Criteria

1. WHEN a Teacher navigates to the assignments page THEN the System SHALL display a paginated list of all assignments created by that Teacher with title, course name, due date, status, and submission count.
2. WHEN a Teacher applies filters (by status, course, or keyword) THEN the System SHALL update the assignment list to show only matching assignments.
3. WHEN a Teacher clicks on column headers THEN the System SHALL sort the assignment list by that column in ascending or descending order.
4. WHEN a Teacher clicks "Xem bài nộp" on an assignment THEN the System SHALL navigate to the submissions management page for that assignment.
5. WHEN a Teacher clicks "Sửa" on an assignment THEN the System SHALL navigate to the assignment editor page.

### Requirement 2: Tạo bài tập mới

**User Story:** As a Teacher, I want to create new assignments with detailed instructions and attachments, so that students have clear guidance on what to submit.

#### Acceptance Criteria

1. WHEN a Teacher submits the assignment creation form with valid data THEN the System SHALL create a new assignment and associate it with the selected course.
2. WHEN a Teacher attempts to create an assignment without required fields (title, course, due date) THEN the System SHALL display validation errors and prevent submission.
3. WHEN a Teacher uploads attachment files THEN the System SHALL store the files and associate them with the assignment.
4. WHEN a Teacher sets max score THEN the System SHALL validate that the value is between 1 and 1000.
5. WHEN an assignment is created successfully THEN the System SHALL navigate to the assignments list and display a success message.

### Requirement 3: Chỉnh sửa bài tập

**User Story:** As a Teacher, I want to edit existing assignments, so that I can update instructions, due dates, or fix errors.

#### Acceptance Criteria

1. WHEN a Teacher opens the assignment editor THEN the System SHALL load and display all current assignment data in the form.
2. WHEN a Teacher modifies assignment fields and saves THEN the System SHALL update the assignment with new values.
3. WHEN a Teacher changes the status of an assignment THEN the System SHALL update the assignment status accordingly.
4. WHEN a Teacher attempts to save invalid data THEN the System SHALL display validation errors and prevent saving.

### Requirement 4: Quản lý bài nộp của học viên

**User Story:** As a Teacher, I want to view all student submissions for an assignment, so that I can review and grade their work.

#### Acceptance Criteria

1. WHEN a Teacher opens the submissions page THEN the System SHALL display assignment details including title, due date, max score, and submission statistics.
2. WHEN a Teacher views the submissions list THEN the System SHALL display each submission with student name, submission time, status, and grade (if graded).
3. WHEN a submission is late (submitted after due date) THEN the System SHALL display a visual indicator showing the submission is late.
4. WHEN a Teacher clicks "Xem" on a submission THEN the System SHALL display the full submission content and any attached files.
5. WHEN a Teacher clicks "Chấm điểm" on a submission THEN the System SHALL open the grading modal for that submission.
6. WHEN a submission contains PDF or image files THEN the System SHALL provide inline preview capability without requiring file download.
7. WHEN a submission contains maritime-specific files (charts, CAD, simulation files) THEN the System SHALL store and display file metadata including scale, coordinates, and capture date.

### Requirement 5: Chấm điểm bài nộp

**User Story:** As a Teacher, I want to grade student submissions with scores and feedback, so that students receive evaluation of their work.

#### Acceptance Criteria

1. WHEN a Teacher opens the grading modal THEN the System SHALL display student information, submission content, and a grading form in a split-view layout.
2. WHEN a Teacher enters a grade THEN the System SHALL validate that the grade is between 0 and the assignment's max score.
3. WHEN a Teacher submits a grade with feedback THEN the System SHALL save the grade and feedback, and update the submission status to "GRADED".
4. WHEN a Teacher modifies a previously graded submission THEN the System SHALL update the existing grade and feedback.
5. WHEN grading is saved successfully THEN the System SHALL update the submissions list to reflect the new grade.
6. WHEN a Teacher is grading THEN the System SHALL auto-save draft grades periodically to prevent data loss.
7. WHILE a Teacher is viewing a submission file THEN the System SHALL display the file on the left panel with independent scrolling and the grading form on the right panel (fixed position).

### Requirement 6: Hệ thống Rubric

**User Story:** As a Teacher, I want to create and use grading rubrics, so that I can ensure consistent and transparent grading criteria.

#### Acceptance Criteria

1. WHEN a Teacher creates a new rubric THEN the System SHALL allow defining multiple criteria with descriptions and point values using percentage-based weights.
2. WHEN a Teacher views the rubric list THEN the System SHALL display all rubrics created by that Teacher with name, criteria count, and total points.
3. WHEN a Teacher edits a rubric THEN the System SHALL allow modifying criteria, descriptions, and point values.
4. WHEN a Teacher applies a rubric to grade a submission THEN the System SHALL calculate the total score based on selected criteria levels.
5. WHEN a Teacher deletes a rubric THEN the System SHALL remove the rubric only if it is not currently in use by any assignment.
6. WHEN a Teacher saves a rubric THEN the System SHALL validate that the sum of all criteria weights equals exactly 100 percent.
7. WHEN a Teacher applies the same rubric levels to the same submission multiple times THEN the System SHALL produce the same final score (idempotent grading).

### Requirement 7: Dashboard tổng quan chấm điểm

**User Story:** As a Teacher, I want to see an overview of pending grading tasks, so that I can prioritize my grading workload.

#### Acceptance Criteria

1. WHEN a Teacher opens the grading dashboard THEN the System SHALL display summary statistics including total pending submissions, overdue submissions, and recently graded count.
2. WHEN a Teacher views the pending submissions list THEN the System SHALL display submissions sorted by due date with oldest first.
3. WHEN a Teacher clicks on a pending submission THEN the System SHALL navigate directly to the grading interface for that submission.
4. WHEN new submissions arrive THEN the System SHALL update the pending count without requiring page refresh.

### Requirement 8: Xuất dữ liệu điểm

**User Story:** As a Teacher, I want to export grades to Excel, so that I can maintain records and share with administration.

#### Acceptance Criteria

1. WHEN a Teacher clicks export on an assignment THEN the System SHALL generate an Excel file containing all submission grades and feedback.
2. WHEN the export is complete THEN the System SHALL download the file to the Teacher's device.
3. WHEN exporting grades THEN the System SHALL include student name, email, submission date, grade, and feedback in the export file.
