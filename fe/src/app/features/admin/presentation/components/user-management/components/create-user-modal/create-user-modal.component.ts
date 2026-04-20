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
}
