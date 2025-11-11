# 🚨 Vấn đề kết nối Admin Frontend & Backend

## 📋 Phân tích vấn đề

Sau khi kiểm tra code, tôi phát hiện **Admin hiện tại vẫn sử dụng mock data và CHƯA kết nối với backend thực**. Dưới đây là các vấn đề cụ thể:

## 🔴 Vấn đề chính

### 1. Frontend Admin Service vẫn dùng Mock Data

**File: `fe/src/app/features/admin/infrastructure/services/admin.service.ts`**

```typescript
// Vấn đề: API_BASE_URL sai
private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1/admin';

// Vấn đề: getUsers() không gọi API thực
async getUsers(): Promise<AdminUser[]> {
  this._isLoading.set(true);
  try {
    // ❌ Chỉ gọi mock data, không gọi API thực
    const users = await this.fetchUsersFromAPI(); // Đây là mock
    this._users.set(users);
    return users;
  } catch (error) {
    // ❌ Fallback về mock data thay vì báo lỗi
    console.warn('API unavailable, using mock data:', error);
    this.errorService.showWarning('Đang sử dụng dữ liệu mẫu...', 'api');
    return this._users(); // Trả về mock data
  }
}

// Vấn đề: fetchUsersFromAPI() chỉ simulate
private async fetchUsersFromAPI(): Promise<AdminUser[]> {
  // ❌ Chỉ simulate API call, không gọi HTTP thực
  await this.simulateApiCall();
  return this.getMockUsers(); // Luôn trả về mock data
}
```

### 2. API Endpoints không khớp

**Backend endpoints thực (AdminController.java):**
```java
@RestController
@RequestMapping("/api/v1/admin")  // ✅ Đúng path
public class AdminController {
    @GetMapping("/courses/pending")  // ✅ Endpoint thực
    @GetMapping("/analytics")        // ✅ Endpoint thực
    @GetMapping("/users")           // ✅ Endpoint thực
}
```

**Frontend gọi sai:**
```typescript
private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1/admin'; // ❌ Sai domain
private readonly ENDPOINTS = {
  users: '/users',           // ✅ Đúng
  courses: '/courses',       // ✅ Đúng
  analytics: '/analytics',   // ✅ Đúng
};
```

### 3. Data Models không khớp

**Backend User entity:**
```java
public enum Role {
    ADMIN("Quản trị viên"),
    TEACHER("Giảng viên"),
    STUDENT("Học viên");
}
```

**Frontend AdminUser interface:**
```typescript
export enum UserRole {
  ADMIN = "admin",    // ❌ Sai: backend dùng "ADMIN"
  TEACHER = "teacher", // ❌ Sai: backend dùng "TEACHER"
  STUDENT = "student"; // ❌ Sai: backend dùng "STUDENT"
}
```

### 4. HTTP Methods không đúng

**Backend AdminController:**
```java
@GetMapping("/users")  // ✅ GET để lấy danh sách
@PostMapping("/users") // ✅ POST để tạo user
@PutMapping("/users/{id}") // ✅ PUT để update
@DeleteMapping("/users/{id}") // ✅ DELETE để xóa
```

**Frontend AdminService:**
```typescript
// ❌ Không có HTTP calls thực, chỉ update local state
async createUser(userData: Partial<AdminUser>): Promise<AdminUser> {
  // Chỉ update local array, không gọi API
  this._users.update(users => [...users, newUser]);
}
```

## 🔧 Các vấn đề cần sửa

### 1. Sửa API_BASE_URL
```typescript
// Trong admin.service.ts
private readonly API_BASE_URL = '/api/v1/admin'; // ✅ Đúng: relative path
// Thay vì: 'https://api.lms-maritime.com/v1/admin'
```

### 2. Implement HTTP calls thực
```typescript
// Thay thế fetchUsersFromAPI()
private async fetchUsersFromAPI(): Promise<AdminUser[]> {
  const response = await this.http.get<AdminUser[]>(
    `${this.API_BASE_URL}${this.ENDPOINTS.users}`
  ).toPromise();
  return response || [];
}
```

### 3. Sửa UserRole enum
```typescript
export enum UserRole {
  ADMIN = "ADMIN",      // ✅ Phải match backend
  TEACHER = "TEACHER",  // ✅ Phải match backend
  STUDENT = "STUDENT";  // ✅ Phải match backend
}
```

### 4. Implement CRUD operations thực
```typescript
async createUser(userData: Partial<AdminUser>): Promise<AdminUser> {
  const response = await this.http.post<AdminUser>(
    `${this.API_BASE_URL}${this.ENDPOINTS.users}`,
    userData
  ).toPromise();

  // Update local state after successful API call
  this._users.update(users => [...users, response]);
  return response;
}
```

### 5. Xử lý lỗi đúng cách
```typescript
async getUsers(): Promise<AdminUser[]> {
  this._isLoading.set(true);
  try {
    const users = await this.fetchUsersFromAPI();
    this._users.set(users);
    return users;
  } catch (error) {
    // ❌ Đừng dùng mock data làm fallback
    // ✅ Báo lỗi và để user biết
    this.handleError(error, 'Không thể tải danh sách người dùng');
    throw error;
  } finally {
    this._isLoading.set(false);
  }
}
```

## 🛠️ Code cần sửa

### File `admin.service.ts` - Các methods cần sửa:

1. **`getUsers()`** - Gọi API `/api/v1/admin/users` thay vì mock
2. **`createUser()`** - POST đến `/api/v1/admin/users` thay vì local update
3. **`updateUser()`** - PUT đến `/api/v1/admin/users/{id}` thay vì local update
4. **`deleteUser()`** - DELETE đến `/api/v1/admin/users/{id}` thay vì local filter
5. **`toggleUserStatus()`** - PATCH đến `/api/v1/admin/users/{id}/toggle-status`
6. **`getCourses()`** - Gọi API `/api/v1/admin/courses/all` thay vì mock
7. **`approveCourse()`** - PATCH đến `/api/v1/admin/courses/{id}/approve`
8. **`rejectCourse()`** - PATCH đến `/api/v1/admin/courses/{id}/reject`
9. **`getAnalytics()`** - Gọi API `/api/v1/admin/analytics` thay vì mock
10. **`getSettings()`** - Gọi API `/api/v1/admin/settings` thay vì mock

### File `admin-analytics.component.ts`:
- Đang dùng `adminService.analytics()` (mock data)
- Cần gọi `adminService.getAnalytics()` (API thực)

### File `user-management.component.ts`:
- Đang dùng local state updates
- Cần gọi API methods thực

### File `course-management.component.ts`:
- Tương tự, cần gọi API methods thực

## ✅ Kết luận

**Vấn đề chính:** Admin frontend hiện tại hoạt động độc lập với mock data, không kết nối với backend database thực.

**Giải pháp:** Cần thay thế tất cả mock data calls bằng HTTP calls thực đến backend APIs đã được implement trong AdminController.java.

**Ưu tiên sửa:**
1. Sửa API_BASE_URL thành relative path
2. Implement HTTP calls cho getUsers() và getAnalytics()
3. Sửa UserRole enum để match backend
4. Implement CRUD operations thực
5. Xử lý lỗi đúng cách (không dùng mock fallback)