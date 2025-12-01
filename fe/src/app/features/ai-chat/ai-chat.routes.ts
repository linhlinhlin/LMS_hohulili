/**
 * AI Chat Routes
 * Configures routing for the AI Chat feature
 */
import { Routes } from '@angular/router';

export const AI_CHAT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./presentation/pages/chat-page/chat-page.component').then(
        (m) => m.ChatPageComponent
      ),
    title: 'Trợ lý AI Hàng Hải',
  },
];
