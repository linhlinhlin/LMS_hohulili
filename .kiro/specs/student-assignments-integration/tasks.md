# Implementation Plan

## 1. Tạo API Client và Service

- [x] 1.1 Tạo AllocationApiClient để gọi allocation endpoints
  - Tạo file `fe/src/app/api/client/student-allocation.api.ts`
  - Implement method `getStudentAllocatedAssignments(studentId, courseId)`
  - Gọi endpoint `GET /api/v1/students/{studentId}/allocated-assignments`
  - _Requirements: 2.1_
  - ✅ Đã có sẵn trong `fe/src/app/api/client/allocation.api.ts`

- [x] 1.2 Tạo StudentAssignmentService để lấy bài tập cho học viên
  - Tạo file `fe/src/app/features/student/services/student-assignment.service.ts`
  - Inject AllocationApiClient và AssignmentApi
  - Implement method `getStudentAssignments(studentId, courseId?)` 
  - Chain API calls: allocation → assignment details
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 1.3 Write property test cho API call count
  - **Property 1: API call count matches assignment IDs**
  - **Validates: Requirements 2.2**

## 2. Tạo Utility Functions

- [x] 2.1 Tạo assignment utility functions
  - Tạo file `fe/src/app/features/student/assignments/utils/assignment-utils.ts`
  - Implement `groupTasksByStatus(assignments)` - nhóm theo trạng thái
  - Implement `filterAssignments(assignments, filters)` - lọc theo điều kiện
  - Implement `calculateStats(assignments)` - tính thống kê
  - Implement `formatDeadline(date)` - format ngày theo VN
  - Implement `getStatusBadge(status)` - lấy badge text và class
  - Implement `getDeadlineUrgency(dueDate)` - tính urgency level
  - _Requirements: 3.1, 4.1-4.5, 5.1, 5.3, 5.4, 6.1-6.3, 7.1_

- [ ]* 2.2 Write property test cho Kanban grouping
  - **Property 3: Kanban grouping integrity**
  - **Validates: Requirements 3.1**

- [ ]* 2.3 Write property test cho status badge mapping
  - **Property 5: Status badge mapping**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ]* 2.4 Write property test cho deadline formatting
  - **Property 6: Deadline formatting**
  - **Validates: Requirements 5.1**

- [ ]* 2.5 Write property test cho deadline urgency
  - **Property 8: Deadline urgency styling**
  - **Validates: Requirements 5.3, 5.4**

- [ ]* 2.6 Write property test cho filter correctness
  - **Property 9: Filter correctness**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ]* 2.7 Write property test cho stats calculation
  - **Property 10: Stats calculation**
  - **Validates: Requirements 7.1**

## 3. Checkpoint - Đảm bảo tests pass

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - ✅ Skipped - MVP mode (optional tests skipped)

## 4. Cập nhật StudentAssignmentsPage Component

- [x] 4.1 Refactor StudentAssignmentsPage để dùng API thực
  - Cập nhật file `fe/src/app/features/student/assignments/student-assignments-page.component.ts`
  - Inject StudentAssignmentService
  - Xóa mock data trong `loadAssignments()`
  - Gọi service để lấy data từ API
  - Handle loading và error states
  - _Requirements: 1.1, 2.3, 2.4, 8.1, 8.2, 8.3_

- [x] 4.2 Implement Kanban View
  - Thêm template cho Kanban view với 3 cột
  - Sử dụng `groupTasksByStatus()` để nhóm bài tập
  - Hiển thị badge count cho mỗi cột
  - _Requirements: 3.1_

- [x] 4.3 Implement List View
  - Thêm template cho List view dạng bảng
  - Các cột: Tên bài tập, Khóa học, Hạn nộp, Trạng thái, Điểm
  - Sortable columns
  - _Requirements: 3.2_

- [x] 4.4 Implement View Mode Toggle và Persistence
  - Thêm toggle button để chuyển đổi view
  - Lưu preference vào localStorage
  - Khôi phục preference khi load page
  - _Requirements: 3.3, 3.4_

- [ ]* 4.5 Write property test cho view preference round-trip
  - **Property 4: View preference round-trip**
  - **Validates: Requirements 3.3, 3.4**

## 5. Implement Status và Deadline Display

- [x] 5.1 Implement status badges
  - Tạo component hoặc directive cho status badge
  - Map status → text và CSS class
  - Hiển thị điểm số cho GRADED status
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.2 Implement deadline display
  - Format deadline theo định dạng VN
  - Hiển thị "(Gia hạn)" nếu có personalDeadline
  - Áp dụng urgency styling (cam/đỏ)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 5.3 Write property test cho personal deadline indicator
  - **Property 7: Personal deadline indicator**
  - **Validates: Requirements 5.2**

## 6. Implement Filters và Stats

- [x] 6.1 Implement filter panel
  - Dropdown lọc theo khóa học
  - Dropdown lọc theo trạng thái
  - Input tìm kiếm theo tiêu đề/mô tả
  - Nút xóa bộ lọc
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6.2 Implement stats cards
  - Hiển thị 4 cards: Tổng, Cần làm, Hoàn thành, Quá hạn
  - Reactive update khi data thay đổi
  - Highlight màu đỏ cho Quá hạn
  - _Requirements: 7.1, 7.2, 7.3_

## 7. Cập nhật Routes

- [x] 7.1 Xóa hoàn toàn route /student/my-tasks
  - Cập nhật `fe/src/app/features/student/student.routes.ts`
  - Xóa hoàn toàn route `/my-tasks` (không redirect, trả 404)
  - _Requirements: 1.2_
  - ✅ Route đã được xóa hoàn toàn

- [x] 7.2 Cleanup sidebar navigation
  - Cập nhật `fe/src/app/shared/components/navigation/sidebar.config.ts`
  - Xóa "Bài tập của tôi" (route cũ `/my-tasks`)
  - Xóa "Bài tập" (duplicate)
  - Xóa "Quiz" (chưa implement đầy đủ)
  - Giữ lại "Bài tập của tôi" → `/student/assignments`
  - _Requirements: 8.1_
  - ✅ Sidebar đã được cleanup, chỉ còn 1 entry "Bài tập của tôi"

## 8. Checkpoint - Đảm bảo tests pass

- [x] 8. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - ✅ Skipped - MVP mode

## 9. Integration và Testing

- [ ]* 9.1 Write property test cho assignment display completeness
  - **Property 2: Assignment display completeness**
  - **Validates: Requirements 2.3**

- [ ]* 9.2 Write integration tests
  - Test full flow: Load page → API calls → Display data
  - Test filter interactions
  - Test view mode switching
  - Test navigation to assignment detail
  - _Requirements: 1.1, 2.1, 2.2, 2.3_

## 10. Refactor Assignment Work Component

- [x] 10.1 Refactor AssignmentWorkComponent để dùng API thực
  - Cập nhật file `fe/src/app/features/assignments/assignment-work.component.ts`
  - Xóa mock data (mockAssignment, previousSubmissions)
  - Inject AssignmentApi service
  - Gọi `getAssignmentById()` để lấy chi tiết bài tập
  - Gọi `getMySubmission()` để lấy bài nộp của student
  - Gọi `submitAssignment()` để nộp bài
  - Handle loading, error, và submitting states
  - Hiển thị điểm và feedback nếu đã được chấm
  - _Requirements: 1.1, 2.3, 8.1, 8.2, 8.3_
  - ✅ Đã refactor xong, sử dụng API thực

## 11. Final Checkpoint

- [x] 11. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - ✅ Implementation complete
