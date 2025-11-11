# 🚨 Hướng Dẫn Sửa Lỗi Kết Nối Admin Frontend & Backend

## 📋 Phân Tích Vấn Đề

Sau khi kiểm tra code, tôi phát hiện **Admin hiện tại vẫn sử dụng mock data và CHƯA kết nối với backend thực**. Dưới đây là hướng dẫn chi tiết để sửa từng bước.

## 🔴 Vấn Đề Chính

### 1. Frontend Admin Service Vẫn Dùng Mock Data

**File:** `src/app/features/admin/infrastructure/services/admin.service.ts`

```typescript
// ❌ Vấn đề: API_BASE_URL sai
private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1/admin';

// ❌ Vấn đề: getUsers() không gọi API thực
async getUsers(): Promise<AdminUser[]> {
  this._isLoading.set(true);
  try {
    // Chỉ gọi mock data, không gọi API thực
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
```

### 2. API Endpoints Không Khớp

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
```

### 3. Data Models Không Khớp

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

## 🔧 Hướng Dẫn Sửa Từng Bước

### Bước 1: Sửa API_BASE_URL

**File:** `src/app/features/admin/infrastructure/services/admin.service.ts`

```typescript
// ❌ CŨ (sai):
private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1/admin';

// ✅ MỚI (đúng):
private readonly API_BASE_URL = '/api/v1/admin';
```

### Bước 2: Sửa UserRole Enum

**File:** `src/app/features/admin/domain/types/admin.types.ts`

```typescript
// ❌ CŨ (sai):
export enum UserRole {
  ADMIN = "admin",
  TEACHER = "teacher",
  STUDENT = "student";
}

// ✅ MỚI (đúng - match backend):
export enum UserRole {
  ADMIN = "ADMIN",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT";
}
```

### Bước 3: Implement HTTP Calls Thực

**File:** `src/app/features/admin/infrastructure/services/admin.service.ts`

```typescript
// ❌ CŨ (mock data):
private async fetchUsersFromAPI(): Promise<AdminUser[]> {
  await this.simulateApiCall();
  return this.getMockUsers();
}

// ✅ MỚI (API thực):
private async fetchUsersFromAPI(): Promise<AdminUser[]> {
  const response = await this.http.get<AdminUser[]>(
    `${this.API_BASE_URL}${this.ENDPOINTS.users}`
  ).toPromise();
  return response || [];
}
```

### Bước 4: Sửa getUsers() Method

```typescript
// ❌ CŨ (mock fallback):
async getUsers(): Promise<AdminUser[]> {
  this._isLoading.set(true);
  try {
    const users = await this.fetchUsersFromAPI();
    this._users.set(users);
    return users;
  } catch (error) {
    console.warn('API unavailable, using mock data:', error);
    this.errorService.showWarning('Đang sử dụng dữ liệu mẫu...', 'api');
    return this._users();
  }
}

// ✅ MỚI (API thực):
async getUsers(): Promise<AdminUser[]> {
  this._isLoading.set(true);
  try {
    const users = await this.fetchUsersFromAPI();
    this._users.set(users);
    return users;
  } catch (error) {
    this.handleError(error, 'Không thể tải danh sách người dùng');
    throw error;
  } finally {
    this._isLoading.set(false);
  }
}
```

### Bước 5: Implement CRUD Operations Thực

```typescript
// ❌ CŨ (local update):
async createUser(userData: Partial<AdminUser>): Promise<AdminUser> {
  const newUser = {
    ...userData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as AdminUser;

  this._users.update(users => [...users, newUser]);
  return newUser;
}

// ✅ MỚI (API call):
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

### Bước 6: Implement updateUser()

```typescript
// ❌ CŨ (local update):
async updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
  this._users.update(users =>
    users.map(user =>
      user.id === id
        ? { ...user, ...updates, updatedAt: new Date().toISOString() }
        : user
    )
  );
  return this._users().find(u => u.id === id)!;
}

// ✅ MỚI (API call):
async updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
  const response = await this.http.put<AdminUser>(
    `${this.API_BASE_URL}${this.ENDPOINTS.users}/${id}`,
    updates
  ).toPromise();

  // Update local state
  this._users.update(users =>
    users.map(user => user.id === id ? response : user)
  );
  return response;
}
```

### Bước 7: Implement deleteUser()

```typescript
// ❌ CŨ (local filter):
async deleteUser(id: string): Promise<void> {
  this._users.update(users => users.filter(user => user.id !== id));
}

// ✅ MỚI (API call):
async deleteUser(id: string): Promise<void> {
  await this.http.delete(
    `${this.API_BASE_URL}${this.ENDPOINTS.users}/${id}`
  ).toPromise();

  // Update local state
  this._users.update(users => users.filter(user => user.id !== id));
}
```

### Bước 8: Implement toggleUserStatus()

```typescript
// ✅ MỚI (API call):
async toggleUserStatus(id: string): Promise<AdminUser> {
  const response = await this.http.patch<AdminUser>(
    `${this.API_BASE_URL}${this.ENDPOINTS.users}/${id}/toggle-status`,
    {}
  ).toPromise();

  // Update local state
  this._users.update(users =>
    users.map(user => user.id === id ? response : user)
  );
  return response;
}
```

### Bước 9: Implement getAnalytics()

```typescript
// ❌ CŨ (mock data):
async getAnalytics(): Promise<AdminAnalytics> {
  await this.simulateApiCall();
  return this.getMockAnalytics();
}

// ✅ MỚI (API call):
async getAnalytics(): Promise<AdminAnalytics> {
  const response = await this.http.get<AdminAnalytics>(
    `${this.API_BASE_URL}${this.ENDPOINTS.analytics}`
  ).toPromise();
  return response;
}
```

### Bước 10: Implement Course Management APIs

```typescript
// ✅ MỚI (API calls):
async getPendingCourses(): Promise<AdminCourse[]> {
  const response = await this.http.get<AdminCourse[]>(
    `${this.API_BASE_URL}${this.ENDPOINTS.courses}/pending`
  ).toPromise();
  return response || [];
}

async getAllCourses(): Promise<AdminCourse[]> {
  const response = await this.http.get<AdminCourse[]>(
    `${this.API_BASE_URL}${this.ENDPOINTS.courses}/all`
  ).toPromise();
  return response || [];
}

async approveCourse(courseId: string): Promise<void> {
  await this.http.patch(
    `${this.API_BASE_URL}${this.ENDPOINTS.courses}/${courseId}/approve`,
    {}
  ).toPromise();
}

async rejectCourse(courseId: string, reason: string): Promise<void> {
  await this.http.patch(
    `${this.API_BASE_URL}${this.ENDPOINTS.courses}/${courseId}/reject`,
    { reason }
  ).toPromise();
}
```

### Bước 11: Sửa Error Handling

**File:** `src/app/features/admin/infrastructure/services/admin.service.ts`

```typescript
// ✅ Thêm error handling method:
private handleError(error: any, message: string): void {
  console.error('Admin API Error:', error);
  this.errorService.showError(message, 'admin');
}

// ✅ Sửa tất cả catch blocks:
} catch (error) {
  this.handleError(error, 'Không thể tải dữ liệu');
  throw error;
}
```

### Bước 12: Update Components

**File:** `src/app/features/admin/presentation/components/admin-analytics.component.ts`

```typescript
// ❌ CŨ (mock data):
ngOnInit() {
  this.analytics.set(this.adminService.analytics());
}

// ✅ MỚI (API call):
async ngOnInit() {
  try {
    const data = await this.adminService.getAnalytics();
    this.analytics.set(data);
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}
```

**File:** `src/app/features/admin/presentation/components/user-management.component.ts`

```typescript
// ❌ CŨ (local state):
async loadUsers() {
  this.users.set(await this.adminService.getUsers());
}

// ✅ MỚI (API call):
async loadUsers() {
  try {
    this.users.set(await this.adminService.getUsers());
  } catch (error) {
    console.error('Failed to load users:', error);
    // Don't fallback to mock data
  }
}
```

### Bước 13: Update Course Management Component

**File:** `src/app/features/admin/presentation/components/course-management.component.ts`

```typescript
// ✅ MỚI (API calls):
async loadPendingCourses() {
  try {
    const courses = await this.adminService.getPendingCourses();
    this.pendingCourses.set(courses);
  } catch (error) {
    console.error('Failed to load pending courses:', error);
  }
}

async approveCourse(courseId: string) {
  try {
    await this.adminService.approveCourse(courseId);
    await this.loadPendingCourses(); // Reload list
  } catch (error) {
    console.error('Failed to approve course:', error);
  }
}

async rejectCourse(courseId: string, reason: string) {
  try {
    await this.adminService.rejectCourse(courseId, reason);
    await this.loadPendingCourses(); // Reload list
  } catch (error) {
    console.error('Failed to reject course:', error);
  }
}
```

### Bước 14: Add HTTP Client Injection

**File:** `src/app/features/admin/infrastructure/services/admin.service.ts`

```typescript
// ✅ Thêm HttpClient injection:
constructor(
  private http: HttpClient,
  private errorService: ErrorService
) {}
```

### Bước 15: Update ENDPOINTS Configuration

```typescript
// ✅ Đảm bảo endpoints đúng:
private readonly ENDPOINTS = {
  users: '/users',
  courses: '/courses',
  analytics: '/analytics',
  settings: '/settings'
};
```

## 🧪 Testing Steps

### 1. Start Backend
```bash
cd backend-lms-postgres
docker compose up -d
mvn spring-boot:run
```

### 2. Start Frontend
```bash
cd lms-angular
ng serve --port 4201
```

### 3. Test API Connection
```bash
# Test login
curl -X POST http://localhost:8090/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test admin analytics
curl -X GET http://localhost:8090/api/v1/admin/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Frontend
1. Login as admin
2. Check browser network tab - should see real API calls
3. Verify data comes from backend, not mock
4. Test CRUD operations

## 🔍 Debug Tips

### Check Network Tab
- Open browser DevTools → Network tab
- Look for API calls to `/api/v1/admin/*`
- Verify status codes (200, 201, etc.)
- Check response data structure

### Check Console Logs
- Look for "Admin API Error:" messages
- Verify API_BASE_URL is correct
- Check JWT token in requests

### Common Issues
1. **401 Unauthorized** → Check JWT token
2. **404 Not Found** → Check API endpoints
3. **500 Server Error** → Check backend logs
4. **CORS Error** → Check backend CORS config

## 📋 Checklist Hoàn Thành

- [ ] ✅ Sửa API_BASE_URL thành `/api/v1/admin`
- [ ] ✅ Sửa UserRole enum match backend
- [ ] ✅ Implement HTTP calls cho getUsers()
- [ ] ✅ Implement HTTP calls cho getAnalytics()
- [ ] ✅ Implement CRUD operations (create, update, delete)
- [ ] ✅ Implement course management APIs
- [ ] ✅ Sửa error handling (không dùng mock fallback)
- [ ] ✅ Update components để dùng API calls
- [ ] ✅ Test tất cả functionality
- [ ] ✅ Verify data comes from backend

## 🎯 Kết Quả Mong Đợi

Sau khi sửa xong:
- ✅ Admin dashboard hiển thị dữ liệu thực từ database
- ✅ User management: tạo, sửa, xóa user thực sự
- ✅ Course approval: duyệt/từ chối khóa học thực sự
- ✅ Analytics: thống kê chính xác từ database
- ✅ Không còn mock data fallback
- ✅ Error handling đúng cách

---

*Tài liệu này cung cấp hướng dẫn chi tiết để sửa từng bước. Hãy follow theo thứ tự và test kỹ sau mỗi bước để đảm bảo hoạt động đúng.*