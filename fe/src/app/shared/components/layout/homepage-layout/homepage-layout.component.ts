import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicHeaderComponent } from '../public-header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-homepage-layout',
  imports: [RouterOutlet, PublicHeaderComponent, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col">
      <app-public-header></app-public-header>
      <div class="h-32"></div>
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `,
})
export class HomepageLayoutComponent {}
