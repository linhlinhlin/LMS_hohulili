import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/role.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard],
    title: 'Đăng nhập - LMS Maritime'
  },
  {
    path: 'register',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [guestGuard],
    title: 'Quên mật khẩu - LMS Maritime'
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    canActivate: [guestGuard],
    title: 'Đặt lại mật khẩu - LMS Maritime'
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
    title: 'Xác nhận email - LMS Maritime'
  },
  {
    // Server-side Google OAuth redirect flow lands here with the JWT in the URL fragment.
    path: 'google/callback',
    loadComponent: () => import('./google-callback/google-callback.component').then(m => m.GoogleCallbackComponent),
    title: 'Đang đăng nhập Google - LMS Maritime'
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./onboarding/onboarding.component').then(m => m.OnboardingComponent),
    title: 'Chào mừng - LMS Maritime'
  },
  {
    path: 'join',
    loadComponent: () => import('./join-org/join-org.component').then(m => m.JoinOrgComponent),
    title: 'Tham gia tổ chức - LMS Maritime'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
