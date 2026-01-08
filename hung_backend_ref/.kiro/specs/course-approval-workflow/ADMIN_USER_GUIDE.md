# Hướng dẫn Sử dụng - Quy trình Phê duyệt Khóa học (Dành cho Quản trị viên)

## Tổng quan

Là quản trị viên, bạn có trách nhiệm xem xét và phê duyệt các khóa học trước khi chúng được công bố cho học viên. Hướng dẫn này sẽ giúp bạn thực hiện công việc một cách hiệu quả.

## Vai trò và Trách nhiệm

### 🎯 Vai trò Chính
- Xem xét chất lượng khóa học
- Phê duyệt hoặc từ chối khóa học
- Cung cấp phản hồi chi tiết cho giảng viên
- Đảm bảo tiêu chuẩn chất lượng

### 📋 Tiêu chí Đánh giá
1. **Nội dung**: Chính xác, đầy đủ, cập nhật
2. **Cấu trúc**: Logic, dễ theo dõi
3. **Chất lượng**: Video/audio rõ ràng, tài liệu đẹp
4. **Tính ứng dụng**: Phù hợp với đối tượng học viên
5. **Kỹ thuật**: Không lỗi, hoạt động tốt

---

## Giao diện Quản lý

### 1. Dashboard Duyệt Khóa học

**Đường dẫn**: `/admin/courses/review`

**Chức năng**:
- Xem danh sách khóa học chờ duyệt
- Tìm kiếm và lọc khóa học
- Xem chi tiết khóa học
- Phê duyệt hoặc từ chối

**Thống kê hiển thị**:
- Tổng số khóa học chờ duyệt
- Số khóa học đã duyệt hôm nay
- Thời gian chờ trung bình

### 2. Quản lý Khóa học Tổng thể

**Đường dẫn**: `/admin/courses`

**Chức năng**:
- Xem tất cả khóa học trong hệ thống
- Lọc theo trạng thái
- Thống kê tổng quan
- Quản lý khóa học đã duyệt

---

## Quy trình Phê duyệt Khóa học

### Bước 1: Xem Danh sách Chờ duyệt

1. Đăng nhập với tài khoản admin
2. Vào menu **"Duyệt khóa học"**
3. Xem danh sách khóa học có trạng thái **Chờ duyệt**

**Thông tin hiển thị**:
- Tên khóa học
- Mã khóa học
- Giảng viên
- Ngày gửi
- Số chương/bài học

### Bước 2: Xem Chi tiết Khóa học

1. Click **"Xem chi tiết"** trên khóa học cần xem xét
2. Modal hiển thị thông tin đầy đủ:
   - Thông tin cơ bản
   - Mô tả chi tiết
   - Thông tin giảng viên
   - Thống kê (số chương, bài học, bài tập)
   - Ngày tạo và gửi duyệt

3. Đánh giá theo checklist (xem phần dưới)

### Bước 3: Ra Quyết định

#### ✅ Phê duyệt Khóa học

**Khi nào nên phê duyệt?**
- Nội dung chất lượng, đầy đủ
- Không có lỗi kỹ thuật
- Phù hợp với tiêu chuẩn
- Có giá trị cho học viên

**Cách thực hiện**:
1. Click nút **"Duyệt khóa học"** (màu xanh)
2. Xác nhận phê duyệt
3. Hệ thống tự động:
   - Chuyển trạng thái sang **Đã duyệt**
   - Ghi nhận tên admin và thời gian
   - Gửi thông báo cho giảng viên
   - Hiển thị khóa học trên marketplace

#### ❌ Từ chối Khóa học

**Khi nào nên từ chối?**
- Nội dung sai sót, thiếu sót
- Chất lượng kém
- Không đúng tiêu chuẩn
- Có vấn đề kỹ thuật

**Cách thực hiện**:
1. Click nút **"Từ chối"** (màu đỏ)
2. **BẮT BUỘC** nhập lý do từ chối:
   - Mô tả cụ thể vấn đề
   - Hướng dẫn cách sửa
   - Tham khảo tiêu chuẩn
   - Tích cực, mang tính xây dựng

3. Click **"Từ chối khóa học"**
4. Hệ thống tự động:
   - Chuyển trạng thái sang **Bị từ chối**
   - Lưu lý do và thông tin admin
   - Gửi thông báo cho giảng viên
   - Giảng viên có thể xem phản hồi và sửa

---

## Tính năng Chính

### 1. Tìm kiếm và Lọc

**Tìm kiếm**:
- Theo tên khóa học
- Theo tên giảng viên
- Theo mã khóa học

**Lọc theo trạng thái**:
- Tất cả
- Chờ duyệt (mặc định)
- Đã duyệt
- Bị từ chối
- Nháp

**Cách sử dụng**:
1. Nhập từ khóa vào ô tìm kiếm
2. Chọn trạng thái từ dropdown
3. Click **"Tìm kiếm"** hoặc Enter
4. Kết quả hiển thị ngay lập tức

### 2. Phân trang

- Hiển thị 10 khóa học mỗi trang
- Nút **Trước/Sau** để chuyển trang
- Hiển thị: "Trang X / Y"
- Tổng số khóa học

### 3. Xem Chi tiết Nhanh

Từ bảng danh sách:
- Click **"Xem chi tiết"**: Mở modal với thông tin đầy đủ
- Click **"Duyệt"**: Phê duyệt nhanh (chỉ khóa học chờ duyệt)
- Click **"Từ chối"**: Mở form nhập lý do

### 4. Thao tác Hàng loạt

**Từ modal chi tiết**:
- Xem thông tin
- Phê duyệt trực tiếp
- Từ chối với lý do
- Đóng và quay lại danh sách

---

## Checklist Đánh giá Khóa học

### ✅ Thông tin Cơ bản (Bắt buộc)

- [ ] **Tên khóa học**
  - Rõ ràng, dễ hiểu
  - Không quá dài (< 100 ký tự)
  - Không chứa ký tự đặc biệt lạ

- [ ] **Mã khóa học**
  - Đúng format quy định
  - Không trùng với khóa học khác

- [ ] **Mô tả**
  - Đầy đủ, chi tiết (> 200 ký tự)
  - Mô tả đúng nội dung
  - Không có lỗi chính tả nghiêm trọng

- [ ] **Danh mục**
  - Phân loại đúng
  - Phù hợp với nội dung

### ✅ Cấu trúc Nội dung (Bắt buộc)

- [ ] **Số lượng**
  - Tối thiểu 3 chương
  - Mỗi chương có ít nhất 2 bài học
  - Tổng thời lượng hợp lý

- [ ] **Tổ chức**
  - Cấu trúc logic, rõ ràng
  - Sắp xếp từ dễ đến khó
  - Tên chương/bài mô tả đúng nội dung

- [ ] **Đầy đủ**
  - Có phần giới thiệu
  - Có phần tổng kết
  - Có bài tập/quiz (nếu phù hợp)

### ✅ Chất lượng Nội dung (Quan trọng)

- [ ] **Tính chính xác**
  - Thông tin đúng, cập nhật
  - Không có sai sót nghiêm trọng
  - Tham khảo nguồn đáng tin cậy

- [ ] **Tính đầy đủ**
  - Bao quát các khía cạnh chính
  - Giải thích rõ ràng
  - Có ví dụ minh họa

- [ ] **Tính ứng dụng**
  - Phù hợp với đối tượng
  - Có giá trị thực tế
  - Dễ áp dụng

### ✅ Chất lượng Kỹ thuật (Bắt buộc)

- [ ] **Video** (nếu có)
  - Hình ảnh rõ nét
  - Âm thanh rõ ràng
  - Không bị lỗi phát

- [ ] **Tài liệu**
  - File mở được
  - Định dạng chuẩn
  - Nội dung đầy đủ

- [ ] **Link**
  - Tất cả link hoạt động
  - Không link đến trang lỗi
  - Link an toàn

### ✅ Trải nghiệm Học viên (Nên có)

- [ ] **Dễ theo dõi**
  - Ngôn ngữ dễ hiểu
  - Không quá phức tạp
  - Có hướng dẫn rõ ràng

- [ ] **Tương tác**
  - Có bài tập thực hành
  - Có quiz kiểm tra
  - Khuyến khích tham gia

- [ ] **Hỗ trợ**
  - Có tài liệu tham khảo
  - Có hướng dẫn bổ sung
  - Có cách liên hệ giảng viên

---

## Mẫu Phản hồi Từ chối

### 1. Nội dung Thiếu sót

```
Khóa học cần bổ sung thêm nội dung:

- Chương 2 chỉ có 1 bài học, cần thêm ít nhất 1 bài nữa
- Thiếu phần tổng kết cuối khóa
- Cần thêm bài tập thực hành cho mỗi chương

Vui lòng bổ sung và gửi lại. Cảm ơn!
```

### 2. Chất lượng Kỹ thuật

```
Phát hiện một số vấn đề kỹ thuật:

- Video bài 3 chương 1 không phát được
- File PDF bài 5 bị lỗi, không mở được
- Link tài liệu tham khảo bị hỏng

Vui lòng kiểm tra và sửa các lỗi trên. Cảm ơn!
```

### 3. Nội dung Sai sót

```
Nội dung cần được cập nhật và sửa lỗi:

- Thông tin ở bài 2 chương 3 đã lỗi thời (cần cập nhật theo quy định mới 2024)
- Công thức tính toán ở bài 4 có sai sót
- Một số thuật ngữ chuyên môn cần được giải thích rõ hơn

Vui lòng xem xét và chỉnh sửa. Cảm ơn!
```

### 4. Cấu trúc Chưa hợp lý

```
Cấu trúc khóa học cần được sắp xếp lại:

- Nên bắt đầu với phần giới thiệu tổng quan
- Chương 3 nên đặt trước chương 2 (theo logic kiến thức)
- Nên chia nhỏ chương 4 thành 2 chương riêng (quá dài)

Vui lòng xem xét cấu trúc lại. Cảm ơn!
```

### 5. Không đạt Tiêu chuẩn

```
Khóa học chưa đạt tiêu chuẩn tối thiểu:

- Chỉ có 2 chương (yêu cầu tối thiểu 3 chương)
- Mô tả quá ngắn, cần mô tả chi tiết hơn về nội dung
- Thiếu bài tập và quiz để kiểm tra kiến thức

Vui lòng bổ sung theo tiêu chuẩn. Cảm ơn!
```

---

## Các Tình huống Thường gặp

### ❓ Khóa học gần đạt nhưng có vài lỗi nhỏ?

**Giải pháp**: Từ chối với phản hồi chi tiết
- Liệt kê cụ thể các lỗi
- Hướng dẫn cách sửa
- Khuyến khích giảng viên sửa nhanh

### ❓ Không chắc chắn về chất lượng nội dung chuyên môn?

**Giải pháp**: Tham khảo ý kiến
- Hỏi giảng viên khác trong lĩnh vực
- Tham khảo tài liệu chuyên môn
- Yêu cầu giảng viên cung cấp nguồn tham khảo

### ❓ Giảng viên gửi lại nhiều lần vẫn chưa đạt?

**Giải pháp**: Liên hệ trực tiếp
- Gọi điện hoặc gặp trực tiếp
- Giải thích rõ yêu cầu
- Hỗ trợ cụ thể nếu cần

### ❓ Khóa học tốt nhưng giảng viên mới, chưa có kinh nghiệm?

**Giải pháp**: Phê duyệt và theo dõi
- Phê duyệt nếu đạt tiêu chuẩn
- Ghi chú theo dõi phản hồi học viên
- Hỗ trợ giảng viên cải thiện

### ❓ Có quá nhiều khóa học chờ duyệt?

**Giải pháp**: Ưu tiên và phân công
- Ưu tiên khóa học chờ lâu nhất
- Ưu tiên khóa học có nhiều học viên quan tâm
- Phân công cho nhiều admin nếu có

---

## Thống kê và Báo cáo

### Theo dõi Hiệu suất

**Chỉ số quan trọng**:
- Số khóa học đã duyệt/ngày
- Thời gian xử lý trung bình
- Tỷ lệ phê duyệt/từ chối
- Số khóa học chờ duyệt

**Mục tiêu**:
- Xử lý trong vòng 48 giờ
- Tỷ lệ phê duyệt > 70%
- Không để khóa học chờ quá 5 ngày

### Báo cáo Định kỳ

**Hàng tuần**:
- Tổng số khóa học đã xử lý
- Các vấn đề thường gặp
- Đề xuất cải thiện

**Hàng tháng**:
- Thống kê tổng thể
- Xu hướng chất lượng
- Đánh giá giảng viên

---

## Best Practices

### 1. Xem xét Công bằng
- Áp dụng tiêu chuẩn nhất quán
- Không thiên vị
- Đánh giá khách quan

### 2. Phản hồi Xây dựng
- Cụ thể, rõ ràng
- Tích cực, khuyến khích
- Hướng dẫn cách sửa

### 3. Xử lý Nhanh chóng
- Ưu tiên khóa học chờ lâu
- Không để quá 48 giờ
- Thông báo nếu cần thêm thời gian

### 4. Ghi chú Đầy đủ
- Lưu lý do quyết định
- Ghi chú các vấn đề đặc biệt
- Tham khảo cho lần sau

### 5. Cải thiện Liên tục
- Học hỏi từ phản hồi
- Cập nhật tiêu chuẩn
- Chia sẻ kinh nghiệm

---

## Liên hệ và Hỗ trợ

**Hỗ trợ kỹ thuật**:
📧 tech-support@lms-maritime.com

**Quản lý nội dung**:
📧 content@lms-maritime.com

**Khẩn cấp**:
📞 1900-xxxx (24/7)

---

## Cập nhật

**Phiên bản**: 1.0.0  
**Ngày**: 01/12/2024  
**Tác giả**: LMS Maritime Team
