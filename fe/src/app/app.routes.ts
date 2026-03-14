import { Routes } from '@angular/router';
import { authGuard } from './core/guards/role.guard';
import { HomepageLayoutComponent } from './shared/components/layout/homepage-layout/homepage-layout.component';

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
    loadComponent: () => import('./shared/components/offline-fallback/offline-fallback.component').then(m => m.OfflineFallbackComponent),
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
