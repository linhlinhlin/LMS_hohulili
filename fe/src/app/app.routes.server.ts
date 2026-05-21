import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/an-toan-hang-hai',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/dieu-khien-tau',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/ky-thuat-may-tau',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/logistics-hang-hai',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/luat-hang-hai',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/stcw',
    renderMode: RenderMode.Server
  },
  {
    path: 'courses/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'simulation-courses',
    renderMode: RenderMode.Server
  },
  {
    path: 'about',
    renderMode: RenderMode.Server
  },
  {
    path: 'contact',
    renderMode: RenderMode.Server
  },
  {
    path: 'privacy',
    renderMode: RenderMode.Server
  },
  {
    path: 'terms',
    renderMode: RenderMode.Server
  },
  {
    path: 'refund-policy',
    renderMode: RenderMode.Server
  },
  {
    // SEO Phase 7: switch from Client → Server để noindex meta tag bake vào
    // static HTML từ đầu (Google bot fetch lần đầu không cần execute JS).
    // GoogleSigninButton.ngAfterViewInit có platform guard skip trên server.
    path: 'auth/login',
    renderMode: RenderMode.Server
  },
  {
    // Account recovery pages are public URLs but must ship noindex in SSR HTML.
    path: 'auth/forgot-password',
    renderMode: RenderMode.Server
  },
  {
    // Token-bearing reset links should never be indexable.
    path: 'auth/reset-password',
    renderMode: RenderMode.Server
  },
  {
    // Public recovery utility pages should emit noindex without waiting for
    // client-side JavaScript.
    path: 'offline',
    renderMode: RenderMode.Server
  },
  {
    path: 'pwa-repair',
    renderMode: RenderMode.Server
  },
  {
    path: 'reset-sw',
    renderMode: RenderMode.Server
  },
  {
    path: 'clear-site-data',
    renderMode: RenderMode.Server
  },
  {
    path: 'teacher',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/course-creation',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/courses/:id/editor',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/assessments',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/students',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/students/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/messages',
    renderMode: RenderMode.Client
  },
  {
    path: 'student',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/courses/library',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/courses/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/simulation-courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/my-courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/course/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/tasks',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/tasks/:id/work',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/assignments',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/assignments/:id/work',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/profile',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/select',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/course/:courseId',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/course/:courseId/lesson/:lessonId',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/notes',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/bookmarks',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/results',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/grades',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/quiz',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/quiz/take/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/browse',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/courses',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/settings',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
