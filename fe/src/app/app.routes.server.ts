import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'courses',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'courses/navigation',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'courses/engineering',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'courses/logistics',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'courses/law',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'courses/certificates',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'courses/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'auth/login',
    renderMode: RenderMode.Client
  },
  {
    path: 'auth/register',
    renderMode: RenderMode.Client
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
    path: 'teacher/courses/:id/edit',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/assignments',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/assignment-creation',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/assignments/:id/edit',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/assignments/:id/submissions',
    renderMode: RenderMode.Client
  },
  {
    path: 'teacher/courses/:courseId/sections/:sectionId/assignments/:assignmentId/submissions',
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
    path: 'teacher/notifications',
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
    path: 'student/my-courses',
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
    path: 'student/assignments/work/:id',
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
    path: 'student/learn',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/select',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/course/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/planner',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/learn/calendar',
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
    path: 'student/quiz',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/quiz/take/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/forum',
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
    path: 'learn/:courseId',
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