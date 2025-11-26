# Requirements Document

## Introduction

Cải thiện trải nghiệm tạo bài trắc nghiệm trong Section Editor bằng cách cho phép giáo viên cấu hình đầy đủ quiz (thời gian, điểm số, số lần làm) và chọn câu hỏi ngay trong form tạo, thay vì phải chuyển sang modal riêng biệt.

## Glossary

- **Quiz**: Bài trắc nghiệm với nhiều câu hỏi trắc nghiệm
- **Section Editor**: Giao diện quản lý nội dung của một chương học
- **Question Bank**: Ngân hàng câu hỏi có sẵn để chọn
- **Package**: Gói câu hỏi được nhóm theo chủ đề
- **Inline Form**: Form hiển thị trực tiếp trên trang, không qua modal

## Requirements

### Requirement 1

**User Story:** Là giáo viên, tôi muốn nhập đầy đủ thông tin cấu hình quiz (thời gian, điểm, số lần làm) ngay trong form tạo bài trắc nghiệm, để tôi không phải qua nhiều bước.

#### Acceptance Criteria

1. WHEN giáo viên chọn loại nội dung "Trắc nghiệm" THEN hệ thống SHALL hiển thị các trường cấu hình quiz trong form
2. WHEN form hiển thị các trường quiz THEN hệ thống SHALL bao gồm: thời gian làm bài (phút), điểm tối thiểu để đạt (%), và số lần làm tối đa
3. WHEN giáo viên nhập giá trị vào các trường cấu hình THEN hệ thống SHALL validate giá trị hợp lệ (số dương, trong khoảng cho phép)
4. WHEN giáo viên để trống các trường cấu hình THEN hệ thống SHALL sử dụng giá trị mặc định (30 phút, 60%, 1 lần)
5. WHEN form được submit THEN hệ thống SHALL lưu các giá trị cấu hình vào quiz

### Requirement 2

**User Story:** Là giáo viên, tôi muốn chọn câu hỏi từ ngân hàng câu hỏi ngay trong form tạo quiz, để tôi có thể hoàn thành việc tạo quiz trong một bước.

#### Acceptance Criteria

1. WHEN giáo viên chọn loại "Trắc nghiệm" THEN hệ thống SHALL hiển thị phần chọn câu hỏi trong form
2. WHEN phần chọn câu hỏi hiển thị THEN hệ thống SHALL load danh sách các package câu hỏi có sẵn
3. WHEN giáo viên chọn một package THEN hệ thống SHALL hiển thị danh sách câu hỏi trong package đó
4. WHEN danh sách câu hỏi hiển thị THEN hệ thống SHALL cho phép giáo viên chọn nhiều câu hỏi bằng checkbox
5. WHEN giáo viên chọn câu hỏi THEN hệ thống SHALL hiển thị số lượng câu hỏi đã chọn

### Requirement 3

**User Story:** Là giáo viên, tôi muốn xem preview câu hỏi đã chọn trước khi tạo quiz, để đảm bảo tôi chọn đúng câu hỏi.

#### Acceptance Criteria

1. WHEN giáo viên đã chọn ít nhất một câu hỏi THEN hệ thống SHALL hiển thị danh sách câu hỏi đã chọn
2. WHEN danh sách câu hỏi đã chọn hiển thị THEN hệ thống SHALL hiển thị nội dung câu hỏi, các đáp án, và đáp án đúng
3. WHEN giáo viên muốn bỏ chọn câu hỏi THEN hệ thống SHALL cho phép xóa câu hỏi khỏi danh sách đã chọn
4. WHEN giáo viên xóa câu hỏi THEN hệ thống SHALL cập nhật số lượng câu hỏi đã chọn
5. WHEN không có câu hỏi nào được chọn THEN hệ thống SHALL hiển thị thông báo "Chưa chọn câu hỏi nào"

### Requirement 4

**User Story:** Là giáo viên, tôi muốn tạo quiz với đầy đủ cấu hình và câu hỏi trong một lần submit, để tiết kiệm thời gian.

#### Acceptance Criteria

1. WHEN giáo viên nhấn "Tạo bài trắc nghiệm" THEN hệ thống SHALL validate tất cả các trường bắt buộc
2. WHEN validation thành công THEN hệ thống SHALL tạo quiz với thông tin cấu hình đã nhập
3. WHEN quiz được tạo THEN hệ thống SHALL thêm các câu hỏi đã chọn vào quiz
4. WHEN thêm câu hỏi thành công THEN hệ thống SHALL hiển thị thông báo thành công và reload danh sách bài học
5. WHEN có lỗi xảy ra THEN hệ thống SHALL hiển thị thông báo lỗi cụ thể

### Requirement 5

**User Story:** Là giáo viên, tôi muốn form tạo quiz có validation rõ ràng, để tôi biết trường nào còn thiếu hoặc sai.

#### Acceptance Criteria

1. WHEN giáo viên chưa nhập tiêu đề THEN hệ thống SHALL hiển thị lỗi "Tiêu đề là bắt buộc"
2. WHEN giáo viên nhập thời gian không hợp lệ THEN hệ thống SHALL hiển thị lỗi "Thời gian phải từ 1-180 phút"
3. WHEN giáo viên nhập điểm không hợp lệ THEN hệ thống SHALL hiển thị lỗi "Điểm phải từ 0-100%"
4. WHEN giáo viên nhập số lần làm không hợp lệ THEN hệ thống SHALL hiển thị lỗi "Số lần làm phải từ 1-10"
5. WHEN giáo viên chưa chọn câu hỏi nào THEN hệ thống SHALL hiển thị cảnh báo "Nên chọn ít nhất 1 câu hỏi"

### Requirement 6

**User Story:** Là giáo viên, tôi muốn có thể tạo quiz mà không chọn câu hỏi ngay, để tôi có thể thêm câu hỏi sau.

#### Acceptance Criteria

1. WHEN giáo viên không chọn câu hỏi nào THEN hệ thống SHALL vẫn cho phép tạo quiz
2. WHEN quiz được tạo mà không có câu hỏi THEN hệ thống SHALL hiển thị thông báo "Quiz đã tạo, bạn có thể thêm câu hỏi sau"
3. WHEN quiz không có câu hỏi được tạo THEN hệ thống SHALL hiển thị quiz trong danh sách với số câu hỏi = 0
4. WHEN giáo viên xem quiz không có câu hỏi THEN hệ thống SHALL hiển thị nút "Thêm câu hỏi"
5. WHEN giáo viên nhấn "Thêm câu hỏi" THEN hệ thống SHALL mở giao diện thêm câu hỏi cho quiz đó
