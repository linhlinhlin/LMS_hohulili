import { Routes } from '@angular/router';

export const communicationRoutes: Routes = [
  {
    path: '',
    redirectTo: 'forum',
    pathMatch: 'full'
  },
  {
    path: 'forum',
    loadComponent: () => import('./student-forum.component').then(m => m.StudentForumComponent),
    title: 'Student Forum - LMS Maritime'
  },
  {
    path: 'discussions',
    loadComponent: () => import('./discussion-boards.component').then(m => m.DiscussionBoardsComponent),
    title: 'Discussion Boards - LMS Maritime'
  },
  {
    path: 'messages',
    loadComponent: () => import('./student-forum.component').then(m => m.StudentForumComponent),
    title: 'Direct Messages - LMS Maritime'
  },
  {
    path: 'peer-learning',
    loadComponent: () => import('./discussion-boards.component').then(m => m.DiscussionBoardsComponent),
    title: 'Peer Learning - LMS Maritime'
  }
];