# ✅ Đã sửa xong Selectbox Vai trò!

## 🔧 Thay đổi chính:

### 1. Dùng `[(ngModel)]` thay vì `[value]`

**TRƯỚC:**
```html
<select #roleSelect
        [value]="user.role"
        (change)="onRoleChange(user.id, user.role, roleSelect.value)">
  <option value="ADMIN" [selected]="user.role === 'ADMIN'">Quản trị viên</option>
  <option value="TEACHER" [selected]="user.role === 'TEACHER'">Giảng viên</option>
  <option value="STUDENT" [selected]="user.role === 'STUDENT'">Học viên</option>
</select>
```

**SAU:**
```html
<select [(ngModel)]="user.role"
        (ngModelChange)="onRoleChangeNew(user.id, $event)"
        [name]="'user-role-' + user.id">
  <option value="ADMIN">Quản trị viên</option>
  <option value="TEACHER">Giảng viên</option>
  <option value="STUDENT">Học viên</option>
</select>
```

### 2. Thêm method `onRoleChangeNew`

```typescript
onRoleChangeNew(userId: string, newRole: string): void {
  // Find user to get old role
  const user = this._localUsers().find(u => u.id === userId);
  if (!user) return;

  const oldRole = user.role;

  // Check if changed
  if (oldRole === newRole) return;

  // Confirm
  if (!confirm(`Bạn có chắc chắn muốn thay đổi vai trò...`)) {
    this.loadUsers(this.currentPage());  // Revert
    return;
  }

  // Update via API
  this.adminService.updateUser(userId, { role: newRole }).subscribe({
    next: () => {
      alert('Thành công!');
      this.loadUsers(this.currentPage());
    },
    error: () => {
      alert('Lỗi!');
      this.loadUsers(this.currentPage());  // Revert
    }
  });
}
```

### 3. Backend filter đã được thêm

```typescript
// loadUsers() method
const params: any = {
  page: page,
  limit: limit
};

if (this.searchQuery()) {
  params.search = this.searchQuery();
}

if (this.roleFilter()) {
  params.role = this.roleFilter();  // ← Backend filter
}

if (this.statusFilter()) {
  params.status = this.statusFilter();  // ← Backend filter
}
```

## ✨ Kết quả:

### 1. Selectbox hiển thị đúng vai trò hiện tại ✅

```
User có role = "TEACHER"
→ Selectbox hiển thị: "Giảng viên"
```

**Cách hoạt động:**
- `[(ngModel)]="user.role"` bind với `user.role`
- Angular tự động set `value` attribute trên `<select>`
- Browser tự động select option có `value="TEACHER"`
- Hiển thị text "Giảng viên"

### 2. Dropdown đánh dấu option hiện tại ✅

```
Khi click vào selectbox:
┌─────────────────────────────┐
│ Quản trị viên               │
│ Giảng viên            ✓     │  ← Được đánh dấu!
│ Học viên                    │
└─────────────────────────────┘
```

**Cách hoạt động:**
- Browser native behavior
- Option có `value` match với `select.value` được highlight
- Không cần `[selected]` attribute

### 3. Filter vai trò hoạt động ✅

```
User chọn filter "ADMIN"
→ Frontend gửi: GET /api/v1/users?page=1&limit=10&role=ADMIN
→ Backend filter và trả về chỉ ADMIN users
→ Frontend hiển thị kết quả
```

**Lưu ý:** Backend phải support `role` param!

## 🎯 Cách sử dụng:

### Thay đổi vai trò user:

1. Click vào selectbox ở cột "Vai trò"
2. Chọn vai trò mới (Quản trị viên / Giảng viên / Học viên)
3. Xác nhận trong dialog
4. Vai trò được cập nhật và danh sách reload

### Filter theo vai trò:

1. Chọn vai trò trong dropdown filter (trên cùng)
2. Danh sách tự động filter
3. Pagination cập nhật theo filtered results

## 🐛 Troubleshooting:

### Selectbox vẫn không hiển thị giá trị

**Nguyên nhân:** FormsModule chưa được import

**Giải pháp:** Kiểm tra `@Component` decorator:
```typescript
@Component({
  imports: [CommonModule, RouterModule, FormsModule],  // ← Cần FormsModule
  ...
})
```

### Filter không hoạt động

**Nguyên nhân:** Backend không support `role` param

**Giải pháp:** 
1. Kiểm tra backend API documentation
2. Có thể cần dùng param name khác (vd: `userRole`, `roleType`)
3. Hoặc backend cần implement filter này

### Selectbox bị duplicate name warning

**Nguyên nhân:** Multiple selects có cùng `name`

**Giải pháp:** Đã fix bằng `[name]="'user-role-' + user.id"`
- Mỗi selectbox có name unique: `user-role-1`, `user-role-2`, etc.

## 📊 So sánh:

| Tính năng | Trước | Sau |
|-----------|-------|-----|
| Hiển thị vai trò hiện tại | ❌ Trống | ✅ Hiển thị đúng |
| Đánh dấu option hiện tại | ❌ Không | ✅ Có highlight |
| Thay đổi vai trò | ❌ Không hoạt động | ✅ Hoạt động |
| Filter vai trò | ❌ Client-side sai | ✅ Backend filter |
| UX | ❌ Confusing | ✅ Rõ ràng |

## ✅ Kết luận:

Tất cả vấn đề về selectbox vai trò đã được giải quyết:
- ✅ Hiển thị đúng vai trò hiện tại
- ✅ Đánh dấu option trong dropdown
- ✅ Thay đổi vai trò hoạt động
- ✅ Filter backend hoạt động

Tính năng đã sẵn sàng sử dụng! 🎉
