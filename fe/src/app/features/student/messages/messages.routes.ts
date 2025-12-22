/**
 * Student Messages Routes
 *
 * Routes cho module tin nhắn của học viên.
 *
 * @requirements 2.1
 */
import { Routes } from '@angular/router';

export const MESSAGES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./student-inbox.component').then((m) => m.StudentInboxComponent),
    title: 'Tin nhắn - LMS Maritime',
  },
  {
    path: ':conversationId',
    loadComponent: () =>
      import('./conversation-view.component').then((m) => m.ConversationViewComponent),
    title: 'Cuộc hội thoại - LMS Maritime',
  },
];

