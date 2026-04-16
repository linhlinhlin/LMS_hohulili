import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-edit-user-modal',
  imports: [FormsModule],
  templateUrl: './edit-user-modal.component.html',
  styleUrl: './edit-user-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditUserModalComponent {
  readonly state = inject(UserManagementState);
}
