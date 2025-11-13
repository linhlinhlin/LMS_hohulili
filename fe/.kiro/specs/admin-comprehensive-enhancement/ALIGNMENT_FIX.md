# Admin Dashboard Alignment Fix

## Vấn đề
Dashboard admin bị đẩy lệch khỏi vị trí, có khoảng trắng lớn ở trên và bên trái, thay vì bắt đầu từ góc trên bên trái của khu vực nội dung.

## Nguyên nhân
Thẻ `<main>` hoặc các container có thể đang bị áp dụng CSS căn giữa (`align-items: center`, `justify-content: center`) từ các style toàn cục hoặc Tailwind CSS.

## Giải pháp đã áp dụng

### 1. Sửa Admin Layout Component
**File:** `src/app/features/admin/presentation/components/admin-layout-simple.component.ts`

Thêm CSS override cho thẻ `main`:
```css
main {
  display: block;
  width: 100%;
  /* Remove any centering that might be applied globally */
}
```

### 2. Sửa Dashboard Component SCSS
**File:** `src/app/features/admin/presentation/components/dashboard/admin-dashboard.component.scss`

Thêm CSS cho `:host` và `.dashboard-container`:
```scss
:host {
  display: block;
  width: 100%;
}

.dashboard-container {
  width: 100%;
  margin: 0;
  padding: 0;
  // ... existing styles
}
```

## Kết quả
- Dashboard bây giờ sẽ bắt đầu từ góc trên bên trái
- Không còn khoảng trắng không mong muốn
- Layout responsive vẫn hoạt động bình thường

## Kiểm tra
Mở trang admin dashboard và xác nhận:
- ✅ Không có khoảng trắng ở trên header "Quản trị Hệ thống"
- ✅ Không có khoảng trắng giữa sidebar và nội dung
- ✅ Dashboard chiếm toàn bộ khu vực nội dung có sẵn
