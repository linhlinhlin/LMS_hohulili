import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-user-stats-cards',
  imports: [],
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserStatsCardsComponent {
  readonly state = inject(UserManagementState);
}
