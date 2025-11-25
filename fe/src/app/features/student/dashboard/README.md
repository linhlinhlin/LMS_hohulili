# Student Dashboard

Dashboard chính cho học viên, thiết kế theo phong cách Coursera.

## Cấu trúc

```
dashboard/
├── student-dashboard.component.ts  # Dashboard chính (Coursera-style)
└── README.md                       # File này
```

## Dashboard chính

**File:** `student-dashboard.component.ts`

Dashboard mới được thiết kế theo nguyên tắc của Coursera:

### Đặc điểm chính

1. **Bố cục 70/30**
   - 70% nội dung chính (danh sách khóa học)
   - 30% sidebar (widgets động lực)

2. **Cá nhân hóa**
   - Lời chào theo thời gian ("Chào buổi sáng, [Tên]")
   - Hiển thị mục tiêu nghề nghiệp
   - Nút chỉnh sửa mục tiêu (ghost button)

3. **Gamification**
   - Mục tiêu hàng ngày (0/3 với ngôi sao)
   - Heatmap học tập 4 tuần (giống GitHub)
   - Thống kê streak và mục tiêu hoàn thành

4. **Thẻ khóa học**
   - Tabs lọc: "Đang học" / "Hoàn thành"
   - Progress bar mỏng 4px (Coursera style)
   - Thẻ bài học tiếp theo với CTA "Tiếp tục học"
   - Thông báo hoàn thành với icon trophy

5. **UI Components**
   - Sử dụng design system mới: Button, Card, ProgressBar, Tabs, Icon
   - Màu sắc Coursera (#0056D2)
   - Spacing 8px grid
   - Hover effects và transitions mượt mà

### Usage

Dashboard được load tự động khi truy cập `/student/dashboard`:

```typescript
// student.routes.ts
{
  path: 'dashboard',
  loadComponent: () => import('./dashboard/student-dashboard.component')
    .then(m => m.StudentDashboardComponent),
  title: 'Dashboard - Học viên'
}
```

### Dependencies

- `AuthService` - Lấy thông tin user
- `StudentEnrollmentService` - Lấy danh sách khóa học
- UI Components từ `shared/components/ui/`

## Migration Completed

1. ✅ Tạo dashboard mới theo phong cách Coursera
2. ✅ Di chuyển vào folder `dashboard/`
3. ✅ Cập nhật routes
4. ✅ Xóa dashboard cũ và sub-components
5. ✅ Cấu trúc sạch sẽ và tối ưu

## Design Principles

Dashboard tuân theo các nguyên tắc thiết kế:

1. **Personalization** - Cá nhân hóa trải nghiệm
2. **Motivation** - Tạo động lực học tập
3. **Clarity** - Rõ ràng, dễ hiểu
4. **Action-oriented** - Tập trung vào hành động
5. **Visual hierarchy** - Phân cấp thị giác rõ ràng

## Notes

- Dashboard sử dụng Angular Signals cho reactive state
- Tất cả components đều standalone
- Styles sử dụng SCSS với design tokens
- Responsive design với mobile-first approach
