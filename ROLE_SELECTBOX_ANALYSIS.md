# 🔍 Phân tích vấn đề Selectbox Vai trò

## 📋 Code hiện tại:

```html
<select #roleSelect
        [value]="user.role"
        (change)="onRoleChange(user.id, user.role, roleSelect.value)"
        class="role-select px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
        [ngClass]="getRoleClass(user.role)"
        title="Click để thay đổi vai trò">
  <option value="ADMIN" [selected]="user.role === 'ADMIN'">Quản trị viên</option>
  <option value="TEACHER" [selected]="user.role === 'TEACHER'">Giảng viên</option>
  <option value="STUDENT" [selected]="user.role === 'STUDENT'">Học viên</option>
</select>
```

## ❌ Vấn đề:

### 1. Selectbox không hiển thị giá trị hiện tại
- `[value]="user.role"` không được browser render ra HTML
- Không có `selected` attribute nào được apply
- Selectbox hiển thị trống

### 2. Dropdown không đánh dấu option hiện tại
- Khi click vào selectbox, không có option nào được highlight
- User không biết đang ở role nào

### 3. Filter vai trò không hoạt động
- Backend có thể không hỗ trợ filter by role
- Hoặc params không đúng format

## 🔍 Nguyên nhân:

### Vấn đề 1 & 2: Angular binding không hoạt động

**Lý do:**
- `[value]` binding chỉ set initial value, không force browser select option
- `[selected]` binding trên option có thể bị conflict với `[value]` trên select
- Browser native behavior không được trigger đúng

**Giải pháp:**
Dùng `ngModel` hoặc `selectedIndex` để force browser select đúng option.

### Vấn đề 3: Backend filter

**Cần kiểm tra:**
- Backend có accept `role` param không?
- Format có đúng không? (ADMIN vs admin)
- API có trả về filtered results không?

## ✅ Giải pháp đề xuất:

### Cách 1: Dùng ngModel (Khuyến nghị)

```html
<select [(ngModel)]="user.role"
        (ngModelChange)="onRoleChange(user.id, $event)"
        [name]="'role-' + user.id"
        class="..."
        [ngClass]="getRoleClass(user.role)">
  <option value="ADMIN">Quản trị viên</option>
  <option value="TEACHER">Giảng viên</option>
  <option value="STUDENT">Học viên</option>
</select>
```

**Ưu điểm:**
- Two-way binding tự động
- Browser tự động select đúng option
- Không cần `[selected]` trên options

**Nhược điểm:**
- Cần FormsModule
- Cần unique `name` attribute

### Cách 2: Dùng selectedIndex

```typescript
// Component
getRoleIndex(role: string): number {
  const roles = ['ADMIN', 'TEACHER', 'STUDENT'];
  return roles.indexOf(role);
}
```

```html
<select [selectedIndex]="getRoleIndex(user.role)"
        (change)="onRoleChange(user.id, $any($event.target).value)"
        class="..."
        [ngClass]="getRoleClass(user.role)">
  <option value="ADMIN">Quản trị viên</option>
  <option value="TEACHER">Giảng viên</option>
  <option value="STUDENT">Học viên</option>
</select>
```

**Ưu điểm:**
- Không cần ngModel
- Force browser select by index

**Nhược điểm:**
- Phải maintain order của options
- Thêm method getRoleIndex

### Cách 3: Dùng native DOM manipulation

```html
<select #roleSelect
        [attr.data-role]="user.role"
        (change)="onRoleChange(user.id, roleSelect.value)"
        class="..."
        [ngClass]="getRoleClass(user.role)">
  <option value="ADMIN">Quản trị viên</option>
  <option value="TEACHER">Giảng viên</option>
  <option value="STUDENT">Học viên</option>
</select>
```

```typescript
// Component
ngAfterViewInit() {
  // Set selected option manually
  document.querySelectorAll('select[data-role]').forEach((select: any) => {
    const role = select.getAttribute('data-role');
    select.value = role;
  });
}
```

**Ưu điểm:**
- Full control

**Nhược điểm:**
- Phức tạp
- Không reactive
- Anti-pattern trong Angular

## 🎯 Khuyến nghị: Dùng Cách 1 (ngModel)

Đây là cách đơn giản nhất và được Angular support tốt nhất.

## 📝 Implementation Steps:

1. **Đảm bảo FormsModule được import**
2. **Thay đổi template sang dùng ngModel**
3. **Update onRoleChange method**
4. **Test selectbox hiển thị đúng**
5. **Test filter backend**

## 🐛 Debug Backend Filter:

Kiểm tra backend có accept params này không:
```
GET /api/v1/users?page=1&limit=10&role=ADMIN
```

Nếu không, cần update backend hoặc đổi param name.
