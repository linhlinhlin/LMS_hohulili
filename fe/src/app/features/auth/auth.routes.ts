import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
    title: 'Đăng nhập - LMS Maritime'
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
    title: 'Đăng ký - LMS Maritime'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Quên mật khẩu - LMS Maritime'
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'Đặt lại mật khẩu - LMS Maritime'
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
    title: 'Xác nhận email - LMS Maritime'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
