import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
  context?: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  private router = inject(Router);
  
  // Error state management
  private _errors = signal<AppError[]>([]);
  private _isLoading = signal<boolean>(false);
  
  // Readonly signals
  readonly errors = this._errors.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasErrors = signal(this._errors().length > 0);

  /**
   * Add a new error to the error list
   */
  addError(error: Omit<AppError, 'id' | 'timestamp'>): void {
    const newError: AppError = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      ...error
    };
    
    this._errors.update(errors => [...errors, newError]);

    // Auto-remove info messages after 5 seconds
    if (error.type === 'info') {
      setTimeout(() => this.removeError(newError.id), 5000);
    }

    const printable = (() => {
      try {
        return typeof newError.message === 'string' ? newError.message : JSON.stringify(newError.message);
      } catch {
        return String(newError.message);
      }
    })();
    console.error('🚨 App Error:', printable, newError);
  }

  /**
   * Remove an error by ID
   */
  removeError(errorId: string): void {
    this._errors.update(errors => errors.filter(error => error.id !== errorId));
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this._errors.set([]);
  }

  /**
   * Handle navigation errors
   */
  handleNavigationError(error: any, route: string): void {
    this.addError({
      message: `Không thể điều hướng đến ${route}. Vui lòng thử lại.`,
      type: 'error',
      context: 'navigation',
      action: {
        label: 'Thử lại',
        handler: () => this.router.navigate([route])
      }
    });
  }

  /**
   * Handle API errors
   */
  handleApiError(error: any, context: string): void {
    let message = 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.';
    let action = {
      label: 'Tải lại',
      handler: () => window.location.reload()
    };
    
    if (error.status === 404) {
      message = 'Không tìm thấy dữ liệu yêu cầu.';
    } else if (error.status === 403) {
      // Extract the Vietnamese error message from the backend
      const backendMessage = error?.error?.message || error?.original?.error?.message || '';
      if (backendMessage.includes('Bạn không có quyền truy cập tính năng này')) {
        message = 'Bạn không có quyền truy cập tính năng này. Vui lòng đăng ký khóa học để xem nội dung.';
        action = {
          label: 'Xem khóa học',
          handler: () => window.location.href = '/courses'
        };
      } else if (backendMessage.includes('403')) {
        message = 'Bạn không có quyền truy cập vào tính năng này. Vui lòng liên hệ quản trị viên để được cấp quyền.';
      } else {
        message = 'Bạn không có quyền truy cập vào tài nguyên này. Vui lòng kiểm tra quyền của bạn.';
      }
    } else if (error.status === 401) {
      message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      action = {
        label: 'Đăng nhập lại',
        handler: () => window.location.href = '/auth/login'
      };
    } else if (error.status === 500) {
      message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
    } else if (error.status === 0) {
      message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }
    
    this.addError({
      message,
      type: 'error',
      context,
      action
    });
  }

  /**
   * Handle form validation errors
   */
  handleValidationError(errors: any, formName: string): void {
    const errorMessages = Object.values(errors).flat();
    const message = `Lỗi xác thực trong ${formName}: ${errorMessages.join(', ')}`;
    
    this.addError({
      message,
      type: 'warning',
      context: 'validation'
    });
  }

  /**
   * Show success message - DISABLED để tránh popup
   */
  showSuccess(message: string, context?: string): void {
    // Vô hiệu hóa tất cả thông báo thành công để tránh popup
    // this.addError({
    //   message,
    //   type: 'info',
    //   context
    // });
  }

  /**
   * Show warning message - DISABLED để tránh popup
   */
  showWarning(message: string, context?: string): void {
    // Vô hiệu hóa tất cả thông báo cảnh báo để tránh popup
    // this.addError({
    //   message,
    //   type: 'warning',
    //   context
    // });
  }

  /**
   * Show info message - DISABLED để tránh popup
   */
  showInfo(message: string, context?: string): void {
    // Vô hiệu hóa tất cả thông báo thông tin để tránh popup
    // this.addError({
    //   message,
    //   type: 'info',
    //   context
    // });
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this._isLoading.set(isLoading);
  }

  /**
   * Handle async operations with error handling
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    context: string,
    successMessage?: string
  ): Promise<T | null> {
    this.setLoading(true);
    
    try {
      const result = await operation();
      
      if (successMessage) {
        this.showSuccess(successMessage, context);
      }
      
      return result;
    } catch (error) {
      this.handleApiError(error, context);
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}