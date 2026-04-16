import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-bulk-import-modal',
  imports: [FormsModule],
  templateUrl: './bulk-import-modal.component.html',
  styleUrl: './bulk-import-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkImportModalComponent {
  readonly state = inject(UserManagementState);

  startImport = output<void>();
  downloadTemplate = output<void>();
}
