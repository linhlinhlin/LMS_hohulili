import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicHeaderComponent } from '../public-header.component';
import { FooterComponent } from '../footer/footer.component';
import { ChatWidgetComponent } from '../../../../features/ai-chat/presentation/components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-homepage-layout',
  imports: [RouterOutlet, PublicHeaderComponent, FooterComponent, ChatWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col">
      <app-public-header></app-public-header>
      <!-- Spacer div to prevent content from being hidden behind fixed header -->
      <!-- Height: 50px (top bar) + 80px (main header) = 130px -->
      <div class="h-32"></div>
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>

      <!-- AI Chat Widget for Guests -->
      <app-chat-widget />
    </div>
  `,
})
export class HomepageLayoutComponent {}
