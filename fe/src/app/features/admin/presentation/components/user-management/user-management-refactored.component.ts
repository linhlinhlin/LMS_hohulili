import { Component, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as XLSX from 'xlsx';

import { UserManagementState } from './state/user-management.state';
import { UserStatsCardsComponent } from './components/stats-cards/stats-cards.component';
import { UserSearchFilterComponent } from './components/search-filter/search-filter.component';
import { UsersTableComponent } from './components/users-table/users-table.component';
import { CreateUserModalComponent } from './components/create-user-modal/create-user-modal.component';
import { EditUserModalComponent } from './components/edit-user-modal/edit-user-modal.component';
import { BulkImportModalComponent } from './components/bulk-import-modal/bulk-import-modal.component';
import { AdminService, AdminUser } from '../../../infrastructure/services/admin.service';
import { ToastService } from '../../../../../core/services/toast.service';

/**
 * Refactored User Management Component
 *
 * Original: 975 LOC → Refactored: ~150 LOC
 *
 * Decomposed into:
 * - UserManagementState: Signal-based state management
 * - UserStatsCardsComponent: Statistics display cards
 * - UserSearchFilterComponent: Search and filter controls
 * - UsersTableComponent: User data table with actions
 * - CreateUserModalComponent: Create user form modal
 * - EditUserModalComponent: Edit user form modal
 * - BulkImportModalComponent: Excel import modal
 */
@Component({
  selector: 'app-user-management-refactored',
  imports: [
    UserStatsCardsComponent,
    UserSearchFilterComponent,
    UsersTableComponent,
    CreateUserModalComponent,
    EditUserModalComponent,
    BulkImportModalComponent
],
  providers: [UserManagementState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-management-refactored.component.html',
  styleUrl: './user-management-refactored.component.scss'
})
export class UserManagementRefactoredComponent implements OnInit {
  readonly state = inject(UserManagementState);
  private adminService = inject(AdminService);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.state.loadUsers(1);
  }

  onStatusAction(event: { user: AdminUser; status: string }): void {
    this.adminService.updateUserStatus(event.user.id, { status: event.status as any, reason: '' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.state.loadUsers(this.state.currentPage());
          this.toastService.success('Trạng thái người dùng đã được cập nhật');
        },
        error: () => {
          this.toastService.error('Không thể cập nhật trạng thái. Vui lòng thử lại.');
        }
      });
  }

  startBulkImport(): void {
    const file = this.state.selectedFile();
    if (!file) return;

    this.state.bulkImportProgress.set({
      isImporting: true,
      progress: 40,
      currentStep: 'Đang tải file và xử lý trên máy chủ...',
      result: undefined
    });

    this.adminService.bulkImportUsers(
      file,
      this.state.defaultImportRole() as 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT'
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data, message }) => {
          this.state.bulkImportProgress.set({
            isImporting: false,
            progress: 100,
            currentStep: 'Hoàn thành',
            result: data
          });

          this.state.loadUsers(this.state.currentPage());

          if (data.failedImports === 0) {
            this.toastService.success(message);
            setTimeout(() => this.state.closeBulkImportModal(), 2000);
            return;
          }

          this.toastService.warning(`Đã import ${data.successfulImports}/${data.totalRows} người dùng. Kiểm tra lỗi chi tiết trong hộp thoại.`);
        },
        error: (error: Error) => {
          this.state.bulkImportProgress.set({
            isImporting: false,
            progress: 0,
            currentStep: 'Import thất bại',
            result: {
              totalRows: 0,
              successfulImports: 0,
              failedImports: 0,
              errors: [error.message || 'Không thể import người dùng. Vui lòng thử lại.']
            }
          });
          this.toastService.error(error.message || 'Không thể import người dùng. Vui lòng thử lại.');
        }
      });
  }

  downloadTemplate(): void {
    try {
      const templateData = [
        { 'Username': 'nguyenvana', 'Email': 'nguyenvana@student.edu.vn', 'Full Name': 'Nguyễn Văn A', 'Department': 'Khoa Hàng hải' },
        { 'Username': 'tranthib', 'Email': 'tranthib@student.edu.vn', 'Full Name': 'Trần Thị B', 'Department': 'Khoa Hàng hải' }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      XLSX.writeFile(wb, `user_import_template_${timestamp}.xlsx`);
    } catch {
      this.toastService.error('Không thể tải template. Vui lòng thử lại.');
    }
  }
}
