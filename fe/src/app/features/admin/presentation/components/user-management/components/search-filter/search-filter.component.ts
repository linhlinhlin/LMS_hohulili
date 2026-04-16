import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-user-search-filter',
  imports: [FormsModule],
  templateUrl: './search-filter.component.html',
  styleUrl: './search-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSearchFilterComponent {
  readonly state = inject(UserManagementState);
}
