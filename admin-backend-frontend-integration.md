# Admin Backend-Frontend Integration Guide

## Tổng quan

Hướng dẫn này cung cấp tài liệu chi tiết về cách frontend và backend kết nối trong hệ thống admin của LMS Maritime.

## 1. Cấu trúc API Backend

### AdminController.java
- **Base URL**: `/api/v1/admin`
- **Authentication**: JWT Bearer Token
- **Authorization**: Chỉ dành cho role ADMIN

#### Endpoints chính:

```java
// Phê duyệt khóa học
@PatchMapping("/courses/{courseId}/approve")
public ResponseEntity<ApiResponse<String>> approveCourse(@PathVariable UUID courseId)

// Từ chối khóa học
@PatchMapping("/courses/{courseId}/reject")
public ResponseEntity<ApiResponse<String>> rejectCourse(@PathVariable UUID courseId)

// Lấy thống kê hệ thống
@GetMapping("/analytics")
public ResponseEntity<ApiResponse<SystemAnalytics>> getSystemAnalytics()

// Lấy danh sách khóa học
@GetMapping("/courses/all")
public ResponseEntity<ApiResponse<Page<AdminCourseSummary>>> getAllCourses()
```

## 2. Frontend API Integration

### Environment Configuration
```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};

// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.lms-maritime.com/api/v1'
};
```

### API Client Service
```typescript
@Injectable({
  providedIn: 'root'
})
export class ApiClient {
  private readonly baseUrl = environment.apiUrl;

  get<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options);
  }

  post<T>(endpoint: string, data: any, options?: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, options);
  }
}
```

### Admin Services

#### AdminService
```typescript
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private apiClient: ApiClient) {}

  getSystemAnalytics(): Observable<SystemAnalytics> {
    return this.apiClient.get<SystemAnalytics>(ADMIN_ENDPOINTS.ANALYTICS);
  }

  approveCourse(courseId: string): Observable<{ message: string }> {
    return this.apiClient.patchWithResponse<string>(
      ADMIN_ENDPOINTS.APPROVE_COURSE(courseId), {}
    );
  }
}
```

#### UserManagementService
```typescript
@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  constructor(private apiClient: ApiClient) {}

  getUsers(params: any = {}): Observable<{ data: UserSummary[]; pagination: any }> {
    return this.apiClient.getWithResponse<UserSummary[]>(
      ADMIN_ENDPOINTS.USERS, { params }
    );
  }

  createUser(userData: CreateUserRequest): Observable<{ data: UserDetail }> {
    return this.apiClient.postWithResponse<UserDetail>(
      ADMIN_ENDPOINTS.CREATE_USER, userData
    );
  }
}
```

## 3. Authentication & Authorization

### JWT Token Management
```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials).pipe(
      tap(response => {
        this.setTokens(response.accessToken, response.refreshToken);
        this.setUser(response.user);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
```

### HTTP Interceptors
```typescript
// Auth Interceptor
export const authInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};

// Error Interceptor
export const errorInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Handle unauthorized
      }
      return throwError(error);
    })
  );
};
```

## 4. Data Flow Architecture

### Admin Analytics Component
```typescript
@Component({
  selector: 'app-admin-analytics',
  template: `
    <div *ngIf="analytics()">
      <h1>Tổng người dùng: {{ analytics().totalUsers }}</h1>
      <h1>Tổng khóa học: {{ analytics().totalCourses }}</h1>
    </div>
  `
})
export class AdminAnalyticsComponent implements OnInit {
  analytics = signal<SystemAnalytics | null>(null);

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getSystemAnalytics().subscribe({
      next: (data) => this.analytics.set(data),
      error: (error) => console.error('Failed to load analytics:', error)
    });
  }
}
```

### User Management Component
```typescript
@Component({
  selector: 'app-user-management',
  template: `
    <div class="user-list">
      <div *ngFor="let user of users()">
        <span>{{ user.name }}</span>
        <span>{{ user.email }}</span>
        <button (click)="deleteUser(user.id)">Xóa</button>
      </div>
    </div>
  `
})
export class UserManagementComponent implements OnInit {
  users = signal<UserSummary[]>([]);

  constructor(private userService: UserManagementService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response) => this.users.set(response.data),
      error: (error) => console.error('Failed to load users:', error)
    });
  }

  deleteUser(userId: string): void {
    this.userService.deleteUser(userId).subscribe({
      next: () => this.loadUsers(),
      error: (error) => console.error('Failed to delete user:', error)
    });
  }
}
```

## 5. Error Handling

### Global Error Handling
```typescript
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  private errorSubject = new Subject<ErrorInfo>();

  showError(message: string, context?: string): void {
    this.errorSubject.next({ message, type: 'error', context });
  }

  showSuccess(message: string, context?: string): void {
    this.errorSubject.next({ message, type: 'success', context });
  }
}
```

## 6. State Management

### Reactive State with Signals
```typescript
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private _users = signal<AdminUser[]>([]);
  private _courses = signal<AdminCourse[]>([]);
  private _analytics = signal<SystemAnalytics | null>(null);

  readonly users = this._users.asReadonly();
  readonly courses = this._courses.asReadonly();
  readonly analytics = this._analytics.asReadonly();

  readonly totalUsers = computed(() => this._users().length);
  readonly pendingCourses = computed(() =>
    this._courses().filter(course => course.status === 'pending').length
  );
}
```

## 7. API Response Format

### Standard API Response
```typescript
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: PaginationInfo;
  timestamp: string;
}

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  first: boolean;
  last: boolean;
}
```

## 8. Testing Strategy

### Unit Tests
```typescript
describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService]
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should get system analytics', () => {
    const mockAnalytics: SystemAnalytics = { /* mock data */ };

    service.getSystemAnalytics().subscribe(analytics => {
      expect(analytics).toEqual(mockAnalytics);
    });

    const req = httpMock.expectOne('/api/v1/admin/analytics');
    expect(req.request.method).toBe('GET');
    req.flush(mockAnalytics);
  });
});
```

## 9. Performance Optimization

### Caching Strategy
```typescript
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, any>();

  get<T>(key: string): T | null {
    return this.cache.get(key) || null;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, value);
    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl);
    }
  }
}
```

## 10. Deployment Configuration

### Docker Configuration
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --prod

FROM nginx:alpine
COPY --from=build /app/dist/lms-angular /usr/share/nginx/html
EXPOSE 80
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name api.lms-maritime.com;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

## 11. Monitoring & Logging

### API Monitoring
```typescript
@Injectable({
  providedIn: 'root'
})
export class ApiMonitoringService {
  private requestCount = 0;
  private errorCount = 0;

  logRequest(endpoint: string, method: string, duration: number): void {
    console.log(`API Request: ${method} ${endpoint} - ${duration}ms`);
    this.requestCount++;
  }

  logError(endpoint: string, error: any): void {
    console.error(`API Error: ${endpoint}`, error);
    this.errorCount++;
  }
}
```

## 12. Security Considerations

### CORS Configuration
```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList("http://localhost:4200", "https://lms-maritime.com"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
```

### Rate Limiting
```java
@Configuration
public class RateLimitConfig {
    @Bean
    public RateLimiter rateLimiter() {
        return RateLimiter.create(100.0); // 100 requests per second
    }
}
```

## 13. Database Schema

### Key Tables for Admin
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    teacher_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course approvals table
CREATE TABLE course_approvals (
    id UUID PRIMARY KEY,
    course_id UUID REFERENCES courses(id),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'approved' or 'rejected'
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 14. Migration Strategy

### From Mock Data to Real API
```typescript
// Before: Mock data
private getMockUsers(): AdminUser[] {
  return [/* mock data */];
}

// After: Real API
async getUsers(): Promise<AdminUser[]> {
  try {
    const users = await this.fetchUsersFromAPI();
    this._users.set(users);
    return users;
  } catch (error) {
    console.warn('API unavailable, using mock data:', error);
    return this._users();
  }
}
```

## 15. Best Practices

### Error Handling
- Always handle API errors gracefully
- Provide meaningful error messages to users
- Log errors for debugging
- Implement retry logic for transient failures

### Performance
- Use lazy loading for components
- Implement caching for frequently accessed data
- Optimize bundle size
- Use pagination for large datasets

### Security
- Validate all input data
- Use HTTPS in production
- Implement proper authentication
- Sanitize user inputs
- Use environment variables for sensitive data

### Testing
- Write unit tests for services
- Test error scenarios
- Mock API calls in tests
- Test authentication flows
- Verify authorization rules

### Documentation
- Keep API documentation up to date
- Document component interfaces
- Provide usage examples
- Maintain changelog

This guide provides a comprehensive overview of the admin backend-frontend integration. For specific implementation details, refer to the individual service files and component implementations.