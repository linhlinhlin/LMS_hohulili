import { Component, computed, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as XLSX from 'xlsx';
import { forkJoin } from 'rxjs';

import { UserManagementState } from './state/user-management.state';
import { UserStatsCardsComponent } from './components/stats-cards/stats-cards.component';
import { UserSearchFilterComponent } from './components/search-filter/search-filter.component';
import { UsersTableComponent } from './components/users-table/users-table.component';
import { CreateUserModalComponent } from './components/create-user-modal/create-user-modal.component';
import { EditUserModalComponent } from './components/edit-user-modal/edit-user-modal.component';
import { BulkImportModalComponent } from './components/bulk-import-modal/bulk-import-modal.component';
import { AdminService, AdminUser, UserAccountStatus } from '../../../infrastructure/services/admin.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { BulkActionBarComponent, BulkAction } from '../../../../../shared/components/admin/bulk-action-bar/bulk-action-bar.component';

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
    BulkImportModalComponent,
    BulkActionBarComponent
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
  private confirmDialog = inject(ConfirmDialogService);
  private authService = inject(AuthService);

  // CC-06 — bulk actions for the all-users surface. "Khóa" disables when
  // the current user is in the selection (F-AD2 self-suspend defence-in-depth).
  bulkActions = computed<BulkAction[]>(() => {
    const selfId = this.authService.currentUser()?.id;
    const selectedHasSelf = !!selfId && this.state.selectedUserIds().has(selfId);
    return [
      {
        key: 'block',
        label: 'Khóa',
        variant: 'danger',
        disabled: selectedHasSelf,
        ariaLabel: selectedHasSelf
          ? 'Không thể khóa tài khoản của chính bạn'
          : 'Khóa các tài khoản đã chọn',
        icon: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
      },
      {
        key: 'activate',
        label: 'Kích hoạt',
        ariaLabel: 'Kích hoạt các tài khoản đã chọn',
        icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      },
    ];
  });

  async onBulkAction(key: string): Promise<void> {
    const ids = Array.from(this.state.selectedUserIds());
    if (ids.length === 0) return;
    if (key === 'block') await this.bulkUpdateStatus(ids, UserAccountStatus.BLOCKED);
    else if (key === 'activate') await this.bulkUpdateStatus(ids, UserAccountStatus.ACTIVE);
  }

  private async bulkUpdateStatus(userIds: string[], status: UserAccountStatus): Promise<void> {
    const selfId = this.authService.currentUser()?.id;
    if (status === UserAccountStatus.BLOCKED && selfId && userIds.includes(selfId)) {
      this.toastService.error('Không thể khóa tài khoản của chính bạn.');
      return;
    }

    const isBlock = status === UserAccountStatus.BLOCKED;
    const confirmed = await this.confirmDialog.confirm({
      title: isBlock ? 'Khóa tài khoản hàng loạt' : 'Kích hoạt tài khoản hàng loạt',
      message: isBlock
        ? `Bạn có chắc muốn khóa ${userIds.length} tài khoản đã chọn?`
        : `Bạn có chắc muốn kích hoạt lại ${userIds.length} tài khoản đã chọn?`,
      confirmText: isBlock ? `Khóa ${userIds.length} tài khoản` : `Kích hoạt ${userIds.length} tài khoản`,
      variant: isBlock ? 'danger' : 'warning'
    });
    if (!confirmed) return;

    const requests = userIds.map(id =>
      this.adminService.updateUserStatus(id, { status, reason: '' })
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success(
            isBlock
              ? `Đã khóa ${userIds.length} tài khoản thành công`
              : `Đã kích hoạt ${userIds.length} tài khoản thành công`
          );
          this.state.loadUsers(this.state.currentPage());
        },
        error: () => {
          this.toastService.error('Một số tài khoản không thể cập nhật. Vui lòng thử lại.');
          this.state.loadUsers(this.state.currentPage());
        }
      });
  }

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
