Trang Tạo Rubric mới là một dạng "Form phức tạp" (Complex Form) với nhiều lớp dữ liệu lồng nhau. Hiện tại, giao diện này đang gặp vấn đề về "trọng lượng thị giác": thanh trạng thái bên phải quá đậm (màu xanh đen), trong khi các ô nhập liệu bên trái lại hơi nhạt nhòa và dàn trải.

Dưới đây là phương án Refactor theo phong cách Slender & Smart UI để tối ưu hóa việc nhập liệu:

1. Header & Điều hướng (Sticky Top Bar)

Breadcrumb: Đồng bộ hóa tiêu đề theo cấu trúc: Thư viện Rubric > [B]Tạo Rubric mới[/B].

Action Buttons: Nút "Lưu Rubric" và "Xem trước" nên được giữ ở vị trí cố định (Sticky) phía trên để giáo viên có thể nhấn Lưu bất cứ lúc nào khi đang soạn thảo danh sách tiêu chí dài.

2. Sidebar: "Bảng trạng thái trọng số" (Sticky Summary)

Thanh bên phải hiện đang rất "nặng" về màu sắc.

Refactor: Chuyển sang màu nền sáng (bg-white hoặc bg-slate-50) với viền và đổ bóng tinh tế. Chỉ sử dụng màu xanh đậm làm điểm nhấn cho các thanh tiến độ (Progress Bar).

Tính năng Sticky: Thanh này phải là Sticky Sidebar (luôn chạy dọc theo màn hình khi giáo viên cuộn xuống thêm tiêu chí thứ 10, 20...).

Cảnh báo thông minh: Khi tổng trọng số chưa đạt 100%, nhãn "CÒN THIẾU" nên có hiệu ứng rung nhẹ hoặc màu cam/đỏ rõ ràng hơn để gây chú ý.

3. Cấu trúc tiêu chí (Criteria Card) - Phần quan trọng nhất

Hiện tại mỗi tiêu chí đang chiếm quá nhiều diện tích dọc. Cần "ép phẳng" (Flatten) lại:

Hàng 1 (Thông tin chính): Tên tiêu chí và Trọng số nên nằm trên cùng một hàng ngang. Ô "Trọng số" nên nhỏ gọn lại, không cần một box lớn như hiện tại.

Thang điểm chi tiết (Levels of Performance):

Thay vì các card vuông to (Xuất sắc, Đạt yêu cầu...), hãy chuyển sang dạng Bảng ngang (Inline Grid).

Mỗi mức độ gồm: [Tên mức độ] + [Điểm]. Thiết kế chúng thanh mảnh như các Badge lớn.

Nút "+ THÊM MỨC ĐỘ" nên đặt ở cuối hàng ngang đó.

4. Tinh chỉnh Input & Typography

Màu nền: Áp dụng công thức bg-slate-50 cho các ô input để phân biệt với nền trắng của Card. Khi click vào (Focus), ô sẽ chuyển sang trắng và có viền xanh.

Nhãn (Label): Các tiêu đề mục như "THÔNG TIN ĐỊNH DANH", "CẤU TRÚC TIÊU CHÍ" nên viết hoa, đậm, size nhỏ (text-[11px]) và có khoảng cách ký tự (tracking-wider) để trông chuyên nghiệp hơn.

5. Ý tưởng "Smart UX" cho Rubric

Sao chép tiêu chí (Duplicate): Thêm nút "Nhân bản" cho mỗi tiêu chí. Thông thường các tiêu chí trong Rubric có cấu trúc thang điểm giống nhau, giáo viên chỉ cần nhân bản rồi sửa chữ.

Tự động tính điểm: Khi giáo viên nhập điểm cho mức "Xuất sắc" (ví dụ: 10), hệ thống có thể gợi ý các mức dưới là 7, 5, 2 (giảm dần) để tiết kiệm thời gian gõ.

Kéo thả (Drag & Drop): Cho phép thay đổi thứ tự các tiêu chí bằng cách kéo thả.

Mô tả bố cục Slender đề xuất:

Main Content (Trái - 70%):

Card thông tin chung (Nén chiều cao).

Danh sách tiêu chí: Mỗi tiêu chí là một Card trắng, đổ bóng nhẹ. Bên trong card, các ô nhập liệu được dàn hàng ngang tối đa để giảm việc cuộn trang.

Sidebar (Phải - 30%):

Bảng tổng hợp trọng số: Trông như một "Widget" hiện đại, sạch sẽ.

Nút "HỦY BỎ" chuyển thành dạng Ghost button (chỉ có chữ và viền mờ) để ưu tiên cho nút "LƯU" ở trên Header.

Kết quả: Giao diện sẽ thoát khỏi cảm giác "đồ sộ", giúp giáo viên tập trung vào logic chấm điểm và nhìn thấy được nhiều tiêu chí cùng lúc trên màn hình hơn.