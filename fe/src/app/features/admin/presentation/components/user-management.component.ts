import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, CreateUserRequest, UpdateUserRequest } from '../../infrastructure/services/admin.service';
import { UserRole } from '../../../../core/services/auth.service';
import * as XLSX from 'xlsx';

interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
}

interface BulkImportProgress {
  isImporting: boolean;
  progress: number;
  currentStep: string;
  result?: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: string[];
  };
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  styles: [`
    /* Coursera-inspired clean styles */
    select.role-select {
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-block;
      box-sizing: border-box;
      min-width: 130px;
      max-width: 200px;
      width: auto;
      line-height: 1.5;
      appearance: auto;
      -webkit-appearance: auto;
      -moz-appearance: auto;
      text-align: left;
      padding-right: 0.75rem;
    }

    select.role-select:hover {
      border-color: #9CA3AF;
    }

    select.role-select:focus {
      outline: none;
    }

    select.role-select option {
      padding: 8px 12px;
      background: white;
      color: #1f2937;
    }

    /* Table cell overflow */
    td { overflow: visible; }
  `],
  templateUrl: './user-management.component.html'
})

export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  // Role options - Single source of truth
  readonly ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Quáº£n trá»‹ viĂªn' },
    { value: 'TEACHER', label: 'Giáº£ng viĂªn' },
    { value: 'STUDENT', label: 'Há»c viĂªn' }
  ] as const;

  // Make UserRole available in template
  UserRole = UserRole;

  // Filter states
  searchQuery = signal('');
  roleFilter = signal('');
  statusFilter = signal('');

  // Modal states
  showCreateModal = signal(false);
  isEditModalOpen = signal(false);
  isBulkImportModalOpen = signal(false);

  // Create user form
  newUserName = signal('');
  newUserEmail = signal('');
  newUserRole = signal('');

  // Edit user form
  editingUserId = signal('');
  editingUserName = signal('');
  editingUserEmail = signal('');
  editingUserRole = signal('');

  // Bulk import
  selectedFile = signal<File | null>(null);
  defaultImportRole = signal('STUDENT');
  bulkImportProgress = signal<BulkImportProgress>({
    isImporting: false,
    progress: 0,
    currentStep: '',
    result: undefined
  });

  // Pagination
  currentPage = signal(1);
  pagination = signal<PaginationInfo | null>(null);

  // Local users signal - synced with AdminService
  private _localUsers = signal<AdminUser[]>([]);

  // Computed properties
  isLoadingUsers = signal(false);
  isDeletingUser = signal(false);

  // Stats computed from local users (roles are UPPERCASE after normalization)
  totalUsers = computed(() => this._localUsers().length);
  totalTeachers = computed(() => this._localUsers().filter(u => u.role === 'TEACHER').length);
  totalStudents = computed(() => this._localUsers().filter(u => u.role === 'STUDENT').length);
  totalAdmins = computed(() => this._localUsers().filter(u => u.role === 'ADMIN').length);
  activeUsers = computed(() => this._localUsers().filter(u => u.accountStatus === 'ACTIVE').length);

  // Client-side filtering (because backend doesn't support it)
  filteredUsers = computed(() => {
    let users = this._localUsers();
    console.log('[CLIENT FILTER] Starting with users:', users.length);

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
      console.log('[CLIENT FILTER] After search:', users.length);
    }

    // Filter by role
    if (this.roleFilter()) {
      const roleToFilter = this.roleFilter();
      users = users.filter(user => user.role === roleToFilter);
      console.log('[CLIENT FILTER] After role filter (' + roleToFilter + '):', users.length);
    }

    // Filter by status
    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'active';
      users = users.filter(user => user.isActive === isActive);
      console.log('[CLIENT FILTER] After status filter:', users.length);
    }

    console.log('[CLIENT FILTER] Final filtered users:', users.length);
    return users;
  });

  ngOnInit(): void {
    this.loadUsers(1);
  }

  // Load users with pagination
  loadUsers(page: number = 1, limit: number = 10): void {
    this.currentPage.set(page);
    this.isLoadingUsers.set(true);

    const params: any = {
      page: page,
      limit: limit
    };

    // Add search filter
    if (this.searchQuery()) {
      params.search = this.searchQuery();
    }

    // Add role filter
    if (this.roleFilter()) {
      params.role = this.roleFilter();
      console.log('[FILTER] Role filter active:', this.roleFilter());
    }

    // Add status filter
    if (this.statusFilter()) {
      params.status = this.statusFilter();
      console.log('[FILTER] Status filter active:', this.statusFilter());
    }

    console.log('[LOAD USERS] Final params being sent to backend:', params);
    console.log('[FILTER] Current filter state:', {
      search: this.searchQuery(),
      role: this.roleFilter(),
      status: this.statusFilter()
    });

    this.adminService.getUsers(params).subscribe({
      next: (response) => {
        console.log('âœ… Users loaded successfully:', response);
        console.log('đŸ“ First user role:', response.data?.[0]?.role, 'Type:', typeof response.data?.[0]?.role);

        // Normalize roles to uppercase
        const normalizedUsers = (response.data || []).map((user: any) => ({
          ...user,
          role: user.role?.toUpperCase() || user.role
        }));

        console.log('đŸ“ After normalize:', normalizedUsers[0]?.role);

        // Update local users signal
        this._localUsers.set(normalizedUsers);

        // Update pagination info
        if (response.pagination) {
          this.pagination.set({
            page: response.pagination.page || page,
            limit: response.pagination.limit || limit,
            totalItems: response.pagination.totalItems || 0,
            totalPages: response.pagination.totalPages || 1,
            first: page === 1,
            last: page === (response.pagination.totalPages || 1)
          });
        }

        this.isLoadingUsers.set(false);
      },
      error: (error) => {
        console.error('âŒ Error loading users:', error);
        this.isLoadingUsers.set(false);
        alert('KhĂ´ng thá»ƒ táº£i danh sĂ¡ch ngÆ°á»i dĂ¹ng. Vui lĂ²ng thá»­ láº¡i.');
      }
    });
  }

  // Search and filter handlers
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    // Reset to page 1 when searching
    this.loadUsers(1);
  }

  onRoleFilterChange(value: string): void {
    console.log('[FILTER CHANGE] Role filter changed to:', value);
    this.roleFilter.set(value);
    console.log('[FILTER CHANGE] Role filter signal now:', this.roleFilter());
    // Reset to page 1 when filtering
    this.loadUsers(1);
  }

  onStatusFilterChange(value: string): void {
    console.log('[FILTER CHANGE] Status filter changed to:', value);
    this.statusFilter.set(value);
    console.log('[FILTER CHANGE] Status filter signal now:', this.statusFilter());
    // Reset to page 1 when filtering
    this.loadUsers(1);
  }

  onSearchChange(): void {
    // Reset to page 1 when searching
    this.loadUsers(1);
  }

  onFilterChange(): void {
    // Reset to page 1 when filtering
    this.loadUsers(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
    this.loadUsers(1);
  }

  // Pagination methods
  goToPage(page: number): void {
    const paginationInfo = this.pagination();
    if (page >= 1 && page <= (paginationInfo?.totalPages || 1)) {
      this.loadUsers(page);
    }
  }

  getVisiblePages(): number[] {
    const paginationInfo = this.pagination();
    if (!paginationInfo) return [];

    const currentPage = paginationInfo.page;
    const totalPages = paginationInfo.totalPages;
    const pages: number[] = [];

    // Show max 5 pages around current page
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Create User Modal
  openCreateUserModal(): void {
    this.showCreateModal.set(true);
    this.newUserName.set('');
    this.newUserEmail.set('');
    this.newUserRole.set('');
  }

  closeCreateUserModal(): void {
    this.showCreateModal.set(false);
  }

  createUser(): void {
    if (!this.newUserName() || !this.newUserEmail() || !this.newUserRole()) {
      return;
    }

    const request: CreateUserRequest = {
      username: this.newUserEmail().split('@')[0],
      email: this.newUserEmail(),
      password: 'Password123!', // Default password
      fullName: this.newUserName(),
      role: this.newUserRole() as 'ADMIN' | 'TEACHER' | 'STUDENT'
    };

    this.adminService.createUser(request).subscribe({
      next: (response) => {
        console.log('User created successfully:', response);
        this.closeCreateUserModal();
        this.loadUsers(this.currentPage());
        alert('NgÆ°á»i dĂ¹ng Ä‘Ă£ Ä‘Æ°á»£c táº¡o thĂ nh cĂ´ng!');
      },
      error: (error) => {
        console.error('Error creating user:', error);
        alert('KhĂ´ng thá»ƒ táº¡o ngÆ°á»i dĂ¹ng. Vui lĂ²ng thá»­ láº¡i.');
      }
    });
  }

  // Edit User Modal
  editUser(user: AdminUser): void {
    this.editingUserId.set(user.id);
    this.editingUserName.set(user.name);
    this.editingUserEmail.set(user.email);
    this.editingUserRole.set(user.role);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  saveUserEdit(): void {
    const userId = this.editingUserId();
    if (!userId) return;

    const request: UpdateUserRequest = {
      email: this.editingUserEmail(),
      fullName: this.editingUserName(),
      role: this.editingUserRole() as 'ADMIN' | 'TEACHER' | 'STUDENT'
    };

    this.adminService.updateUser(userId, request).subscribe({
      next: (response) => {
        console.log('User updated successfully:', response);
        this.closeEditModal();
        this.loadUsers(this.currentPage());
        alert('NgÆ°á»i dĂ¹ng Ä‘Ă£ Ä‘Æ°á»£c cáº­p nháº­t thĂ nh cĂ´ng!');
      },
      error: (error) => {
        console.error('Error updating user:', error);
        alert('KhĂ´ng thá»ƒ cáº­p nháº­t ngÆ°á»i dĂ¹ng. Vui lĂ²ng thá»­ láº¡i.');
      }
    });
  }

  // User Actions
  toggleUserStatus(userId: string): void {
    this.adminService.toggleUserStatus(userId).subscribe({
      next: (response) => {
        console.log('User status toggled:', response);
        this.loadUsers(this.currentPage());
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        alert('KhĂ´ng thá»ƒ thay Ä‘á»•i tráº¡ng thĂ¡i ngÆ°á»i dĂ¹ng. Vui lĂ²ng thá»­ láº¡i.');
      }
    });
  }

  deleteUser(userId: string): void {
    if (!confirm('Báº¡n cĂ³ cháº¯c cháº¯n muá»‘n vĂ´ hiá»‡u hĂ³a ngÆ°á»i dĂ¹ng nĂ y?')) {
      return;
    }

    this.isDeletingUser.set(true);

    this.adminService.deleteUser(userId).subscribe({
      next: (response) => {
        const currentPageInfo = this.pagination();
        const currentFilteredCount = this.filteredUsers().length;

        let targetPage = this.currentPage();
        if (currentFilteredCount === 1 && currentPageInfo && currentPageInfo.page > 1) {
          targetPage = currentPageInfo.page - 1;
        }

        this.loadUsers(targetPage);
        this.isDeletingUser.set(false);
        alert('NgÆ°á»i dĂ¹ng Ä‘Ă£ Ä‘Æ°á»£c vĂ´ hiá»‡u hĂ³a');
      },
      error: (error) => {
        console.error('Error disabling user:', error);
        this.isDeletingUser.set(false);
        alert('KhĂ´ng thá»ƒ vĂ´ hiá»‡u hĂ³a ngÆ°á»i dĂ¹ng. Vui lĂ²ng thá»­ láº¡i.');
      }
    });
  }

  onRoleChange(userId: string, oldRole: string, newRole: string): void {
    console.log('[ROLE CHANGE]', { userId, oldRole, newRole, oldType: typeof oldRole, newType: typeof newRole });

    // If role didn't actually change, do nothing
    if (oldRole === newRole) {
      console.log('[ROLE CHANGE] No change detected');
      return;
    }

    if (!confirm(`Báº¡n cĂ³ cháº¯c cháº¯n muá»‘n thay Ä‘á»•i vai trĂ² ngÆ°á»i dĂ¹ng thĂ nh ${this.getRoleText(newRole)}?`)) {
      // Revert UI without reload - update local state only
      const users = this._localUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx > -1) {
        users[idx] = { ...users[idx], role: oldRole };
        this._localUsers.set([...users]);
      }
      return;
    }

    // Call API to update user role
    this.adminService.updateUser(userId, { role: newRole as 'ADMIN' | 'TEACHER' | 'STUDENT' }).subscribe({
      next: (response) => {
        console.log('User role updated:', response);
        alert(`Vai trĂ² Ä‘Ă£ Ä‘Æ°á»£c thay Ä‘á»•i thĂ nh ${this.getRoleText(newRole)} thĂ nh cĂ´ng!`);

        // Update local state for smooth UI
        const users = this._localUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx > -1) {
          users[idx] = { ...users[idx], role: newRole };
          this._localUsers.set([...users]);
        }

        // Optional: reload to sync with backend
        // this.loadUsers(this.currentPage());
      },
      error: (error) => {
        console.error('Error updating user role:', error);
        alert('KhĂ´ng thá»ƒ thay Ä‘á»•i vai trĂ². Vui lĂ²ng thá»­ láº¡i.');

        // Revert to old role on error
        const users = this._localUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx > -1) {
          users[idx] = { ...users[idx], role: oldRole };
          this._localUsers.set([...users]);
        }
      }
    });
  }

  // Bulk Import Modal
  openBulkImportModal(): void {
    this.isBulkImportModalOpen.set(true);
    this.selectedFile.set(null);
    this.defaultImportRole.set('STUDENT');
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: '',
      result: undefined
    });
  }

  closeBulkImportModal(): void {
    this.isBulkImportModalOpen.set(false);
    this.selectedFile.set(null);
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: '',
      result: undefined
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
  }

  startBulkImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.bulkImportProgress.set({
      isImporting: true,
      progress: 10,
      currentStep: 'Äang Ä‘á»c file Excel...',
      result: undefined
    });

    // Read Excel file
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

        console.log('Excel data parsed:', jsonData);

        if (jsonData.length === 0) {
          this.bulkImportProgress.set({
            isImporting: false,
            progress: 0,
            currentStep: 'Lá»—i',
            result: {
              totalRows: 0,
              successfulImports: 0,
              failedImports: 0,
              errors: ['File Excel khĂ´ng cĂ³ dá»¯ liá»‡u']
            }
          });
          return;
        }

        // Process users one by one
        this.processUsersSequentially(jsonData);

      } catch (error: any) {
        console.error('Error reading Excel:', error);
        this.bulkImportProgress.set({
          isImporting: false,
          progress: 0,
          currentStep: 'Lá»—i Ä‘á»c file',
          result: {
            totalRows: 0,
            successfulImports: 0,
            failedImports: 0,
            errors: ['KhĂ´ng thá»ƒ Ä‘á»c file Excel. Vui lĂ²ng kiá»ƒm tra Ä‘á»‹nh dáº¡ng file.']
          }
        });
      }
    };

    reader.onerror = () => {
      this.bulkImportProgress.set({
        isImporting: false,
        progress: 0,
        currentStep: 'Lá»—i Ä‘á»c file',
        result: {
          totalRows: 0,
          successfulImports: 0,
          failedImports: 0,
          errors: ['KhĂ´ng thá»ƒ Ä‘á»c file']
        }
      });
    };

    reader.readAsArrayBuffer(file);
  }

  private async processUsersSequentially(users: any[]): Promise<void> {
    const totalUsers = users.length;
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const progress = Math.round(((i + 1) / totalUsers) * 100);

      this.bulkImportProgress.update(state => ({
        ...state,
        progress,
        currentStep: `Äang táº¡o ngÆ°á»i dĂ¹ng ${i + 1}/${totalUsers}...`
      }));

      try {
        // Map Excel columns to user data
        const createRequest: CreateUserRequest = {
          username: userData['Username'] || userData['TĂªn Ä‘Äƒng nháº­p'] || userData['Email']?.split('@')[0] || `user${Date.now()}`,
          email: userData['Email'] || userData['email'] || '',
          password: userData['Password'] || userData['Máº­t kháº©u'] || 'Password123!',
          fullName: userData['Full Name'] || userData['Há» tĂªn'] || userData['Name'] || '',
          role: (userData['Role'] || userData['Vai trĂ²'] || this.defaultImportRole()).toUpperCase() as 'ADMIN' | 'TEACHER' | 'STUDENT'
        };

        // Validate required fields
        if (!createRequest.email || !createRequest.fullName) {
          failCount++;
          errors.push(`DĂ²ng ${i + 1}: Thiáº¿u email hoáº·c há» tĂªn`);
          continue;
        }

        // Create user via API
        await new Promise<void>((resolve, reject) => {
          this.adminService.createUser(createRequest).subscribe({
            next: () => {
              successCount++;
              resolve();
            },
            error: (error) => {
              failCount++;
              const friendlyError = this.formatBulkImportError(error, createRequest.email);
              errors.push(`DĂ²ng ${i + 1}: ${friendlyError}`);
              resolve(); // Continue even if one fails
            }
          });
        });

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        failCount++;
        errors.push(`DĂ²ng ${i + 1}: ${error.message || 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh'}`);
      }
    }

    // Final result
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 100,
      currentStep: 'HoĂ n thĂ nh',
      result: {
        totalRows: totalUsers,
        successfulImports: successCount,
        failedImports: failCount,
        errors: errors.slice(0, 10) // Show max 10 errors
      }
    });

    // Reload users list
    this.loadUsers(this.currentPage());

    // Auto close after 3 seconds if all successful
    if (failCount === 0) {
      setTimeout(() => {
        this.closeBulkImportModal();
      }, 3000);
    }
  }

  // Keep old method for reference but not used
  private startBulkImportViaAPI(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.bulkImportProgress.set({
      isImporting: true,
      progress: 20,
      currentStep: 'Äang upload file...',
      result: undefined
    });

    this.adminService.bulkImportUsers(file, this.defaultImportRole() as 'ADMIN' | 'TEACHER' | 'STUDENT').subscribe({
      next: (response: any) => {
        console.log('Bulk import completed:', response);

        this.bulkImportProgress.set({
          isImporting: false,
          progress: 100,
          currentStep: 'HoĂ n thĂ nh',
          result: {
            totalRows: response.data?.totalRows || 0,
            successfulImports: response.data?.successfulImports || 0,
            failedImports: response.data?.failedImports || 0,
            errors: response.data?.errors || []
          }
        });

        this.loadUsers(this.currentPage());

        // Auto close after 3 seconds if successful
        if (response.data?.failedImports === 0) {
          setTimeout(() => {
            this.closeBulkImportModal();
          }, 3000);
        }
      },
      error: (error) => {
        console.error('Bulk import failed:', error);
        this.bulkImportProgress.set({
          isImporting: false,
          progress: 0,
          currentStep: 'Lá»—i khi import',
          result: {
            totalRows: 0,
            successfulImports: 0,
            failedImports: 0,
            errors: [error.message || 'Import tháº¥t báº¡i. Vui lĂ²ng thá»­ láº¡i.']
          }
        });
      }
    });
  }

  downloadTemplate(): void {
    try {
      // Create sample data for template
      const templateData = [
        {
          'Username': 'nguyenvana',
          'Email': 'nguyenvana@student.edu.vn',
          'Full Name': 'Nguyá»…n VÄƒn A',
          'Department': 'Khoa HĂ ng háº£i'
        },
        {
          'Username': 'tranthib',
          'Email': 'tranthib@student.edu.vn',
          'Full Name': 'Tráº§n Thá»‹ B',
          'Department': 'Khoa HĂ ng háº£i'
        }
      ];

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `user_import_template_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      console.log('Template downloaded successfully');
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('KhĂ´ng thá»ƒ táº£i template. Vui lĂ²ng thá»­ láº¡i.');
    }
  }

  // Helper Methods
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getRoleClass(role: string): string {
    // Coursera-inspired subtle colors
    switch (role) {
      case 'ADMIN':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'TEACHER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'STUDENT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  // ============================================
  // STATUS BADGE HELPERS - BLOCKED/RESTRICTED/ACTIVE
  // ============================================

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'BLOCKED':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'RESTRICTED':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'BLOCKED':
        return 'bg-red-500';
      case 'RESTRICTED':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Hoáº¡t Ä‘á»™ng';
      case 'BLOCKED':
        return 'ÄĂ£ khĂ³a';
      case 'RESTRICTED':
        return 'Háº¡n cháº¿';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  onStatusActionChange(user: AdminUser, newStatus: string): void {
    if (!newStatus) return;

    const statusLabels: { [key: string]: string } = {
      'ACTIVE': 'KĂ­ch hoáº¡t',
      'BLOCKED': 'KhĂ³a',
      'RESTRICTED': 'Háº¡n cháº¿'
    };

    const statusLabel = statusLabels[newStatus] || newStatus;
    const reasonPrompt = newStatus !== 'ACTIVE'
      ? `\n\nVui lĂ²ng nháº­p lĂ½ do ${statusLabel.toLowerCase()}:`
      : '';

    // Simple confirmation with prompt for reason
    const confirmed = window.confirm(
      `Báº¡n cĂ³ cháº¯c muá»‘n ${statusLabel.toLowerCase()} tĂ i khoáº£n cá»§a "${user.name}"?${reasonPrompt}`
    );

    if (!confirmed) return;

    // Get reason if blocking/restricting
    let reason = '';
    if (newStatus !== 'ACTIVE') {
      reason = window.prompt(`Nháº­p lĂ½ do ${statusLabel.toLowerCase()} tĂ i khoáº£n:`) || '';
      if (!reason) {
        alert('Vui lĂ²ng nháº­p lĂ½ do!');
        return;
      }
    }

    // Call service (will fail if backend not ready, but UI is prepared)
    console.log(`[UserManagement] Updating user ${user.id} status to ${newStatus}, reason: ${reason}`);

    // TODO: Uncomment when backend is ready
    // this.adminService.updateUserStatus(user.id, { status: newStatus as any, reason }).subscribe({
    //   next: (response) => {
    //     alert(`ÄĂ£ ${statusLabel.toLowerCase()} tĂ i khoáº£n thĂ nh cĂ´ng!`);
    //     this.loadUsers();
    //   },
    //   error: (error) => {
    //     alert(`Lá»—i: ${error.message || 'KhĂ´ng thá»ƒ cáº­p nháº­t tráº¡ng thĂ¡i'}`);
    //   }
    // });

    // Temporary: Use toggleUserStatus as fallback for ACTIVE/BLOCKED
    if (newStatus === 'ACTIVE' || newStatus === 'BLOCKED') {
      this.toggleUserStatus(user.id);
    } else {
      alert(`Chá»©c nÄƒng "${statusLabel}" Ä‘ang phĂ¡t triá»ƒn. Backend chÆ°a há»— trá»£.`);
    }
  }

  getRoleText(role: string): string {
    return this.ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
  }

  getDefaultAvatar(email: string): string {
    const name = email.split('@')[0];
    // Coursera-style blue avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0056D2&color=ffffff&size=150`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatBulkImportError(error: any, email: string): string {
    // Extract meaningful error message from API response
    let errorMessage = '';

    // Try to get error from different possible locations
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'Lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh';
    }

    // Clean up common error patterns
    errorMessage = errorMessage
      .replace(/^Server Error:\s*undefined\s*-\s*/i, '') // Remove "Server Error: undefined - "
      .replace(/^Error:\s*/i, '') // Remove "Error: " prefix
      .replace(/^undefined\s*-\s*/i, ''); // Remove "undefined - " prefix

    // Make specific errors more user-friendly
    if (errorMessage.includes('Username Ä‘Ă£ tá»“n táº¡i') || errorMessage.includes('username already exists')) {
      const username = email.split('@')[0];
      return `Email "${email}" Ä‘Ă£ Ä‘Æ°á»£c sá»­ dá»¥ng (username: ${username})`;
    }

    if (errorMessage.includes('Email Ä‘Ă£ tá»“n táº¡i') || errorMessage.includes('email already exists')) {
      return `Email "${email}" Ä‘Ă£ tá»“n táº¡i trong há»‡ thá»‘ng`;
    }

    if (errorMessage.includes('Invalid email') || errorMessage.includes('email khĂ´ng há»£p lá»‡')) {
      return `Email "${email}" khĂ´ng há»£p lá»‡`;
    }

    if (errorMessage.includes('Required field') || errorMessage.includes('Thiáº¿u thĂ´ng tin')) {
      return `Thiáº¿u thĂ´ng tin báº¯t buá»™c`;
    }

    // Return cleaned error message with email context
    return `${email}: ${errorMessage}`;
  }
}

