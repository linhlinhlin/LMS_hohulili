import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
// Define UserRole enum locally to avoid import issues
export enum UserRole {
  ADMIN = "admin",
  TEACHER = "teacher",
  STUDENT = "student",
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  studentId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLogin: Date;
  loginCount: number;
  coursesCreated?: number;
  coursesEnrolled?: number;
  totalSpent?: number;
  permissions: string[];
}

export interface AdminCourse {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  price: number;
  thumbnail: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'archived';
  instructor: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  students: number;
  rating: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date;
  approvedAt?: Date;
  rejectionReason?: string;
  certificate: {
    type: 'STCW' | 'IMO' | 'Professional' | 'Completion';
    description: string;
  };
}

export interface AdminAnalytics {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  pendingCourses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeUsers: number;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    email: 'healthy' | 'warning' | 'error';
  };
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  courseStats: {
    pending: number;
    approved: number;
    rejected: number;
    active: number;
  };
  revenueStats: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  // Additional properties for admin dashboard
  studentGrowth: number;
  courseGrowth: number;
  revenue: number;
  revenueGrowth: number;
  systemUptime: number;
  onlineStudents: number;
  activeCourses: number;
  pendingAssignments: number;
  unreadMessages: number;
}

export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  payment: {
    stripePublicKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
    paypalClientSecret: string;
    currency: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private errorService = inject(ErrorHandlingService);

  // API Configuration
  private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1/admin';
  private readonly ENDPOINTS = {
    users: '/users',
    courses: '/courses',
    analytics: '/analytics',
    settings: '/settings',
    system: '/system'
  };

  // Signals for reactive state management
  private _users = signal<AdminUser[]>([]);
  private _courses = signal<AdminCourse[]>([]);
  private _analytics = signal<AdminAnalytics | null>(null);
  private _settings = signal<SystemSettings | null>(null);
  private _isLoading = signal<boolean>(false);

  // Readonly signals for external consumption
  readonly users = this._users.asReadonly();
  readonly courses = this._courses.asReadonly();
  readonly analytics = this._analytics.asReadonly();
  readonly settings = this._settings.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed signals
  readonly totalUsers = computed(() => this._users().length);
  readonly totalTeachers = computed(() => this._users().filter(user => user.role === 'teacher').length);
  readonly totalStudents = computed(() => this._users().filter(user => user.role === 'student').length);
  readonly totalAdmins = computed(() => this._users().filter(user => user.role === 'admin').length);
  
  readonly activeUsers = computed(() => 
    this._users().filter(user => user.isActive).length
  );

  readonly pendingCourses = computed(() => 
    this._courses().filter(course => course.status === 'pending').length
  );

  readonly approvedCourses = computed(() => 
    this._courses().filter(course => course.status === 'approved').length
  );

  readonly totalRevenue = computed(() => 
    this._courses().reduce((sum, course) => sum + course.revenue, 0)
  );

  constructor() {
    this.loadMockData();
  }

  // User Management Methods
  async getUsers(): Promise<AdminUser[]> {
    this._isLoading.set(true);
    try {
      // Try real API first, fallback to mock data
      const users = await this.fetchUsersFromAPI();
      this._users.set(users);
      return users;
    } catch (error) {
      console.warn('API unavailable, using mock data:', error);
      this.errorService.showWarning('Đang sử dụng dữ liệu mẫu. Kết nối API sẽ được khôi phục sau.', 'api');
      return this._users();
    } finally {
      this._isLoading.set(false);
    }
  }

  private async fetchUsersFromAPI(): Promise<AdminUser[]> {
    // For now, simulate API call with mock data
    await this.simulateApiCall();
    return this.getMockUsers();
  }

  async createUser(userData: Partial<AdminUser>): Promise<AdminUser> {
    this._isLoading.set(true);
    try {
      this.validateUserData(userData);
      
      const newUser = await this.createUserViaAPI(userData);
      this._users.update(users => [...users, newUser]);
      
      this.errorService.showSuccess('Người dùng đã được tạo thành công!', 'user');
      return newUser;
    } catch (error) {
      this.handleError(error, 'Tạo người dùng thất bại');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateUser(userId: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._users.update(users => 
        users.map(user => 
          user.id === userId 
            ? { ...user, ...updates, updatedAt: new Date() }
            : user
        )
      );

      const updatedUser = this._users().find(user => user.id === userId);
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      this.errorService.showSuccess('Người dùng đã được cập nhật thành công!', 'user');
      return updatedUser;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      this._users.update(users => users.filter(user => user.id !== userId));
      this.errorService.showSuccess('Người dùng đã được xóa thành công!', 'user');
    } finally {
      this._isLoading.set(false);
    }
  }

  async toggleUserStatus(userId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._users.update(users => 
        users.map(user => 
          user.id === userId 
            ? { ...user, isActive: !user.isActive, updatedAt: new Date() }
            : user
        )
      );
      
      const user = this._users().find(u => u.id === userId);
      if (user) {
        this.errorService.showSuccess(
          `Người dùng đã được ${user.isActive ? 'kích hoạt' : 'vô hiệu hóa'} thành công!`, 
          'user'
        );
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  // Course Management Methods
  async getCourses(): Promise<AdminCourse[]> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      return this._courses();
    } finally {
      this._isLoading.set(false);
    }
  }

  async approveCourse(courseId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._courses.update(courses => 
        courses.map(course => 
          course.id === courseId 
            ? { 
                ...course, 
                status: 'approved' as const, 
                approvedAt: new Date(),
                updatedAt: new Date() 
              }
            : course
        )
      );
      
      this.errorService.showSuccess('Khóa học đã được phê duyệt thành công!', 'course');
    } finally {
      this._isLoading.set(false);
    }
  }

  async rejectCourse(courseId: string, reason: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._courses.update(courses => 
        courses.map(course => 
          course.id === courseId 
            ? { 
                ...course, 
                status: 'rejected' as const, 
                rejectionReason: reason,
                updatedAt: new Date() 
              }
            : course
        )
      );
      
      this.errorService.showSuccess('Khóa học đã bị từ chối.', 'course');
    } finally {
      this._isLoading.set(false);
    }
  }

  // Analytics Methods
  async getAnalytics(): Promise<AdminAnalytics> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const analytics: AdminAnalytics = {
        totalUsers: this._users().length,
        totalTeachers: this.totalTeachers(),
        totalStudents: this.totalStudents(),
        totalCourses: this._courses().length,
        pendingCourses: this.pendingCourses(),
        totalRevenue: this.totalRevenue(),
        monthlyRevenue: this.calculateMonthlyRevenue(),
        activeUsers: this.activeUsers(),
        systemHealth: {
          database: 'healthy',
          api: 'healthy',
          storage: 'healthy',
          email: 'warning'
        },
        userGrowth: {
          thisMonth: Math.floor(Math.random() * 50) + 20,
          lastMonth: Math.floor(Math.random() * 40) + 15,
          growthRate: Math.floor(Math.random() * 30) + 10
        },
        courseStats: {
          pending: this.pendingCourses(),
          approved: this.approvedCourses(),
          rejected: this._courses().filter(c => c.status === 'rejected').length,
          active: this._courses().filter(c => c.status === 'active').length
        },
        revenueStats: {
          thisMonth: this.calculateMonthlyRevenue(),
          lastMonth: this.calculateMonthlyRevenue() * 0.8,
          growthRate: 15
        },
        // Additional properties for admin dashboard
        studentGrowth: Math.floor(Math.random() * 20) + 10,
        courseGrowth: Math.floor(Math.random() * 15) + 5,
        revenue: this.totalRevenue(),
        revenueGrowth: Math.floor(Math.random() * 25) + 10,
        systemUptime: 99.9,
        onlineStudents: Math.floor(Math.random() * 50) + 20,
        activeCourses: this._courses().filter(c => c.status === 'active').length,
        pendingAssignments: Math.floor(Math.random() * 30) + 10,
        unreadMessages: Math.floor(Math.random() * 20) + 5
      };

      this._analytics.set(analytics);
      return analytics;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Settings Methods
  async getSettings(): Promise<SystemSettings> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const settings: SystemSettings = {
        general: {
          siteName: 'LMS Maritime',
          siteDescription: 'Hệ thống quản lý học tập chuyên về lĩnh vực hàng hải',
          maintenanceMode: false,
          allowRegistration: true,
          requireEmailVerification: true
        },
        email: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: 'admin@lms-maritime.com',
          smtpPassword: '********',
          fromEmail: 'noreply@lms-maritime.com',
          fromName: 'LMS Maritime'
        },
        payment: {
          stripePublicKey: 'pk_test_...',
          stripeSecretKey: 'sk_test_...',
          paypalClientId: 'client_id_...',
          paypalClientSecret: 'client_secret_...',
          currency: 'VND'
        },
        security: {
          sessionTimeout: 24,
          maxLoginAttempts: 5,
          passwordMinLength: 8,
          requireTwoFactor: false
        }
      };

      this._settings.set(settings);
      return settings;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      this._settings.update(current => ({
        ...current!,
        ...settings
      }));
      
      this.errorService.showSuccess('Cài đặt hệ thống đã được cập nhật thành công!', 'settings');
    } finally {
      this._isLoading.set(false);
    }
  }

  // Helper Methods
  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  private validateUserData(userData: Partial<AdminUser>): void {
    const requiredFields = ['email', 'name', 'role'];
    const missingFields = requiredFields.filter(field => !userData[field as keyof AdminUser]);
    
    if (missingFields.length > 0) {
      throw new Error(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`);
    }
  }

  private async createUserViaAPI(userData: Partial<AdminUser>): Promise<AdminUser> {
    await this.simulateApiCall();
    
    const newUser: AdminUser = {
      id: this.generateId(),
      email: userData.email || '',
      name: userData.name || '',
      role: userData.role || UserRole.STUDENT,
      avatar: userData.avatar || this.getDefaultAvatar(userData.email || ''),
      department: userData.department || this.getDepartmentFromRole(userData.role || UserRole.STUDENT),
      studentId: userData.role === 'student' ? this.generateStudentId() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      lastLogin: new Date(),
      loginCount: 0,
      coursesCreated: userData.role === 'teacher' ? 0 : undefined,
      coursesEnrolled: userData.role === 'student' ? 0 : undefined,
      totalSpent: userData.role === 'student' ? 0 : undefined,
      permissions: this.getDefaultPermissions(userData.role || UserRole.STUDENT)
    };

    return newUser;
  }

  private getDefaultAvatar(email: string): string {
    const name = email.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc2626&color=ffffff&size=150`;
  }

  private getDepartmentFromRole(role: UserRole): string {
    switch (role) {
      case 'student':
        return 'Khoa Hàng hải';
      case 'teacher':
        return 'Khoa Hàng hải';
      case 'admin':
        return 'Phòng Quản trị';
      default:
        return 'Khoa Hàng hải';
    }
  }

  private generateStudentId(): string {
    return 'SV' + new Date().getFullYear() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  private getDefaultPermissions(role: UserRole): string[] {
    switch (role) {
      case 'admin':
        return ['read', 'write', 'delete', 'manage_users', 'manage_courses', 'manage_system'];
      case 'teacher':
        return ['read', 'write', 'manage_courses', 'manage_students'];
      case 'student':
        return ['read', 'enroll_courses'];
      default:
        return ['read'];
    }
  }

  private calculateMonthlyRevenue(): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return this._courses().reduce((sum, course) => {
      const courseDate = new Date(course.createdAt);
      if (courseDate.getMonth() === currentMonth && courseDate.getFullYear() === currentYear) {
        return sum + course.revenue;
      }
      return sum;
    }, 0);
  }

  // Error handling
  private handleError(error: any, context: string): void {
    console.error(`AdminService Error [${context}]:`, error);
    
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          this.errorService.addError({ message: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.', type: 'error', context });
          break;
        case 401:
          this.errorService.addError({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', type: 'error', context });
          break;
        case 403:
          this.errorService.addError({ message: 'Bạn không có quyền thực hiện hành động này.', type: 'error', context });
          break;
        case 404:
          this.errorService.addError({ message: 'Không tìm thấy dữ liệu.', type: 'error', context });
          break;
        case 500:
          this.errorService.addError({ message: 'Lỗi máy chủ. Vui lòng thử lại sau.', type: 'error', context });
          break;
        default:
          this.errorService.addError({ message: 'Có lỗi xảy ra. Vui lòng thử lại.', type: 'error', context });
      }
    } else if (error instanceof Error) {
      this.errorService.addError({ message: error.message, type: 'error', context });
    } else {
      this.errorService.addError({ message: 'Có lỗi không xác định xảy ra.', type: 'error', context });
    }
  }

  private loadMockData(): void {
    // Mock users
    const mockUsers: AdminUser[] = this.getMockUsers();
    const mockCourses: AdminCourse[] = this.getMockCourses();

    this._users.set(mockUsers);
    this._courses.set(mockCourses);
  }

  private getMockUsers(): AdminUser[] {
    return [
      {
        id: 'admin_1',
        email: 'admin@lms-maritime.com',
        name: 'Admin System',
        role: UserRole.ADMIN,
        avatar: 'https://ui-avatars.com/api/?name=Admin+System&background=dc2626&color=ffffff&size=150',
        department: 'Phòng Quản trị',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-09-20'),
        isActive: true,
        lastLogin: new Date('2024-09-22'),
        loginCount: 156,
        permissions: ['read', 'write', 'delete', 'manage_users', 'manage_courses', 'manage_system']
      },
      {
        id: 'teacher_1',
        email: 'teacher@lms-maritime.com',
        name: 'Nguyễn Văn Teacher',
        role: UserRole.TEACHER,
        avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+Teacher&background=8b5cf6&color=ffffff&size=150',
        department: 'Khoa Hàng hải',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-09-21'),
        isActive: true,
        lastLogin: new Date('2024-09-21'),
        loginCount: 89,
        coursesCreated: 3,
        permissions: ['read', 'write', 'manage_courses', 'manage_students']
      },
      {
        id: 'student_1',
        email: 'student@lms-maritime.com',
        name: 'Trần Thị Student',
        role: UserRole.STUDENT,
        avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+Student&background=3b82f6&color=ffffff&size=150',
        department: 'Khoa Hàng hải',
        studentId: 'SV2024001',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-09-20'),
        isActive: true,
        lastLogin: new Date('2024-09-20'),
        loginCount: 45,
        coursesEnrolled: 2,
        totalSpent: 5000000,
        permissions: ['read', 'enroll_courses']
      }
    ];
  }

  private getMockCourses(): AdminCourse[] {
    return [
      {
        id: 'course_admin_1',
        title: 'Kỹ thuật Tàu biển Cơ bản',
        description: 'Khóa học cung cấp kiến thức cơ bản về kỹ thuật tàu biển',
        shortDescription: 'Kiến thức cơ bản về kỹ thuật tàu biển',
        category: 'engineering',
        level: 'beginner',
        duration: '40 giờ',
        price: 2500000,
        thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
        status: 'pending',
        instructor: {
          id: 'teacher_1',
          name: 'Nguyễn Văn Teacher',
          email: 'teacher@lms-maritime.com',
          avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+Teacher&background=8b5cf6&color=ffffff&size=150'
        },
        students: 0,
        rating: 0,
        revenue: 0,
        createdAt: new Date('2024-09-20'),
        updatedAt: new Date('2024-09-20'),
        submittedAt: new Date('2024-09-20'),
        certificate: {
          type: 'STCW',
          description: 'Chứng chỉ STCW về kỹ thuật tàu biển'
        }
      },
      {
        id: 'course_admin_2',
        title: 'An toàn Hàng hải',
        description: 'Các quy định và thực hành an toàn trong ngành hàng hải',
        shortDescription: 'Quy định và thực hành an toàn hàng hải',
        category: 'safety',
        level: 'intermediate',
        duration: '32 giờ',
        price: 2000000,
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-14b1e3d71e51?w=300&h=200&fit=crop',
        status: 'approved',
        instructor: {
          id: 'teacher_1',
          name: 'Nguyễn Văn Teacher',
          email: 'teacher@lms-maritime.com',
          avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+Teacher&background=8b5cf6&color=ffffff&size=150'
        },
        students: 32,
        rating: 4.6,
        revenue: 64000000,
        createdAt: new Date('2024-09-15'),
        updatedAt: new Date('2024-09-18'),
        submittedAt: new Date('2024-09-15'),
        approvedAt: new Date('2024-09-16'),
        certificate: {
          type: 'IMO',
          description: 'Chứng chỉ IMO về an toàn hàng hải'
        }
      }
    ];
  }
}