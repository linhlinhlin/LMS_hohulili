import { Routes } from '@angular/router';
import { authGuard } from './core/guards/role.guard';
import { HomepageLayoutComponent } from './shared/components/layout/homepage-layout/homepage-layout.component';
import { OfflineFallbackComponent } from './shared/components/offline-fallback/offline-fallback.component';

/**
 * Main Application Routes Configuration
 *
 * Cấu trúc routing đơn giản và chuyên nghiệp:
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
    title: 'Khôi phục PWA - LMS Maritime',
  },
  {
    path: 'reset-sw',
    loadComponent: () => import('./shared/components/pwa-repair/pwa-repair.component').then(m => m.PwaRepairComponent),
    title: 'Khôi phục PWA - LMS Maritime',
  },
  {
    path: 'clear-site-data',
    loadComponent: () => import('./shared/components/clear-site-data/clear-site-data.component').then(m => m.ClearSiteDataComponent),
    title: 'Làm sạch dữ liệu trình duyệt - LMS Maritime',
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
        title: 'Trang chủ - LMS Maritime'
      },
      {
        path: 'courses',
        // pathMatch: 'full' để chỉ match /courses chính xác — không match
        // /courses/{uuid} (sẽ rơi vào course detail route bên dưới).
        // Không set 'full' = mặc định 'prefix' = match cả /courses/{anything}
        // → CoursesComponent render cho cả course detail URLs (SSR bug Phase 7).
        pathMatch: 'full',
        loadComponent: () => import('./features/courses/courses.component').then(m => m.CoursesComponent),
        title: 'Khóa học - LMS Maritime'
      },
      // Category routes → redirect to /courses?category={slug} (real API data)
      { path: 'courses/safety', redirectTo: '/courses?category=safety', pathMatch: 'full' },
      { path: 'courses/navigation', redirectTo: '/courses?category=navigation', pathMatch: 'full' },
      { path: 'courses/engineering', redirectTo: '/courses?category=engineering', pathMatch: 'full' },
      { path: 'courses/logistics', redirectTo: '/courses?category=logistics', pathMatch: 'full' },
      { path: 'courses/law', redirectTo: '/courses?category=law', pathMatch: 'full' },
      { path: 'courses/certificates', redirectTo: '/courses?category=certificates', pathMatch: 'full' },
      // Course Detail — Phase 7 fix: dùng UrlMatcher thay canMatch.
      // canMatch + path: 'courses/:id' empirically không hoạt động (route
      // matched fallback courses/:slug → redirect /courses). UrlMatcher
      // deterministic: chỉ match đúng 2 segments [courses, {valid-uuid}].
      {
        matcher: (segments) => {
          if (segments.length !== 2 || segments[0].path !== 'courses') return null;
          const idSeg = segments[1];
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idSeg.path);
          if (!isUUID) return null;
          return {
            consumed: segments,
            posParams: { id: idSeg }
          };
        },
        loadComponent: () => import('./features/courses/course-detail.component').then(m => m.CourseDetailComponent),
        title: 'Chi tiết khóa học - LMS Maritime'
      },
      // Fallback for unknown /courses/{slug} → redirect to courses listing
      { path: 'courses/:slug', redirectTo: '/courses', pathMatch: 'full' },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent),
        title: 'Giới thiệu - LMS Maritime'
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent),
        title: 'Liên hệ - LMS Maritime'
      },
      {
        path: 'privacy',
        loadComponent: () => import('./features/privacy/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
        title: 'Chính sách bảo mật - LMS Maritime'
      },
      {
        path: 'terms',
        loadComponent: () => import('./features/terms/terms-of-service.component').then(m => m.TermsOfServiceComponent),
        title: 'Điều khoản sử dụng - LMS Maritime'
      }
    ]
  },


  // ========================================
  // ROLE-BASED ROUTES (Separate Route Files)
  // ========================================

  // Teacher Routes - Sử dụng route file riêng
  {
    path: 'teacher',
    loadChildren: () => import('./features/teacher/teacher.routes').then(m => m.teacherRoutes)
  },

  // Student Routes - Sử dụng route file riêng
  {
    path: 'student',
    loadChildren: () => import('./features/student/student.routes').then(m => m.studentRoutes)
  },

  // Admin Routes - Sử dụng route file riêng
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

  // Sprint 220b: ai-chat full-page route removed — AI chat is now an iframe widget

  // Payment Result Pages (public - no auth required for callback handling)
  {
    path: 'payment',
    loadChildren: () => import('./features/payment/payment.routes').then(m => m.paymentRoutes),
  },

  // Refund Policy (public, required by Vietnamese Consumer Protection Law 19/2023/QH15)
  {
    path: 'refund-policy',
    loadComponent: () => import('./features/payment/refund-policy.component').then(m => m.RefundPolicyComponent),
    title: 'Chính sách hoàn tiền - LMS Maritime'
  },


  // ========================================
  // OFFLINE ROUTE
  // ========================================
  {
    path: 'offline',
    component: OfflineFallbackComponent,
    title: 'Ngoại tuyến - LMS Maritime'
  },

  // ========================================
  // FALLBACK ROUTE
  // ========================================

  {
    path: '**',
    redirectTo: ''
  }
];
