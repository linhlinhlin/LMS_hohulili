# Requirements Document

## Introduction

Tài liệu này mô tả yêu cầu cho việc tích hợp và hợp nhất trang bài tập của học viên (Student Assignments) trong hệ thống LMS Hàng Hải. Mục tiêu là xóa bỏ mock data, kết nối với API thực, và hợp nhất 2 trang `/student/my-tasks` và `/student/assignments` thành một trang duy nhất với UX chuyên nghiệp như Coursera/Canvas.

## Glossary

- **Student_Assignment_Page**: Trang hiển thị danh sách bài tập được giao cho học viên
- **Assignment_Allocation**: Bản ghi phân phối bài tập từ giáo viên cho học viên
- **Kanban_View**: Chế độ xem dạng bảng Kanban với các cột theo trạng thái
- **List_View**: Chế độ xem dạng danh sách với bảng chi tiết
- **Calendar_View**: Chế độ xem dạng lịch theo deadline
- **Task_Status**: Trạng thái của bài tập (NOT_STARTED, IN_PROGRESS, SUBMITTED, GRADED, OVERDUE)
- **Personal_Deadline**: Deadline riêng được giáo viên gia hạn cho học viên cụ thể
- **Allocation_API**: API backend để lấy danh sách bài tập được giao cho học viên

## Requirements

### Requirement 1: Hợp nhất trang bài tập

**User Story:** As a học viên, I want to có một trang duy nhất để xem tất cả bài tập được giao, so that I can dễ dàng quản lý và theo dõi tiến độ học tập.

#### Acceptance Criteria

1. WHEN học viên truy cập `/student/assignments` THEN the Student_Assignment_Page SHALL hiển thị tất cả bài tập được giao từ API thực
2. WHEN học viên truy cập `/student/my-tasks` THEN the System SHALL chuyển hướng tới `/student/assignments`
3. WHEN the Student_Assignment_Page tải dữ liệu THEN the System SHALL gọi Allocation_API để lấy danh sách bài tập được giao cho học viên hiện tại

### Requirement 2: Kết nối API thực

**User Story:** As a học viên, I want to xem bài tập thực sự được giáo viên giao, so that I can làm bài và nộp đúng hạn.

#### Acceptance Criteria

1. WHEN the Student_Assignment_Page khởi tạo THEN the System SHALL gọi `GET /api/v1/students/{studentId}/allocated-assignments` để lấy danh sách assignment IDs
2. WHEN the System nhận được danh sách assignment IDs THEN the System SHALL gọi `GET /api/v1/assignments/{assignmentId}` cho mỗi assignment để lấy chi tiết
3. WHEN the System nhận được chi tiết bài tập THEN the Student_Assignment_Page SHALL hiển thị thông tin bao gồm: tiêu đề, mô tả, khóa học, deadline, trạng thái nộp bài
4. IF the Allocation_API trả về lỗi THEN the Student_Assignment_Page SHALL hiển thị thông báo lỗi và nút thử lại

### Requirement 3: Chế độ xem đa dạng

**User Story:** As a học viên, I want to chuyển đổi giữa các chế độ xem khác nhau, so that I can chọn cách hiển thị phù hợp với nhu cầu.

#### Acceptance Criteria

1. WHEN học viên chọn Kanban_View THEN the Student_Assignment_Page SHALL hiển thị bài tập theo 3 cột: "Cần làm", "Đang làm", "Hoàn thành"
2. WHEN học viên chọn List_View THEN the Student_Assignment_Page SHALL hiển thị bài tập dạng bảng với các cột: Tên bài tập, Khóa học, Hạn nộp, Trạng thái, Điểm
3. WHEN học viên chuyển đổi chế độ xem THEN the System SHALL lưu preference vào localStorage
4. WHEN học viên quay lại trang THEN the System SHALL khôi phục chế độ xem đã lưu

### Requirement 4: Hiển thị trạng thái bài tập

**User Story:** As a học viên, I want to thấy rõ trạng thái của từng bài tập, so that I can biết bài nào cần ưu tiên làm.

#### Acceptance Criteria

1. WHEN bài tập chưa bắt đầu THEN the Student_Assignment_Page SHALL hiển thị badge "Chưa bắt đầu" màu xám
2. WHEN bài tập đang làm THEN the Student_Assignment_Page SHALL hiển thị badge "Đang làm" màu xanh dương
3. WHEN bài tập đã nộp THEN the Student_Assignment_Page SHALL hiển thị badge "Đã nộp" màu vàng
4. WHEN bài tập đã chấm điểm THEN the Student_Assignment_Page SHALL hiển thị badge "Đã chấm" màu xanh lá và điểm số
5. WHEN bài tập quá hạn chưa nộp THEN the Student_Assignment_Page SHALL hiển thị badge "Quá hạn" màu đỏ

### Requirement 5: Hiển thị deadline và gia hạn

**User Story:** As a học viên, I want to thấy deadline chính xác của bài tập, so that I can nộp bài đúng hạn.

#### Acceptance Criteria

1. WHEN bài tập có deadline THEN the Student_Assignment_Page SHALL hiển thị ngày giờ deadline theo định dạng Việt Nam
2. WHEN học viên có Personal_Deadline THEN the Student_Assignment_Page SHALL hiển thị deadline riêng với nhãn "(Gia hạn)"
3. WHEN deadline còn dưới 3 ngày THEN the Student_Assignment_Page SHALL hiển thị cảnh báo màu cam
4. WHEN deadline đã qua THEN the Student_Assignment_Page SHALL hiển thị cảnh báo màu đỏ

### Requirement 6: Bộ lọc và tìm kiếm

**User Story:** As a học viên, I want to lọc và tìm kiếm bài tập, so that I can nhanh chóng tìm được bài tập cần làm.

#### Acceptance Criteria

1. WHEN học viên chọn lọc theo khóa học THEN the Student_Assignment_Page SHALL chỉ hiển thị bài tập của khóa học đó
2. WHEN học viên chọn lọc theo trạng thái THEN the Student_Assignment_Page SHALL chỉ hiển thị bài tập có trạng thái tương ứng
3. WHEN học viên nhập từ khóa tìm kiếm THEN the Student_Assignment_Page SHALL lọc bài tập theo tiêu đề hoặc mô tả
4. WHEN học viên xóa bộ lọc THEN the Student_Assignment_Page SHALL hiển thị lại tất cả bài tập

### Requirement 7: Thống kê tổng quan

**User Story:** As a học viên, I want to xem thống kê tổng quan về bài tập, so that I can nắm được tiến độ học tập.

#### Acceptance Criteria

1. WHEN the Student_Assignment_Page tải xong THEN the System SHALL hiển thị số liệu: Tổng bài tập, Cần làm, Hoàn thành, Quá hạn
2. WHEN số liệu thay đổi THEN the Student_Assignment_Page SHALL cập nhật thống kê tự động
3. WHEN có bài tập quá hạn THEN the System SHALL hiển thị số lượng với màu đỏ để cảnh báo

### Requirement 8: Xóa mock data

**User Story:** As a developer, I want to xóa tất cả mock data trong student assignments, so that the system chỉ hiển thị dữ liệu thực từ database.

#### Acceptance Criteria

1. WHEN the Student_Assignment_Page khởi tạo THEN the System SHALL không sử dụng bất kỳ mock data nào
2. WHEN không có bài tập được giao THEN the Student_Assignment_Page SHALL hiển thị empty state với thông báo "Bạn chưa được giao bài tập nào"
3. WHEN API trả về dữ liệu THEN the Student_Assignment_Page SHALL hiển thị chính xác dữ liệu từ API
