# Task: Redesign Course Management UI

## Mục tiêu
Redesign giao diện trang `/teacher/courses` để đồng nhất với `/teacher/dashboard`

## Yêu cầu
- ✅ Giữ nguyên 100% chức năng và logic hiện tại
- ✅ Tông màu chủ đạo: Xanh biển (blue)
- ✅ Giao diện đơn giản, dễ thao tác
- ✅ Giảm khoảng trống thừa ở 2 lề (tăng max-width)
- ✅ Đồng nhất với style của dashboard

## Files cần xem
1. `fe/src/app/features/teacher/dashboard/teacher-dashboard.component.ts` - Giao diện dashboard mẫu
2. `fe/src/app/features/teacher/courses/course-management.component.ts` - Giao diện cần redesign

## Các bước thực hiện
1. **Phân tích Dashboard UI**
   - Đọc template của dashboard component
   - Note các pattern: colors, spacing, card styles, buttons
   - Note max-width container và layout structure

2. **Phân tích Course Management UI hiện tại**
   - Đọc template hiện tại
   - List tất cả các chức năng: create, edit, delete, publish, filter, search
   - Note các state và logic cần giữ nguyên

3. **Tạo Plan chi tiết**
   - Map các element từ dashboard sang course management
   - Define color scheme (blue-based)
   - Define spacing và layout
   - Define component structure

4. **Implement từng phần**
   - Header section
   - Filter/Search section  
   - Course cards/list
   - Action buttons
   - Modals (nếu có)

5. **Test và verify**
   - Kiểm tra tất cả chức năng vẫn hoạt động
   - Kiểm tra responsive
   - Kiểm tra consistency với dashboard

## Notes
- Đã sửa nhiều lỗi trong phiên trước:
  - Backend compilation errors
  - Angular NG01350 error
  - Form structure issues
  - Lesson count feature
  - Back button courseId issue
  
- Cần phiên mới với đủ token để thực hiện redesign cẩn thận
