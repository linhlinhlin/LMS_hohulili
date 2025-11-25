# Design Document - Enhanced Admin System

## Overview

This design document outlines the technical architecture and implementation approach for the Enhanced Admin System. The system will provide comprehensive administrative capabilities for the Maritime LMS, including advanced user management, real-time analytics, system administration, and bulk operations.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Angular)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   User Mgmt  │  │  Analytics   │  │   Settings   │     │
│  │  Components  │  │  Dashboard   │  │    Panel     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Services Layer (Signals + RxJS)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         API Client (HTTP + Error Handling)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Spring Boot)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Controllers  │  │   Services   │  │ Repositories │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Security (JWT + Role-Based Access)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Database   │
                    │  (PostgreSQL)│
                    └──────────────┘
```

### Technology Stack

**Frontend:**
- Angular 18+ with Signals
- TailwindCSS for styling
- RxJS for reactive programming
- XLSX library for Excel operations
- Chart.js for analytics visualization

**Backend:**
- Spring Boot 3.x
- Spring Security with JWT
- Spring Data JPA
- PostgreSQL database
- Apache POI for Excel processing

## Components and Interfaces

### 1. Enhanced User Management Module

#### 1.1 User Management Service

```typescript
interface UserManagementService {
  // State Management (Signals)
  users: Signal<AdminUser[]>
  isLoading: Signal<boolean>
  pagination: Signal<PaginationInfo | null>
  bulkImportProgress: Signal<BulkImportProgress>
  
  // Computed Stats
  totalUsers: Signal<number>
  totalTeachers: Signal<number>
  totalStudents: Signal<number>
  totalAdmins: Signal<number>
  activeUsers: Signal<number>
  
  // CRUD Operations
  getUsers(page: number, limit: number, search?: string): Promise<UsersResponse>
  getUserById(userId: string): Promise<AdminUser>
  createUser(userData: Partial<AdminUser>): Promise<AdminUser>
  updateUser(userId: string, updates: Partial<AdminUser>): Promise<AdminUser>
  deleteUser(userId: string): Promise<void>
  toggleUserStatus(userId: string): Promise<void>
  
  // Bulk Operations
  bulkImportUsers(file: File, defaultRole: UserRole): Promise<BulkImportResult>
  downloadExcelTemplate(): void
  resetBulkImportProgress(): void
}
```

#### 1.2 User Management Component

**Features:**
- Paginated user list with advanced filtering
- Real-time search across name, email, student ID
- Role-based filtering (admin, teacher, student)
- Status filtering (active/inactive)
- Inline user actions (edit, toggle status, delete)
- Modal-based create/edit forms
- Bulk import with Excel file upload
- Progress tracking for bulk operations
- Responsive design for mobile/tablet/desktop

**UI Components:**
- Stats cards showing user counts by role
- Search and filter bar
- Data table with sortable columns
- Pagination controls
- Create user modal
- Edit user modal
- Bulk import modal with progress bar
- Empty state for no results

### 2. Advanced Analytics Dashboard

#### 2.1 Analytics Service

```typescript
interface AnalyticsService {
  // State Management
  analytics: Signal<SystemAnalytics>
  isLoading: Signal<boolean>
  dateRange: Signal<DateRange>
  
  // Data Fetching
  getSystemAnalytics(dateRange?: DateRange): Promise<SystemAnalytics>
  getUserGrowthData(): Promise<GrowthData[]>
  getCourseStatistics(): Promise<CourseStats>
  getRevenueData(): Promise<RevenueData[]>
  
  // Export Functions
  exportAnalyticsPDF(): Promise<void>
  exportAnalyticsExcel(): Promise<void>
}
```

#### 2.2 Analytics Dashboard Component

**Features:**
- Real-time metrics display
- Interactive charts (line, bar, pie, doughnut)
- Date range selector
- Auto-refresh every 30 seconds
- Export to PDF/Excel
- Drill-down capabilities
- Responsive grid layout

**Chart Types:**
- User growth trend (line chart)
- Course distribution by status (pie chart)
- Revenue over time (bar chart)
- Active users timeline (area chart)
- Enrollment statistics (doughnut chart)

### 3. System Administration Panel

#### 3.1 Settings Service

```typescript
interface SettingsService {
  // State Management
  settings: Signal<SystemSettings>
  isLoading: Signal<boolean>
  isDirty: Signal<boolean>
  
  // Settings Operations
  getSettings(): Promise<SystemSettings>
  updateSettings(settings: Partial<SystemSettings>): Promise<void>
  resetToDefaults(): Promise<void>
  
  // Maintenance Mode
  enableMaintenanceMode(message: string): Promise<void>
  disableMaintenanceMode(): Promise<void>
  
  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>
  updateEmailTemplate(id: string, template: EmailTemplate): Promise<void>
  previewEmailTemplate(template: EmailTemplate): string
}
```

#### 3.2 System Settings Component

**Features:**
- Tabbed interface for different setting categories
- General settings (site name, description, registration)
- Email configuration (SMTP settings)
- Payment gateway configuration
- Security settings (password policies, 2FA)
- Maintenance mode toggle
- Email template editor with preview
- Form validation and error handling
- Confirmation dialogs for critical changes

### 4. Course Content Moderation

#### 4.1 Moderation Service

```typescript
interface ModerationService {
  // State Management
  pendingCourses: Signal<PendingCourse[]>
  isLoading: Signal<boolean>
  
  // Moderation Operations
  getPendingCourses(filters?: ModerationFilters): Promise<PendingCourse[]>
  getCourseDetails(courseId: string): Promise<CourseDetails>
  approveCourse(courseId: string, notes?: string): Promise<void>
  rejectCourse(courseId: string, reason: string): Promise<void>
  requestChanges(courseId: string, feedback: string): Promise<void>
  
  // Batch Operations
  batchApproveCourses(courseIds: string[]): Promise<BatchResult>
  batchRejectCourses(courseIds: string[], reason: string): Promise<BatchResult>
}
```

#### 4.2 Course Moderation Component

**Features:**
- List of pending courses with filters
- Course preview with content structure
- Approval/rejection workflow
- Detailed feedback system
- Batch approval functionality
- Content guidelines checker
- Instructor communication
- Moderation history tracking

## Data Models

### User Models

```typescript
interface AdminUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  department?: string
  studentId?: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  lastLogin: Date
  loginCount: number
  coursesCreated?: number
  coursesEnrolled?: number
  totalSpent?: number
  permissions: string[]
}

enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

interface CreateUserRequest {
  username: string
  email: string
  password: string
  fullName: string
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'
}

interface UpdateUserRequest {
  email?: string
  fullName?: string
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT'
  enabled?: boolean
}
```

### Analytics Models

```typescript
interface SystemAnalytics {
  totalUsers: number
  totalTeachers: number
  totalStudents: number
  totalAdmins: number
  totalCourses: number
  approvedCourses: number
  pendingCourses: number
  rejectedCourses: number
  totalEnrollments: number
  totalRevenue: number
  monthlyRevenue: number
  activeUsers: number
  
  systemHealth: {
    database: HealthStatus
    api: HealthStatus
    storage: HealthStatus
    email: HealthStatus
  }
  
  userGrowth: {
    thisMonth: number
    lastMonth: number
    growthRate: number
  }
  
  revenueStats: {
    thisMonth: number
    lastMonth: number
    growthRate: number
  }
}

type HealthStatus = 'healthy' | 'warning' | 'error'
```

### Settings Models

```typescript
interface SystemSettings {
  general: {
    siteName: string
    siteDescription: string
    maintenanceMode: boolean
    allowRegistration: boolean
    requireEmailVerification: boolean
  }
  
  email: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    fromEmail: string
    fromName: string
  }
  
  payment: {
    stripePublicKey: string
    stripeSecretKey: string
    paypalClientId: string
    paypalClientSecret: string
    currency: string
  }
  
  security: {
    sessionTimeout: number
    maxLoginAttempts: number
    passwordMinLength: number
    requireTwoFactor: boolean
  }
}
```

### Bulk Import Models

```typescript
interface BulkImportProgress {
  isImporting: boolean
  progress: number
  currentStep: string
  result?: BulkImportResult
}

interface BulkImportResult {
  totalRows: number
  successfulImports: number
  failedImports: number
  errors: string[]
  importedUsers: AdminUser[]
}
```

## Error Handling

### Frontend Error Handling Strategy

1. **HTTP Error Interceptor**
   - Catch all HTTP errors
   - Transform to user-friendly messages
   - Handle authentication errors (401, 403)
   - Retry failed requests (configurable)

2. **Service-Level Error Handling**
   - Try-catch blocks for async operations
   - Error logging to console
   - User notification via ErrorHandlingService
   - Graceful degradation

3. **Component-Level Error Handling**
   - Display error messages in UI
   - Provide retry mechanisms
   - Show fallback content
   - Maintain user context

### Error Types and Responses

```typescript
interface ErrorResponse {
  message: string
  type: 'error' | 'warning' | 'info'
  context: string
  details?: any
}

// Common Error Scenarios
- Network errors: "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
- Validation errors: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."
- Permission errors: "Bạn không có quyền thực hiện thao tác này."
- Not found errors: "Không tìm thấy dữ liệu yêu cầu."
- Server errors: "Đã xảy ra lỗi. Vui lòng thử lại sau."
```

## Testing Strategy

### Unit Testing

**Frontend (Jasmine + Karma):**
- Service methods testing
- Component logic testing
- Signal state management testing
- Computed values testing
- Error handling testing

**Backend (JUnit + Mockito):**
- Service layer testing
- Repository testing
- Controller testing
- Security testing
- Validation testing

### Integration Testing

**Frontend:**
- Component integration with services
- API client integration
- Routing and navigation
- Form validation flows

**Backend:**
- API endpoint testing
- Database integration
- Security integration
- File upload/download

### E2E Testing (Playwright)

- User management workflows
- Bulk import process
- Analytics dashboard interaction
- Settings configuration
- Course moderation workflow

### Test Coverage Goals

- Unit tests: 80% coverage
- Integration tests: 70% coverage
- E2E tests: Critical user paths

## Security Considerations

### Authentication & Authorization

1. **JWT-Based Authentication**
   - Access token (short-lived, 15 minutes)
   - Refresh token (long-lived, 7 days)
   - Token rotation on refresh

2. **Role-Based Access Control (RBAC)**
   - Admin: Full system access
   - Teacher: Course management, student view
   - Student: Limited read access

3. **Permission Checks**
   - Frontend: Route guards, UI element hiding
   - Backend: Method-level security annotations

### Data Protection

1. **Input Validation**
   - Frontend: Form validation
   - Backend: DTO validation with annotations
   - SQL injection prevention (parameterized queries)
   - XSS prevention (sanitization)

2. **Sensitive Data Handling**
   - Password hashing (BCrypt)
   - Encrypted storage for sensitive settings
   - HTTPS-only communication
   - Secure cookie flags

3. **File Upload Security**
   - File type validation
   - File size limits
   - Virus scanning (optional)
   - Secure file storage

## Performance Optimization

### Frontend Optimization

1. **Lazy Loading**
   - Route-based code splitting
   - Component lazy loading
   - Image lazy loading

2. **State Management**
   - Signals for reactive state
   - Computed values for derived data
   - Minimal re-renders

3. **Caching Strategy**
   - HTTP response caching
   - Local storage for user preferences
   - Session storage for temporary data

### Backend Optimization

1. **Database Optimization**
   - Proper indexing
   - Query optimization
   - Connection pooling
   - Pagination for large datasets

2. **Caching**
   - Redis for session storage
   - Cache frequently accessed data
   - Cache invalidation strategy

3. **API Optimization**
   - Response compression
   - Batch operations
   - Async processing for heavy tasks

## Deployment Strategy

### Development Environment
- Local development with hot reload
- Mock data for testing
- Debug logging enabled

### Staging Environment
- Production-like configuration
- Integration testing
- Performance testing
- Security scanning

### Production Environment
- Load balancing
- Auto-scaling
- Monitoring and alerting
- Backup and disaster recovery

## Monitoring and Logging

### Frontend Monitoring
- Error tracking (Sentry)
- Performance monitoring
- User analytics
- Console error logging

### Backend Monitoring
- Application logs (Logback)
- Performance metrics (Micrometer)
- Health checks
- Database query monitoring

### Alerts
- System downtime
- High error rates
- Performance degradation
- Security incidents

## Future Enhancements

1. **Advanced Analytics**
   - Predictive analytics
   - Machine learning insights
   - Custom report builder

2. **Mobile Admin App**
   - Native iOS/Android apps
   - Push notifications
   - Offline capabilities

3. **Automation**
   - Automated user provisioning
   - Scheduled reports
   - Auto-moderation with AI

4. **Integration**
   - Third-party LMS integration
   - SSO with external providers
   - API for external systems
