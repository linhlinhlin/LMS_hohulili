import { Component, signal, ViewEncapsulation, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorDisplayComponent } from './shared/components/error-display/error-display.component';
import { PwaService } from './core/services/pwa.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet],
  encapsulation: ViewEncapsulation.None,
  template: `
    <router-outlet></router-outlet>
    <!-- <app-error-display></app-error-display> DISABLED để tránh popup -->
  `,
})
export class App {
  private pwaService = inject(PwaService); // Initialize PWA listener
  protected readonly title = signal('LMS Maritime - Hệ thống Quản lý Học tập Phân tán');
}
