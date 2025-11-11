# Hướng Dẫn Code Giao Diện Admin Users

Dưới đây là code giao diện trang admin users tại `http://localhost:4200/admin/users`. Tôi sẽ giải thích chi tiết các phần quan trọng như phân trang, các nút trong danh sách user, và chức năng thêm user thủ công/hàng loạt.

## 1. Tổng Quan Giao Diện

Trang admin users bao gồm:
- **Dashboard thống kê** với số lượng user theo vai trò
- **Bộ lọc và tìm kiếm** theo tên, email, vai trò, trạng thái
- **Bảng danh sách user** với phân trang
- **Các nút thao tác** cho từng user
- **Modal thêm user thủ công**
- **Modal import hàng loạt từ Excel**

## 2. Phân Trang (Pagination)

### 2.1 Code Template Phân Trang

```html
@if (userManagementService.pagination() && userManagementService.pagination()!.totalPages > 1) {
  <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <!-- Thông tin hiển thị kết quả -->
      <div class="text-sm text-gray-700">
        <p>
          Hiển thị
          <span class="font-medium">{{ (userManagementService.pagination()!.number * userManagementService.pagination()!.size) + 1 }}</span>
          đến
          <span class="font-medium">{{ getMinValue((userManagementService.pagination()!.number + 1) * userManagementService.pagination()!.size, userManagementService.pagination()!.totalElements) }}</span>
          trong tổng số
          <span class="font-medium">{{ userManagementService.pagination()!.totalElements }}</span>
          kết quả
        </p>
      </div>

      <!-- Điều hướng trang -->
      <div class="flex items-center space-x-1">
        <!-- Mobile pagination -->
        <div class="flex sm:hidden">
          <button (click)="goToPage(userManagementService.pagination()!.number)"
                  [disabled]="userManagementService.pagination()!.first"
                  class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Trước
          </button>
          <button (click)="goToPage(userManagementService.pagination()!.number + 2)"
                  [disabled]="userManagementService.pagination()!.last"
                  class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Sau
          </button>
        </div>

        <!-- Desktop pagination -->
        <nav class="hidden sm:inline-flex rounded-md shadow-sm" aria-label="Pagination">
          <button (click)="goToPage(userManagementService.pagination()!.number)"
                  [disabled]="userManagementService.pagination()!.first"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="sr-only">Previous</span>
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          @for (page of getVisiblePages(); track page) {
            <button (click)="goToPage(page)"
                    [class]="page === userManagementService.pagination()!.number + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium'"
                    class="relative inline-flex items-center px-4 py-2 border text-sm font-medium">
              {{ page }}
            </button>
          }

          <button (click)="goToPage(userManagementService.pagination()!.number + 2)"
                  [disabled]="userManagementService.pagination()!.last"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="sr-only">Next</span>
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  </div>
}
```

### 2.2 Logic Phân Trang

```typescript
// Pagination methods
async goToPage(page: number): Promise<void> {
  if (page >= 1 && page <= (this.userManagementService.pagination()?.totalPages || 1)) {
    await this.loadUsers(page);
  }
}

getVisiblePages(): number[] {
  const pagination = this.userManagementService.pagination();
  if (!pagination) return [];

  const currentPage = pagination.number + 1; // Convert 0-based to 1-based
  const totalPages = pagination.totalPages;
  const pages: number[] = [];

  // Show max 5 pages around current page
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
}

async loadUsers(page: number = 1): Promise<void> {
  this.currentPage.set(page);
  const search = this.searchQuery() || undefined;
  const response = await this.userManagementService.getUsers(page, 10, search);
  // The service already updates the users and pagination signals internally
}
```

### 2.3 Giải Thích Phân Trang

**Tính năng:**
- Hiển thị 10 user mỗi trang
- Thông tin: "Hiển thị X đến Y trong tổng số Z kết quả"
- Điều hướng Previous/Next cho mobile
- Hiển thị tối đa 5 số trang xung quanh trang hiện tại cho desktop
- Responsive design

**API Call:**
```typescript
getUsers(page: number = 1, limit: number = 10, search?: string)
```

**Response format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 150,
    "totalPages": 15
  }
}
```

## 3. Các Nút Trong Danh Sách User

### 3.1 Code Các Nút Thao Tác

```html
<td class="px-4 py-4 text-right">
  <div class="flex items-center justify-end space-x-1">
    <!-- Nút chỉnh sửa -->
    <button (click)="editUser(user)"
            class="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
            title="Chỉnh sửa">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
      </svg>
    </button>

    <!-- Nút khóa/mở khóa tài khoản -->
    <button (click)="toggleUserStatus(user.id)"
            [class]="user.isActive ? 'p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded' : 'p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded'"
            [title]="user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'">
      @if (user.isActive) {
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"></path>
        </svg>
      } @else {
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
      }
    </button>

    <!-- Nút xóa -->
    <button (click)="deleteUser(user.id)"
            class="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
            title="Xóa">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
    </button>
  </div>
</td>
```

### 3.2 Logic Xử Lý Các Nút

```typescript
async toggleUserStatus(userId: string): Promise<void> {
  await this.userManagementService.toggleUserStatus(userId);
}

async deleteUser(userId: string): Promise<void> {
  if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
    await this.userManagementService.deleteUser(userId);
  }
}

editUser(user: AdminUser): void {
  this.editingUser.set(user);
  this.isEditModalOpen.set(true);
}
```

### 3.3 Giải Thích Các Nút

1. **Chỉnh sửa (Edit)**: Mở modal chỉnh sửa thông tin user
2. **Khóa/Mở khóa**: Toggle trạng thái active/inactive của user
3. **Xóa**: Xóa user với confirmation dialog

## 4. Chức Năng Thêm User Thủ Công

### 4.1 Code Nút và Modal Thêm User

```html
<!-- Nút thêm user thủ công -->
<button (click)="openCreateUserModal()"
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200">
  <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
  </svg>
  Thêm người dùng
</button>

<!-- Modal thêm user thủ công -->
@if (showCreateModal()) {
  <div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeCreateUserModal()">
    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" (click)="$event.stopPropagation()">
      <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div class="sm:flex sm:items-start">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
              Thêm người dùng mới
            </h3>

            <form (ngSubmit)="createUser()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tên người dùng *</label>
                <input type="text"
                       [ngModel]="newUser().name || ''"
                       (ngModelChange)="updateNewUser('name', $event)"
                       name="name"
                       required
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email"
                       [ngModel]="newUser().email || ''"
                       (ngModelChange)="updateNewUser('email', $event)"
                       name="email"
                       required
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                <select [ngModel]="newUser().role || ''"
                        (ngModelChange)="updateNewUser('role', $event)"
                        name="role"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  <option value="">Chọn vai trò</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="teacher">Giảng viên</option>
                  <option value="student">Học viên</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                <input type="text"
                       [ngModel]="newUser().department || ''"
                       (ngModelChange)="updateNewUser('department', $event)"
                       name="department"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <button (click)="createUser()"
                [disabled]="!newUser().name || !newUser().email || !newUser().role"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          Tạo người dùng
        </button>
        <button (click)="closeCreateUserModal()"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
          Hủy
        </button>
      </div>
    </div>
  </div>
}
```

### 4.2 Logic Xử Lý Thêm User Thủ Công

```typescript
openCreateUserModal(): void {
  this.showCreateModal.set(true);
  this.newUser.set({
    name: '',
    email: '',
    role: UserRole.STUDENT,
    department: ''
  });
}

closeCreateUserModal(): void {
  this.showCreateModal.set(false);
}

async createUser(): Promise<void> {
  if (this.newUser().name && this.newUser().email && this.newUser().role) {
    await this.userManagementService.createUser(this.newUser());
    this.closeCreateUserModal();
  }
}

updateNewUser(key: string, value: any): void {
  this.newUser.update(user => ({
    ...user,
    [key]: value
  }));
}
```

### 4.3 API Call Thêm User

```typescript
async createUser(userData: Partial<AdminUser>): Promise<AdminUser> {
  const backendUserData = {
    username: userData.name?.toLowerCase().replace(/\s+/g, '') || '',
    email: userData.email || '',
    password: '123456', // Default password
    fullName: userData.name || '',
    role: userData.role?.toUpperCase() || 'STUDENT'
  };

  const response = await firstValueFrom(
    this.http.post<any>(`${this.API_BASE_URL}${this.ENDPOINTS.users}`, backendUserData)
  );

  return response.data;
}
```

## 5. Chức Năng Import Hàng Loạt

### 5.1 Code Nút và Modal Import

```html
<!-- Nút import hàng loạt -->
<button (click)="openBulkImportModal()"
        class="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200">
  <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
  </svg>
  Import Excel
</button>

<!-- Modal import hàng loạt -->
@if (isBulkImportModalOpen()) {
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                Import người dùng từ Excel
              </h3>

              <!-- Template Info -->
               <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                 <div class="flex">
                   <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                   </svg>
                   <div class="text-sm text-blue-700">
                     <p class="font-medium mb-1">Định dạng file Excel yêu cầu:</p>
                     <ul class="list-disc list-inside space-y-1 text-xs">
                       <li>Cột A: Username (bắt buộc) - Tên đăng nhập</li>
                       <li>Cột B: Email (bắt buộc) - Địa chỉ email</li>
                       <li>Cột C: Full Name (bắt buộc) - Họ tên đầy đủ</li>
                       <li>Cột D: Department (tùy chọn) - Phòng ban/Khoa</li>
                     </ul>
                     <button (click)="downloadTemplate()"
                             class="mt-2 text-blue-600 hover:text-blue-800 underline text-xs">
                       Tải template mẫu
                     </button>
                   </div>
                 </div>
               </div>

               <!-- Role Selection -->
               <div class="mb-4">
                 <label class="block text-sm font-medium text-gray-700 mb-2">
                   Chọn vai trò cho tất cả người dùng được import
                 </label>
                 <select [(ngModel)]="defaultImportRole"
                         name="importRole"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                   <option [ngValue]="UserRole.STUDENT">Học viên</option>
                   <option [ngValue]="UserRole.TEACHER">Giảng viên</option>
                   <option [ngValue]="UserRole.ADMIN">Quản trị viên</option>
                 </select>
               </div>

              <!-- File Upload -->
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Chọn file Excel (.xlsx hoặc .xls)
                  </label>
                  <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                    @if (selectedFile()) {
                      <div class="text-center">
                        <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="mt-4">
                          <p class="text-sm font-medium text-gray-900">{{ selectedFile()?.name }}</p>
                          <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                        </div>
                        <button (click)="removeFile()"
                                class="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                          Chọn file khác
                        </button>
                      </div>
                    } @else {
                      <div class="text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                        <div class="mt-4">
                          <label for="file-upload" class="cursor-pointer">
                            <span class="mt-2 block text-sm font-medium text-gray-900">Kéo thả file vào đây hoặc</span>
                            <span class="mt-1 block text-sm text-blue-600 hover:text-blue-500">chọn file từ máy tính</span>
                          </label>
                          <input id="file-upload" name="file-upload" type="file" class="sr-only" accept=".xlsx,.xls" (change)="onFileSelected($event)">
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Progress Bar -->
                @if (userManagementService.bulkImportProgress().isImporting) {
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600">{{ userManagementService.bulkImportProgress().currentStep }}</span>
                      <span class="text-gray-600">{{ userManagementService.bulkImportProgress().progress }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                           [style.width.%]="userManagementService.bulkImportProgress().progress"></div>
                    </div>
                  </div>
                }

                <!-- Import Results -->
                @if (userManagementService.bulkImportProgress().result) {
                  <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-medium text-gray-900 mb-2">Kết quả import:</h4>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                      <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">{{ userManagementService.bulkImportProgress().result?.totalRows }}</div>
                        <div class="text-gray-600">Tổng dòng</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">{{ userManagementService.bulkImportProgress().result?.successfulImports }}</div>
                        <div class="text-gray-600">Thành công</div>
                      </div>
                      <div class="text-center">
                        <div class="text-2xl font-bold text-red-600">{{ userManagementService.bulkImportProgress().result?.failedImports }}</div>
                        <div class="text-gray-600">Thất bại</div>
                      </div>
                    </div>

                    @if (userManagementService.bulkImportProgress().result!.errors.length > 0) {
                       <div class="mt-4">
                         <h5 class="font-medium text-red-700 mb-2">Lỗi chi tiết:</h5>
                         <div class="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                           <ul class="text-xs text-red-700 space-y-1">
                             @for (error of userManagementService.bulkImportProgress().result!.errors; track $index) {
                               <li>• {{ error }}</li>
                             }
                           </ul>
                         </div>
                       </div>
                     }
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button (click)="startBulkImport()"
                  [disabled]="!selectedFile() || userManagementService.bulkImportProgress().isImporting"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            @if (userManagementService.bulkImportProgress().isImporting) {
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang import...
            } @else {
              Import ngay
            }
          </button>
          <button (click)="closeBulkImportModal()"
                  [disabled]="userManagementService.bulkImportProgress().isImporting"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
            @if (userManagementService.bulkImportProgress().result) {
              Đóng
            } @else {
              Hủy
            }
          </button>
        </div>
      </div>
    </div>
  </div>
}
```

### 5.2 Logic Xử Lý Import Hàng Loạt

```typescript
async startBulkImport(): Promise<void> {
  const file = this.selectedFile();
  if (!file) return;

  try {
    await this.userManagementService.bulkImportUsers(file, this.defaultImportRole());
    await this.loadUsers(this.currentPage());
    setTimeout(() => {
      this.closeBulkImportModal();
    }, 2000);
  } catch (error) {
    console.error('Bulk import failed:', error);
  }
}

async bulkImportUsers(file: File, defaultRole: UserRole = UserRole.STUDENT): Promise<BulkImportResult> {
  this._bulkImportProgress.set({
    isImporting: true,
    progress: 0,
    currentStep: 'Đang chuẩn bị file...'
  });

  try {
    this.validateImportFile(file);

    this._bulkImportProgress.update(p => ({ ...p, progress: 20, currentStep: 'Đang upload file...' }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('defaultRole', defaultRole.toUpperCase());

    this._bulkImportProgress.update(p => ({ ...p, progress: 40, currentStep: 'Đang xử lý dữ liệu...' }));

    const response = await firstValueFrom(this.http.post<any>(
      `${this.API_BASE_URL}${this.ENDPOINTS.bulkImport}`,
      formData,
      { headers: this.getAuthHeaders() }
    ));

    this._bulkImportProgress.update(p => ({ ...p, progress: 80, currentStep: 'Đang hoàn tất...' }));

    if (response?.success && response?.data) {
      const result: BulkImportResult = {
        totalRows: response.data.totalRows,
        successfulImports: response.data.successfulImports,
        failedImports: response.data.failedImports,
        errors: response.data.errors || [],
        importedUsers: response.data.importedUsers?.map((user: any) => ({
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role.toLowerCase() as UserRole,
          avatar: this.getDefaultAvatar(user.email),
          department: '',
          createdAt: new Date(user.createdAt),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(user.createdAt),
          isActive: user.enabled,
          lastLogin: new Date(),
          loginCount: 0,
          permissions: this.getDefaultPermissions(user.role.toLowerCase() as UserRole)
        })) || []
      };

      this._users.update(users => [...users, ...result.importedUsers]);

      this._bulkImportProgress.set({
        isImporting: false,
        progress: 100,
        currentStep: 'Hoàn thành',
        result
      });

      this.errorService.showSuccess(
        `Import hoàn thành! ${result.successfulImports}/${result.totalRows} người dùng đã được thêm thành công.`,
        'bulk-import'
      );

      return result;
    } else {
      throw new Error(response?.message || 'Invalid API response format');
    }
  } catch (error: any) {
    this._bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: 'Lỗi khi import'
    });

    const errorMessage = error?.error?.message || error?.message || 'Import thất bại. Vui lòng thử lại.';
    this.errorService.addError({
      message: errorMessage,
      type: 'error',
      context: 'bulk-import'
    });

    throw error;
  }
}
```

### 5.3 Định Dạng File Excel

**Cấu trúc file Excel yêu cầu:**
- **Cột A**: Username (bắt buộc) - Tên đăng nhập
- **Cột B**: Email (bắt buộc) - Địa chỉ email
- **Cột C**: Full Name (bắt buộc) - Họ tên đầy đủ
- **Cột D**: Department (tùy chọn) - Phòng ban/Khoa

**Ví dụ:**
| Username | Email | Full Name | Department |
|----------|-------|-----------|------------|
| nguyenvana | nguyenvana@student.edu.vn | Nguyễn Văn A | Khoa Hàng hải |
| tranthib | tranthib@student.edu.vn | Trần Thị B | Khoa Hàng hải |

## 6. Tìm Kiếm và Lọc

### 6.1 Code Bộ Lọc

```html
<div class="bg-white rounded-xl shadow-lg p-6 mb-8">
  <div class="flex flex-col md:flex-row gap-4">
    <div class="flex-1">
      <input type="text"
             [(ngModel)]="searchQuery"
             placeholder="Tìm kiếm người dùng..."
             class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
    </div>
    <div class="flex gap-4">
      <select [(ngModel)]="roleFilter"
              class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
        <option value="">Tất cả vai trò</option>
        <option value="admin">Quản trị viên</option>
        <option value="teacher">Giảng viên</option>
        <option value="student">Học viên</option>
      </select>
      <select [(ngModel)]="statusFilter"
              class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
        <option value="">Tất cả trạng thái</option>
        <option value="active">Đang hoạt động</option>
        <option value="inactive">Không hoạt động</option>
      </select>
    </div>
  </div>
</div>
```

### 6.2 Logic Lọc

```typescript
filteredUsers = computed(() => {
  let users = this.userManagementService.users();

  // Filter by search query
  if (this.searchQuery()) {
    const query = this.searchQuery().toLowerCase();
    users = users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.studentId && user.studentId.toLowerCase().includes(query))
    );
  }

  // Filter by role
  if (this.roleFilter()) {
    users = users.filter(user => user.role === this.roleFilter());
  }

  // Filter by status
  if (this.statusFilter()) {
    const isActive = this.statusFilter() === 'active';
    users = users.filter(user => user.isActive === isActive);
  }

  return users;
});
```

## 7. Thống Kê Dashboard

### 7.1 Code Cards Thống Kê

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
  <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-600 mb-1">Tổng người dùng</p>
        <p class="text-3xl font-bold text-gray-900">{{ totalUsers() }}</p>
        <p class="text-sm text-red-600 flex items-center mt-1">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
          </svg>
          +{{ activeUsers() }} đang hoạt động
        </p>
      </div>
      <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
        <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
        </svg>
      </div>
    </div>
  </div>

  <!-- Cards cho Teachers, Students, Admins -->
</div>
```

### 7.2 Computed Properties

```typescript
totalUsers = computed(() => this.userManagementService.totalUsers());
totalTeachers = computed(() => this.userManagementService.totalTeachers());
totalStudents = computed(() => this.userManagementService.totalStudents());
totalAdmins = computed(() => this.userManagementService.totalAdmins());
activeUsers = computed(() => this.userManagementService.activeUsers());
```

## 8. Cấu Hình Backend API

### 8.1 Controller Java Spring Boot

```java
@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search) {

        Page<User> userPage = userService.getUsers(page, limit, search);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", userPage.getContent());
        response.put("pagination", Map.of(
            "page", page,
            "limit", limit,
            "totalItems", userPage.getTotalElements(),
            "totalPages", userPage.getTotalPages()
        ));

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        User user = userService.createUser(request);
        return ResponseEntity.ok(Map.of("success", true, "data", user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody UpdateUserRequest request) {
        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(Map.of("success", true, "data", user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/bulk-import")
    public ResponseEntity<?> bulkImport(@RequestParam("file") MultipartFile file,
                                      @RequestParam("defaultRole") String defaultRole) {
        BulkImportResult result = userService.bulkImportUsers(file, defaultRole);
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }
}
```

### 8.2 DTO Classes

```java
public class CreateUserRequest {
    private String username;
    private String email;
    private String password;
    private String fullName;
    private String role;
    // getters and setters
}

public class UpdateUser