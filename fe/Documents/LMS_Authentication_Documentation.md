# Phân Tích Chi Tiết Hệ Thống Authentication LMS Backend

Sau khi phân tích sâu dự án backend LMS (Learning Management System) Hàng Hải, tôi đã hoàn thành việc nghiên cứu chi tiết hệ thống xác thực. Dưới đây là tài liệu đầy đủ và chi tiết cho team frontend.

## 1. Tổng Quan Kiến Trúc Dự Án

### Công Nghệ Sử Dụng
- **Framework**: Spring Boot 3.5.6
- **Java Version**: 21
- **Database**: PostgreSQL với Flyway migrations
- **Security**: Spring Security + JWT (JJWT 0.12.3)
- **Documentation**: OpenAPI/Swagger
- **ORM**: Spring Data JPA
- **Password Encoding**: BCrypt

### Cấu Trúc Database
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 2. Hệ Thống Xác Thực (Authentication System)

### 2.1 Kiến Trúc Bảo Mật
- **JWT Tokens**: Access Token (24h) + Refresh Token (7 ngày)
- **Stateless Authentication**: Không sử dụng session
- **Role-based Access Control**: 3 roles (ADMIN, TEACHER, STUDENT)
- **CORS**: Cho phép tất cả origins với credentials

### 2.2 Các Component Chính

#### JwtService
- **Chức năng**: Tạo, validate và parse JWT tokens
- **Secret Key**: Cấu hình trong `application.yml`
- **Claims**: Subject (username), issuedAt, expiration

#### AuthenticationService
- **Chức năng**: Xử lý logic đăng ký, đăng nhập, refresh token
- **Validation**: Kiểm tra username/email tồn tại
- **Password**: Mã hóa BCrypt

#### JwtAuthenticationFilter
- **Chức năng**: Intercept requests, validate JWT từ Authorization header
- **Header Format**: `Bearer <token>`
- **UserDetails**: Load từ UserService

#### SecurityConfig
- **Public Endpoints**: `/api/v1/auth/**`, `/api/health/**`, Swagger UI
- **Protected Endpoints**: Role-based permissions
- **Session Policy**: STATELESS

## 3. API Endpoints Chi Tiết

### Base URL: `/api/v1/auth`

### 3.1 Đăng Ký (Register)
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "fullName": "string",
  "role": "STUDENT|TEACHER|ADMIN"
}
```

**Response (200 OK)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid-string",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "role": "STUDENT",
    "enabled": true
  }
}
```

**Validation Rules**:
- username: unique, max 50 chars, required
- email: unique, valid format, max 100 chars, required
- password: min 6 chars, required
- fullName: max 100 chars, required
- role: enum (STUDENT/TEACHER/ADMIN), default STUDENT

### 3.2 Đăng Nhập (Login)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response**: Same as register

### 3.3 Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}
```

**Response**: Same as register (new access token, same refresh token)

### 3.4 Lấy Thông Tin User Hiện Tại
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response (200 OK)**:
```json
{
  "data": {
    "id": "uuid-string",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "role": "STUDENT",
    "enabled": true
  }
}
```

### 3.5 Cập Nhật Profile
```http
PUT /api/v1/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "string",
  "email": "string"
}
```

**Response**: Same as `/me`

### 3.6 Thay Đổi Mật Khẩu
```http
PUT /api/v1/auth/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response (200 OK)**:
```json
{
  "data": "Mật khẩu đã được thay đổi thành công",
  "message": "Mật khẩu đã được thay đổi thành công"
}
```

### 3.7 Đăng Xuất
```http
POST /api/v1/auth/logout
```

**Response (200 OK)**: `"Đăng xuất thành công"`

## 4. Data Models & Types

### 4.1 User Entity (Java)
```java
public class User {
    private UUID id;
    private String username;      // unique, max 50
    private String email;         // unique, max 100
    private String password;      // encrypted
    private String fullName;      // max 100
    private Role role;           // enum
    private Boolean enabled;     // default true
    private Instant createdAt;
    private Instant updatedAt;
    private Set<Course> enrolledCourses;

    public enum Role {
        ADMIN("Quản trị viên"),
        TEACHER("Giảng viên"),
        STUDENT("Học viên");
    }
}
```

### 4.2 API Response Wrapper
```java
public class ApiResponse<T> {
    private T data;
    private PaginationInfo pagination;
    private String message;

    // Static factory methods: success(), error()
}
```

## 5. Error Handling

### HTTP Status Codes
- **200 OK**: Success
- **400 Bad Request**: Validation errors, duplicate data
- **401 Unauthorized**: Invalid credentials, expired token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found

### Error Response Format
```json
{
  "message": "Error description",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Email đã tồn tại"
    }
  ]
}
```

## 6. Frontend-Backend Type Unification

### 6.1 TypeScript Interfaces (Recommended)

```typescript
// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

// Core User Interface
export interface User {
  id: string;           // UUID as string
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  enabled: boolean;
  createdAt?: string;   // ISO date string
  updatedAt?: string;
}

// Authentication DTOs
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Profile Management
export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// Error Response
export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

### 6.2 Service Layer (Angular/React)

```typescript
// Auth Service Interface
export interface AuthService {
  login(credentials: LoginRequest): Observable<AuthenticationResponse>;
  register(userData: RegisterRequest): Observable<AuthenticationResponse>;
  refreshToken(refreshToken: string): Observable<AuthenticationResponse>;
  logout(): Observable<void>;
  getCurrentUser(): Observable<User>;
  updateProfile(profile: UpdateProfileRequest): Observable<User>;
  changePassword(passwordData: ChangePasswordRequest): Observable<string>;
}

// HTTP Interceptor for JWT
export interface JwtInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>;
  // Add Authorization header with Bearer token
}
```

### 6.3 State Management Types

```typescript
// Auth State
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth Actions (Redux/NgRx)
export enum AuthActionTypes {
  LOGIN_REQUEST = '[Auth] Login Request',
  LOGIN_SUCCESS = '[Auth] Login Success',
  LOGIN_FAILURE = '[Auth] Login Failure',
  LOGOUT = '[Auth] Logout',
  REFRESH_TOKEN = '[Auth] Refresh Token',
  UPDATE_PROFILE = '[Auth] Update Profile'
}
```

## 7. Implementation Recommendations

### 7.1 Frontend Architecture
1. **Service Layer**: Tạo AuthService để handle API calls
2. **Interceptors**: JWT interceptor cho Authorization headers
3. **Guards**: Route guards cho protected routes
4. **State Management**: Centralized auth state
5. **Error Handling**: Global error interceptor

### 7.2 Token Management
```typescript
// Token storage (localStorage/sessionStorage)
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}
```

### 7.3 Auto Token Refresh
```typescript
// Implement automatic token refresh before expiration
export class AuthService {
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  private refreshAccessToken(): Observable<string> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      return throwError('No refresh token available');
    }

    return this.http.post<AuthenticationResponse>('/api/v1/auth/refresh', { refreshToken })
      .pipe(
        map(response => {
          this.tokenService.setTokens(response.accessToken, response.refreshToken);
          return response.accessToken;
        })
      );
  }
}
```

## 8. Security Best Practices

### 8.1 Frontend Security
- **Token Storage**: localStorage cho persistence, sessionStorage cho session-only
- **HTTPS Only**: Luôn sử dụng HTTPS trong production
- **Token Expiration**: Handle token expiry gracefully
- **XSS Protection**: Sanitize user inputs
- **CSRF**: Không cần thiết với JWT stateless

### 8.2 API Security
- **Rate Limiting**: Implement rate limiting cho auth endpoints
- **Brute Force Protection**: Lock accounts sau multiple failed attempts
- **Password Policies**: Enforce strong passwords
- **Audit Logging**: Log authentication events

## 9. Testing Strategy

### 9.1 Unit Tests
- Test JWT token generation/validation
- Test password encoding/verification
- Test user registration/login logic

### 9.2 Integration Tests
- Test complete authentication flows
- Test protected endpoints
- Test token refresh mechanism

### 9.3 E2E Tests
- Test login/logout user journeys
- Test token expiration handling
- Test role-based access control

## 10. Deployment Considerations

### 10.1 Environment Variables
```yaml
# application-prod.yml
app:
  jwt:
    secret: ${JWT_SECRET:your-production-secret-key}
    expiration: 86400000      # 24 hours
    refresh-expiration: 604800000  # 7 days
```

### 10.2 CORS Configuration
```java
// Production CORS config
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("https://yourdomain.com"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

Tài liệu này cung cấp cái nhìn toàn diện về hệ thống authentication của backend LMS. Team frontend có thể sử dụng các TypeScript interfaces và recommendations để đảm bảo type safety và consistency giữa frontend và backend.