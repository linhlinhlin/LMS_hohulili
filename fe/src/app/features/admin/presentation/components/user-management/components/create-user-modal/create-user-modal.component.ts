import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';
import { DialogComponent } from '../../../../../../../shared/components/dialog/dialog.component';

@Component({
  selector: 'app-create-user-modal',
  imports: [FormsModule, DialogComponent],
  templateUrl: './create-user-modal.component.html',
  styleUrl: './create-user-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateUserModalComponent {
  readonly state = inject(UserManagementState);

  // Shopify "or import products" pattern — admin đang tạo 1 user nhận ra
  // mình cần thêm hàng loạt → 1 click switch sang bulk import flow,
  // không phải đóng modal rồi tìm nút Import Excel trên list page.
  onSwitchToBulkImport(): void {
    this.state.closeCreateUserModal();
    this.state.openBulkImportModal();
  }
}
