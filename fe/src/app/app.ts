import { Component, signal, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorDisplayComponent } from './shared/components/error-display/error-display.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorDisplayComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <router-outlet></router-outlet>
    <!-- <app-error-display></app-error-display> DISABLED để tránh popup -->
  `,
})
export class App {
  protected readonly title = signal('LMS Maritime - Hệ thống Quản lý Học tập Phân tán');
}