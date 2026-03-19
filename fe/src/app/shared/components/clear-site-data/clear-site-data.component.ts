import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-clear-site-data',
  imports: [CommonModule, RouterLink],
  templateUrl: './clear-site-data.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClearSiteDataComponent {
  private readonly route = inject(ActivatedRoute);

  readonly returnUrl = computed(() => {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    return value && value.startsWith('/') ? value : '/auth/login';
  });
}
