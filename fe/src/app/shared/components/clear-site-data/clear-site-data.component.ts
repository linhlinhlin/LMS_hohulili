import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-clear-site-data',
  imports: [CommonModule, RouterLink],
  templateUrl: './clear-site-data.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClearSiteDataComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  readonly returnUrl = computed(() => {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    return value && value.startsWith('/') ? value : '/auth/login';
  });

  ngOnInit(): void {
    this.seo.setNoindex();
  }
}
