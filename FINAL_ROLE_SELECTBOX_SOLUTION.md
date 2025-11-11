# ✅ Giải pháp cuối cùng - Role Selectbox

## 📋 Implementation theo Best Practices

### 1. Single Source of Truth - ROLE_OPTIONS

```typescript
readonly ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'TEACHER', label: 'Giảng viên' },
  { value: 'STUDENT', label: 'Học viên' }
] as const;

getRoleText(role: string): string {
  return this.ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
}
```

**Lợi ích:**
- Một nguồn dữ liệu duy nhất
- Dễ maintain và update
- Type-safe với `as const`

### 2. Template - One-way binding + Event

```html
<select [ngModel]="user.role"
        (ngModelChange)="onRoleChange(user.id, user.role, $event)"
        [name]="'user-role-' + user.id"
        class="role-select px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
        [ngClass]="getRoleClass(user.role)"
        title="Click để thay đổi vai trò">
  @for (roleOpt of ROLE_OPTIONS; track roleOpt.value) {
    <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
  }
</select>
```

**Điểm quan trọng:**
- ✅ `[ngModel]` (one-way) - Không dùng `[(ngModel)]` (two-way)
- ✅ `(ngModelChange)` - Bắt sự kiện thay đổi
- ✅ `[name]` unique - Mỗi select có name riêng
- ✅ `[value]="roleOpt.value"` - Dùng code string, không dùng object
- ✅ `@for` với `track` - Performance tốt

### 3. Handler - onRoleChange (duy nhất)

```typescript
onRoleChange(userId: string, oldRole: string, newRole: string): void {
  console.log('[ROLE CHANGE]', { userId, oldRole, newRole });
  
  // 1. Check if actually changed
  if (oldRole === newRole) {
    return;
  }

  // 2. Confirm with user
  if (!confirm(`Bạn có chắc chắn muốn thay đổi vai trò thành ${this.getRoleText(newRole)}?`)) {
    // Revert local state (NO reload)
    const users = this._localUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx > -1) {
      users[idx] = { ...users[idx], role: oldRole };
      this._localUsers.set([...users]);
    }
    return;
  }

  // 3. Call API
  this.adminService.updateUser(userId, { role: newRole }).subscribe({
    next: () => {
      // Update local state (NO reload)
      const users = this._localUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx > -1) {
        users[idx] = { ...users[idx], role: newRole };
        this._localUsers.set([...users]);
      }
      alert(`Vai trò đã được thay đổi thành ${this.getRoleText(newRole)} thành công!`);
    },
    error: () => {
      // Revert local state (NO reload)
      const users = this._localUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx > -1) {
        users[idx] = { ...users[idx], role: oldRole };
        this._localUsers.set([...users]);
      }
      alert('Không thể thay đổi vai trò. Vui lòng thử lại.');
    }
  });
}
```

**Điểm quan trọng:**
- ✅ **Không reload** khi cancel - Chỉ revert local state
- ✅ **Không reload** khi success - Update local state
- ✅ **Không reload** khi error - Revert local state
- ✅ **Smooth UX** - Không có "nháy" UI
- ✅ **Debug log** - Dễ troubleshoot

### 4. Đã xóa các methods duplicate

- ❌ `changeUserRole()` - Đã xóa
- ❌ `onRoleChangeNew()` - Đã xóa
- ✅ `onRoleChange()` - Duy nhất

## 🎯 Cách hoạt động:

### Khi selectbox render:

1. `[ngModel]="user.role"` set giá trị hiện tại
2. Browser tự động select option có `value` match
3. Hiển thị label tương ứng: "Giảng viên", "Quản trị viên", "Học viên"

### Khi user click dropdown:

1. Browser hiển thị tất cả options
2. Option hiện tại được đánh dấu ✓ (native behavior)
3. User thấy rõ đang ở role nào

### Khi user chọn role mới:

1. `(ngModelChange)` trigger với giá trị mới
2. `onRoleChange(userId, oldRole, newRole)` được gọi
3. Kiểm tra có thay đổi không
4. Hiển thị confirm dialog
5. Nếu OK → Call API → Update local state
6. Nếu Cancel → Revert local state
7. **Không reload** → UI mượt mà

## 🐛 Debug Checklist:

### 1. Kiểm tra console log:

```
[ROLE CHANGE] { 
  userId: "123", 
  oldRole: "TEACHER",  ← Phải là code: ADMIN/TEACHER/STUDENT
  newRole: "ADMIN",    ← Phải là code: ADMIN/TEACHER/STUDENT
  oldType: "string",   ← Phải là string
  newType: "string"    ← Phải là string
}
```

**Nếu thấy:**
- `oldRole: "Giảng viên"` → SAI! Phải là "TEACHER"
- `oldRole: { value: "TEACHER" }` → SAI! Phải là string
- `oldRole: " TEACHER "` → SAI! Có space
- `oldRole: "teacher"` → SAI! Phải viết hoa

### 2. Kiểm tra template:

```html
<!-- ✅ ĐÚNG -->
<option [value]="roleOpt.value">{{ roleOpt.label }}</option>

<!-- ❌ SAI -->
<option [value]="roleOpt">{{ roleOpt.label }}</option>  <!-- Object -->
<option [value]="roleOpt.label">{{ roleOpt.label }}</option>  <!-- Label -->
```

### 3. Kiểm tra data từ backend:

```typescript
// Backend phải trả về:
{
  id: "123",
  name: "Teacher",
  email: "teacher@gmail.com",
  role: "TEACHER"  // ← Code string, không phải label
}
```

### 4. Kiểm tra FormsModule:

```typescript
@Component({
  imports: [CommonModule, RouterModule, FormsModule],  // ← Cần FormsModule
  ...
})
```

## ✨ Kết quả mong đợi:

### Selectbox hiển thị:
```
┌─────────────────────────────┐
│ Giảng viên                 ▼│  ← Hiển thị label tiếng Việt
└─────────────────────────────┘
```

### Dropdown hiển thị:
```
┌─────────────────────────────┐
│ Quản trị viên               │
│ Giảng viên            ✓     │  ← Có dấu tick
│ Học viên                    │
└─────────────────────────────┘
```

### Khi thay đổi:
1. User chọn "Quản trị viên"
2. Dialog: "Bạn có chắc chắn muốn thay đổi vai trò thành Quản trị viên?"
3. Click OK → API call → Success
4. Alert: "Vai trò đã được thay đổi thành Quản trị viên thành công!"
5. Selectbox cập nhật mượt mà, không reload trang

### Khi cancel:
1. User chọn "Quản trị viên"
2. Dialog: "Bạn có chắc chắn..."
3. Click Cancel
4. Selectbox quay về "Giảng viên" ngay lập tức
5. Không có reload, không có "nháy"

## 🎉 Kết luận:

Implementation này đảm bảo:
- ✅ Selectbox hiển thị đúng vai trò hiện tại
- ✅ Dropdown có dấu ✓ ở option hiện tại
- ✅ Thay đổi vai trò mượt mà, không "nháy"
- ✅ Cancel không làm reload trang
- ✅ Code sạch, dễ maintain
- ✅ Performance tốt với Signals
- ✅ Debug dễ dàng với console.log

Nếu vẫn không hoạt động, check console log để xem `oldRole` và `newRole` có đúng format không!
