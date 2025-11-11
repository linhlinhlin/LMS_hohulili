# 🎯 Hướng Dẫn Xây Dựng Chức Năng Admin - LMS Hàng Hải

## 📋 Tổng Quan

Tài liệu này cung cấp hướng dẫn chi tiết để xây dựng chức năng Admin từ đầu cho hệ thống LMS Hàng Hải, dựa trên kiến trúc hiện tại của dự án.

## 🏗️ Kiến Trúc Tổng Quan

### Backend Architecture
```
backend-lms-postgres/
├── controller/
│   ├── AdminController.java          # API quản trị chính
│   ├── AuthController.java           # Xác thực người dùng
│   ├── UserController.java           # Quản lý người dùng
│   └── FileUploadController.java     # Upload file
├── service/
│   ├── AdminService.java             # Logic nghiệp vụ admin
│   ├── AuthenticationService.java    # Xác thực & JWT
│   ├── UserService.java              # Quản lý user
│   └── FileUploadService.java        # Upload file
├── entity/
│   ├── User.java                     # Entity người dùng
│   ├── Course.java                   # Entity khóa học
│   └── CourseEnrollment.java         # Entity đăng ký
├── repository/
│   ├── UserRepository.java           # Data access user
│   ├── CourseRepository.java         # Data access course
│   └── AdminRepository.java          # Data access admin (nếu cần)
└── config/
    ├── SecurityConfig.java           # Cấu hình bảo mật
    └── GlobalExceptionHandler.java   # Xử lý lỗi
```

### Frontend Architecture
```
lms-angular/
├── features/admin/
│   ├── domain/                       # Business logic
│   ├── application/                  # Use cases
│   ├── infrastructure/               # External services
│   └── presentation/                 # UI components
├── api/
│   ├── client/api-client.ts          # HTTP client
│   ├── endpoints/auth.endpoints.ts   # API endpoints
│   └── interceptors/                 # HTTP interceptors
└── core/
    ├── guards/role.guard.ts          # Route guards
    └── services/auth.service.ts      # Auth service
```

## 🗄️ Cơ Sở Dữ Liệu - Bảng Liên Quan Admin

### 1. Bảng `users` - Quản Lý Người Dùng
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    department VARCHAR(100),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Chức năng Admin:**
- ✅ CRUD người dùng (tạo, đọc, cập nhật, xóa)
- ✅ Thay đổi vai trò (role)
- ✅ Kích hoạt/vô hiệu hóa tài khoản
- ✅ Thống kê theo vai trò

### 2. Bảng `courses` - Quản Lý Khóa Học
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
    teacher_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Chức năng Admin:**
- ✅ Duyệt/từ chối khóa học chờ duyệt
- ✅ Xem tất cả khóa học trong hệ thống
- ✅ Thống kê khóa học theo trạng thái
- ✅ Xóa khóa học (chỉ khóa học chưa xuất bản)

### 3. Bảng `course_enrollments` - Đăng Ký Khóa Học
```sql
CREATE TABLE course_enrollments (
    student_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id)
);
```

**Chức năng Admin:**
- ✅ Thống kê số học viên đăng ký
- ✅ Giám sát tiến độ học tập

### 4. Bảng `assignments` - Bài Tập
```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Chức năng Admin:**
- ✅ Thống kê số bài tập trong hệ thống
- ✅ Giám sát nộp bài

### 5. Bảng `assignment_submissions` - Nộp Bài
```sql
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id),
    student_id UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade DECIMAL(5,2),
    feedback TEXT
);
```

**Chức năng Admin:**
- ✅ Thống kê tỷ lệ nộp bài
- ✅ Giám sát chấm điểm

### 6. Bảng `password_reset_tokens` - Reset Mật Khẩu
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    otp_code VARCHAR(6) NOT NULL,
    email VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Chức năng Admin:**
- ✅ Giám sát bảo mật hệ thống

## 🔐 Bảo Mật & Phân Quyền

### JWT Authentication
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

### Role-based Access Control
```java
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    // Chỉ Admin mới truy cập được
}
```

## 🚀 API Endpoints - Admin

### Authentication APIs
```java
// POST /api/v1/auth/register - Đăng ký
// POST /api/v1/auth/login - Đăng nhập
// POST /api/v1/auth/logout - Đăng xuất
// GET /api/v1/auth/me - Thông tin user hiện tại
// PUT /api/v1/auth/profile - Cập nhật profile
// PUT /api/v1/auth/password - Đổi mật khẩu
```

### Admin Management APIs
```java
// GET /api/v1/admin/courses/pending - Danh sách khóa học chờ duyệt
// PATCH /api/v1/admin/courses/{id}/approve - Duyệt khóa học
// PATCH /api/v1/admin/courses/{id}/reject - Từ chối khóa học
// GET /api/v1/admin/analytics - Thống kê hệ thống
// GET /api/v1/admin/courses/all - Tất cả khóa học
// GET /api/v1/users - Danh sách người dùng
// POST /api/v1/users - Tạo người dùng
// PUT /api/v1/users/{id} - Cập nhật người dùng
// DELETE /api/v1/users/{id} - Xóa người dùng
```

### File Upload APIs
```java
// POST /api/v1/uploads/signed-url - Tạo signed URL upload
// POST /api/v1/uploads/validate - Xác thực upload
// DELETE /api/v1/uploads/file - Xóa file
```

## 📊 Thống Kê & Phân Tích

### System Analytics Structure
```java
public class SystemAnalytics {
    private long totalUsers;
    private long totalTeachers;
    private long totalStudents;
    private long totalAdmins;
    private long totalCourses;
    private long approvedCourses;
    private long pendingCourses;
    private long rejectedCourses;
    private long draftCourses;
    private long totalAssignments;
    private long totalSubmissions;
    private Map<String, Long> coursesByStatus;
    private Map<String, Long> usersByRole;
    private Map<String, Long> enrollmentsByMonth;
}
```

### Analytics Query Examples
```java
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") User.Role role);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :startDate")
    long countNewUsersSince(@Param("startDate") Instant startDate);
}
```

## 🎨 Frontend Implementation

### Admin Layout Component
```typescript
@Component({
  selector: 'app-admin-layout',
  template: `
    <div class="admin-layout">
      <app-admin-sidebar></app-admin-sidebar>
      <div class="main-content">
        <app-admin-header></app-admin-header>
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AdminLayoutComponent implements OnInit {
  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Check admin role
    if (!this.authService.hasRole('ADMIN')) {
      this.router.navigate(['/unauthorized']);
    }
  }
}
```

### Admin Dashboard Component
```typescript
@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="dashboard">
      <div class="stats-grid">
        <div class="stat-card" *ngFor="let stat of stats">
          <h3>{{ stat.title }}</h3>
          <p class="value">{{ stat.value }}</p>
        </div>
      </div>

      <div class="charts-container">
        <app-users-chart [data]="usersChartData"></app-users-chart>
        <app-courses-chart [data]="coursesChartData"></app-courses-chart>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  stats: StatCard[] = [];
  usersChartData: any;
  coursesChartData: any;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.adminService.getAnalytics().subscribe({
      next: (data) => {
        this.stats = this.transformToStats(data);
        this.usersChartData = this.transformUsersData(data);
        this.coursesChartData = this.transformCoursesData(data);
      }
    });
  }
}
```

### API Client Service
```typescript
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private apiClient: ApiClient) {}

  getAnalytics(): Observable<SystemAnalytics> {
    return this.apiClient.get<SystemAnalytics>('/admin/analytics');
  }

  getPendingCourses(params: any): Observable<Page<CourseSummary>> {
    return this.apiClient.get<Page<CourseSummary>>('/admin/courses/pending', { params });
  }

  approveCourse(courseId: string): Observable<ApiResponse<string>> {
    return this.apiClient.patch<ApiResponse<string>>(`/admin/courses/${courseId}/approve`, {});
  }

  rejectCourse(courseId: string, reason: string): Observable<ApiResponse<string>> {
    return this.apiClient.patch<ApiResponse<string>>(`/admin/courses/${courseId}/reject`, { reason });
  }

  getUsers(params: any): Observable<Page<UserSummary>> {
    return this.apiClient.get<Page<UserSummary>>('/users', { params });
  }

  createUser(userData: CreateUserRequest): Observable<ApiResponse<UserDetail>> {
    return this.apiClient.postWithResponse<UserDetail>('/users', userData);
  }

  updateUser(userId: string, userData: UpdateUserRequest): Observable<ApiResponse<UserDetail>> {
    return this.apiClient.putWithResponse<UserDetail>(`/users/${userId}`, userData);
  }

  deleteUser(userId: string): Observable<ApiResponse<string>> {
    return this.apiClient.deleteWithResponse<string>(`/users/${userId}`);
  }
}
```

## 🔄 Luồng Xử Lý Chính

### 1. Đăng Nhập Admin
```
Frontend Login Form → POST /auth/login → JWT Token → Store Token → Redirect to Admin Dashboard
```

### 2. Duyệt Khóa Học
```
Admin Dashboard → GET /admin/courses/pending → Hiển thị danh sách → Click Approve → PATCH /admin/courses/{id}/approve → Update UI
```

### 3. Quản Lý Người Dùng
```
User Management Page → GET /users → Hiển thị danh sách → CRUD Operations → API Calls → Update UI
```

### 4. Xem Thống Kê
```
Analytics Page → GET /admin/analytics → Process Data → Render Charts → Auto Refresh
```

## 🧪 Testing Strategy

### Unit Tests
```java
@SpringBootTest
class AdminServiceTest {

    @Autowired
    private AdminService adminService;

    @Test
    void shouldGetSystemAnalytics() {
        Map<String, Object> analytics = adminService.getAnalytics();

        assertThat(analytics).isNotNull();
        assertThat(analytics.get("totalUsers")).isNotNull();
    }
}
```

### Integration Tests
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AdminControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldGetPendingCourses() {
        ResponseEntity<Page> response = restTemplate
            .withBasicAuth("admin", "password")
            .getForEntity("/api/v1/admin/courses/pending", Page.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

## 🚀 Deployment & Production

### Environment Variables
```bash
# Database
DB_URL=jdbc:postgresql://localhost:5432/lms_prod
DB_USERNAME=lms_prod
DB_PASSWORD=secure_password

# JWT
JWT_SECRET=your-production-jwt-secret-here
JWT_EXPIRATION=86400000

# File Upload
CLOUD_STORAGE_BUCKET=your-bucket-name
CLOUD_STORAGE_KEY=your-service-account-key
```

### Docker Configuration
```dockerfile
FROM openjdk:21-jdk-slim
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]
```

## 📝 Best Practices

### Backend
1. **Validation**: Sử dụng Bean Validation cho tất cả input
2. **Error Handling**: Centralized error handling với GlobalExceptionHandler
3. **Security**: JWT tokens, role-based access control
4. **Pagination**: Spring Data Pageable cho large datasets
5. **Caching**: Redis cache cho analytics data

### Frontend
1. **State Management**: Signals cho reactive state
2. **Error Handling**: Global error interceptor
3. **Loading States**: Skeleton loaders và loading indicators
4. **Responsive Design**: Mobile-first approach
5. **Performance**: Lazy loading, caching, virtualization

### Database
1. **Indexing**: Index cho search queries
2. **Constraints**: Foreign key constraints, check constraints
3. **Migrations**: Flyway cho database versioning
4. **Backup**: Regular automated backups

## 🔧 Troubleshooting

### Common Issues
1. **JWT Token Expired**: Implement refresh token mechanism
2. **Role Permission Denied**: Check @PreAuthorize annotations
3. **Database Connection**: Verify connection string và credentials
4. **File Upload Failed**: Check file size limits và permissions

### Monitoring
1. **Application Metrics**: Spring Boot Actuator
2. **Database Monitoring**: Connection pools, slow queries
3. **Error Tracking**: Centralized logging
4. **Performance**: Response times, throughput

---

*Tài liệu này cung cấp blueprint hoàn chỉnh để xây dựng chức năng Admin từ đầu. Hãy follow theo từng section một cách tuần tự để đảm bảo implementation quality.*