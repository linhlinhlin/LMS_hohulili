import { Routes } from '@angular/router';

export const MESSAGES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./messages-layout.component').then((m) => m.MessagesLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./student-inbox.component').then((m) => m.StudentInboxComponent),
        title: 'Tin nhắn - LMS Maritime',
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./conversation-view.component').then((m) => m.ConversationViewComponent),
        title: 'Tin nhắn mới - LMS Maritime',
      },
      {
        path: ':conversationId',
        loadComponent: () =>
          import('./conversation-view.component').then((m) => m.ConversationViewComponent),
        title: 'Cuộc hội thoại - LMS Maritime',
      },
    ],
  },
];
