# Feature: Course Detail Modal for Admin

## Tổng quan
Tính năng modal xem chi tiết khóa học cho phép admin xem đầy đủ thông tin về một khóa học mà không cần navigate sang trang khác.

## Vấn đề đã giải quyết
- Admin cần xem chi tiết khóa học để đánh giá chất lượng
- Trước đây nút "Xem chi tiết" gây lỗi timeout vì navigate đến route không tồn tại
- Cần một cách nhanh chóng để xem thông tin khóa học mà không rời khỏi trang quản lý

## Giải pháp
Tạo modal popup hiển thị đầy đủ thông tin khóa học với các section:

### 1. Thông tin cơ bản (📋 Basic Info)
- **Ảnh bìa**: Thumbnail của khóa học (nếu có)
- **Tiêu đề**: Tên khóa học
- **Trạng thái**: Badge màu hiển thị trạng thái (PENDING/APPROVED/REJECTED)
- **Mô tả**: Mô tả ngắn về khóa học
- **Giá**: Giá bán hoặc "Miễn phí"
- **Cấp độ**: Beginner/Intermediate/Advanced
- **Danh mục**: Phân loại khóa học

### 2. Thông tin giảng viên (👨‍🏫 Teacher Info)
- **Avatar**: Ảnh đại diện giảng viên
- **Tên**: Họ tên giảng viên
- **Email**: Email liên hệ
- **Rating**: Đánh giá trung bình
- **Số học viên**: Tổng số học viên đã dạy

### 3. Nội dung khóa học (📚 Course Content)
- **Số chương học**: Tổng số sections
- **Số bài học**: Tổng số lessons
- **Số bài tập**: Tổng số assignments

### 4. Trạng thái phê duyệt (✅ Review Status)
- **Ngày nộp**: Thời điểm giảng viên submit khóa học
- **Ngày phê duyệt**: Thời điểm admin approve (nếu có)
- **Lý do từ chối**: Hiển thị nếu khóa học bị reject
- **Nhận xét**: Comment của admin khi review

### 5. Thống kê (📊 Statistics)
- **Số học viên đã đăng ký**: Tổng số enrollments
- **Doanh thu**: Tổng revenue từ khóa học

## Implementation Details

### Frontend Changes

#### 1. Component State
**File**: `fe/src/app/features/admin/presentation/components/course-management.component.ts`

Thêm signals mới:
```typescript
showDetailModal = signal(false);
```

#### 2. Methods
```typescript
viewCourse(courseId: string): void {
  const course = this.courses().find(c => c.id === courseId);
  if (course) {
    this.selectedCourse.set(course);
    this.showDetailModal.set(true);
  }
}

closeDetailModal(): void {
  this.showDetailModal.set(false);
  this.selectedCourse.set(null);
}
```

#### 3. Interface Updates
**File**: `fe/src/app/features/admin/infrastructure/services/admin.service.ts`

Thêm fields mới vào `AdminCourseSummary`:
```typescript
lessonsCount?: number;
reviewComment?: string;
```

#### 4. Modal Template
Modal sử dụng:
- Tailwind CSS cho styling
- Angular signals cho reactive state
- Conditional rendering với `@if`
- Click outside để đóng modal
- Responsive design với max-height và scroll

### UI/UX Features

1. **Responsive Design**: Modal tự động điều chỉnh kích thước
2. **Scrollable Content**: Nội dung dài có thể scroll trong modal
3. **Easy Close**: Có thể đóng bằng:
   - Nút X ở góc trên
   - Nút "Đóng" ở footer
   - Click vào overlay (background)
4. **Visual Hierarchy**: Sử dụng icons và màu sắc để phân biệt sections
5. **Information Density**: Hiển thị nhiều thông tin nhưng vẫn dễ đọc

### Type Safety
Tất cả các optional fields đều được handle với:
- Optional chaining (`?.`)
- Nullish coalescing (`||`)
- Non-null assertion (`!`) khi đã check trước đó
- Default values cho số liệu

## Testing

### Manual Testing Steps
1. Đăng nhập với tài khoản admin
2. Vào trang "Quản lý khóa học"
3. Tìm khóa học có status APPROVED
4. Click nút "Xem chi tiết"
5. Verify modal hiển thị với đầy đủ thông tin
6. Kiểm tra scroll nếu nội dung dài
7. Đóng modal bằng các cách khác nhau
8. Kiểm tra với khóa học có status khác (PENDING, REJECTED)

### Edge Cases Handled
- Khóa học không có thumbnail
- Khóa học miễn phí (price = 0 hoặc null)
- Khóa học chưa có rating
- Khóa học chưa có học viên
- Khóa học chưa có review comment
- Khóa học bị reject (hiển thị rejection reason)

## Benefits

1. **Tốc độ**: Không cần navigate, modal mở ngay lập tức
2. **Context**: Giữ nguyên context của trang quản lý
3. **Hiệu quả**: Admin có thể xem nhiều khóa học nhanh chóng
4. **Thông tin đầy đủ**: Tất cả thông tin quan trọng ở một chỗ
5. **UX tốt**: Giao diện đẹp, dễ sử dụng, responsive

## Future Enhancements

Có thể mở rộng thêm:
1. Tab để xem chi tiết sections và lessons
2. Preview video giới thiệu
3. Xem danh sách học viên đã đăng ký
4. Link trực tiếp đến trang edit khóa học
5. Thêm actions (approve/reject) ngay trong modal
6. Export thông tin khóa học ra PDF

## Files Changed

### Frontend
- `fe/src/app/features/admin/presentation/components/course-management.component.ts`
  - Added `showDetailModal` signal
  - Added `viewCourse()` method with console logging
  - Added `closeDetailModal()` method
  - Added modal template with full course details

- `fe/src/app/features/admin/infrastructure/services/admin.service.ts`
  - Updated `AdminCourseSummary` interface
  - Added `lessonsCount?: number`
  - Added `reviewComment?: string`

## Conclusion

Tính năng này cải thiện đáng kể trải nghiệm của admin khi quản lý khóa học, giúp họ có thể xem và đánh giá khóa học nhanh chóng và hiệu quả hơn.
