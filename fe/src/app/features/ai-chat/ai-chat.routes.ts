/**
 * AI Chat Routes
 * Configures routing for the AI Chat feature
 */
import { Routes } from '@angular/router';

export const AI_CHAT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./presentation/pages/ai-chat-full-page/ai-chat-full-page.component').then(
        (m) => m.AiChatFullPageComponent
      ),
    title: 'Trợ lý AI Hàng Hải',
  },
];
