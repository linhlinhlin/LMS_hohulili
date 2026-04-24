import { Routes } from '@angular/router';
import { authGuard } from './core/guards/role.guard';
import { HomepageLayoutComponent } from './shared/components/layout/homepage-layout/homepage-layout.component';
import { OfflineFallbackComponent } from './shared/components/offline-fallback/offline-fallback.component';

/**
 * Main Application Routes Configuration
 *
 * Cáº¥u trÃºc routing Ä‘Æ¡n giáº£n vÃ  chuyÃªn nghiá»‡p:
 * - Public routes (homepage layout)
 * - Role-based routes (teacher, student, admin)
 * - Other authenticated routes
 * - Fallback route
 */
export const routes: Routes = [
  // ========================================
  // AUTHENTICATION ROUTES (No Layout/Header)
  // ========================================
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },

  // ========================================
  // PWA RECOVERY ROUTES
  // ========================================
  {
    path: 'pwa-repair',
    loadComponent: () => import('./shared/components/pwa-repair/pwa-repair.component').then(m => m.PwaRepairComponent),
    title: 'KhÃ´i phá»¥c PWA - LMS Maritime',
  },
  {
    path: 'reset-sw',
    loadComponent: () => import('./shared/components/pwa-repair/pwa-repair.component').then(m => m.PwaRepairComponent),
    title: 'KhÃ´i phá»¥c PWA - LMS Maritime',
  },
  {
    path: 'clear-site-data',
    loadComponent: () => import('./shared/components/clear-site-data/clear-site-data.component').then(m => m.ClearSiteDataComponent),
    title: 'LÃ m sáº¡ch dá»¯ liá»‡u trÃ¬nh duyá»‡t - LMS Maritime',
  },

  // ========================================
  // PUBLIC ROUTES (Homepage Layout)
  // ========================================
  {
    path: '',
    component: HomepageLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home-simple.component').then(m => m.HomeSimpleComponent),
        title: 'Trang chá»§ - LMS Maritime'
      },
      {
        path: 'courses',
        loadComponent: () => import('./features/courses/courses.component').then(m => m.CoursesComponent),
        title: 'KhÃ³a há»c - LMS Maritime'
      },
      // Category routes â†’ redirect to /courses?category={slug} (real API data)
      { path: 'courses/safety', redirectTo: '/courses?category=safety', pathMatch: 'full' },
      { path: 'courses/navigation', redirectTo: '/courses?category=navigation', pathMatch: 'full' },
      { path: 'courses/engineering', redirectTo: '/courses?category=engineering', pathMatch: 'full' },
      { path: 'courses/logistics', redirectTo: '/courses?category=logistics', pathMatch: 'full' },
      { path: 'courses/law', redirectTo: '/courses?category=law', pathMatch: 'full' },
      { path: 'courses/certificates', redirectTo: '/courses?category=certificates', pathMatch: 'full' },
      // Course Detail - Must come BEFORE category fallback to properly match UUIDs
      // Uses canMatch guard to distinguish UUID from category name
      {
        path: 'courses/:id',
        canMatch: [(route, segments) => {
          // UUID pattern: 8-4-4-4-12 hex digits (e.g., 82701937-2199-48c7-9314-abc123def456)
          const id = segments[1]?.path || '';
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          return isUUID;
        }],
        loadComponent: () => import('./features/courses/course-detail.component').then(m => m.CourseDetailComponent),
        title: 'Chi tiáº¿t khÃ³a há»c - LMS Maritime'
      },
      // Fallback for unknown /courses/{slug} â†’ redirect to courses listing
      { path: 'courses/:slug', redirectTo: '/courses', pathMatch: 'full' },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent),
        title: 'Giá»›i thiá»‡u - LMS Maritime'
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent),
        title: 'LiÃªn há»‡ - LMS Maritime'
      },
      {
        path: 'privacy',
        loadComponent: () => import('./features/privacy/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
        title: 'ChÃ­nh sÃ¡ch báº£o máº­t - LMS Maritime'
      },
      {
        path: 'terms',
        loadComponent: () => import('./features/terms/terms-of-service.component').then(m => m.TermsOfServiceComponent),
        title: 'Äiá»u khoáº£n sá»­ dá»¥ng - LMS Maritime'
      }
    ]
  },


  // ========================================
  // ROLE-BASED ROUTES (Separate Route Files)
  // ========================================

  // Teacher Routes - Sá»­ dá»¥ng route file riÃªng
  {
    path: 'teacher',
    loadChildren: () => import('./features/teacher/teacher.routes').then(m => m.teacherRoutes)
  },

  // Student Routes - Sá»­ dá»¥ng route file riÃªng
  {
    path: 'student',
    loadChildren: () => import('./features/student/student.routes').then(m => m.studentRoutes)
  },

  // Admin Routes - Sá»­ dá»¥ng route file riÃªng
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: 'org-admin',
    loadChildren: () => import('./features/org-admin/org-admin.routes').then(m => m.orgAdminRoutes)
  },

  // ========================================
  // OTHER AUTHENTICATED ROUTES
  // ========================================

  // Sprint 220b: ai-chat full-page route removed â€” AI chat is now an iframe widget

  // Payment Result Pages (public - no auth required for callback handling)
  {
    path: 'payment',
    loadChildren: () => import('./features/payment/payment.routes').then(m => m.paymentRoutes),
  },

  // Refund Policy (public, required by Vietnamese Consumer Protection Law 19/2023/QH15)
  {
    path: 'refund-policy',
    loadComponent: () => import('./features/payment/refund-policy.component').then(m => m.RefundPolicyComponent),
    title: 'ChÃ­nh sÃ¡ch hoÃ n tiá»n - LMS Maritime'
  },


  // ========================================
  // OFFLINE ROUTE
  // ========================================
  {
    path: 'offline',
    component: OfflineFallbackComponent,
    title: 'Ngoáº¡i tuyáº¿n - LMS Maritime'
  },

  // ========================================
  // FALLBACK ROUTE
  // ========================================

  {
    path: '**',
    redirectTo: ''
  }
];
