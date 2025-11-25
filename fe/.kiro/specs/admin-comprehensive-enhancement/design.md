# Design Document - Admin Portal Comprehensive Enhancement

## Overview

Tài liệu này mô tả chi tiết kiến trúc, design patterns, và implementation approach cho Admin Portal Enhancement. Design này tuân thủ DDD principles, clean architecture, và đồng bộ hoàn toàn với Student/Teacher portals đã được nâng cấp theo Coursera style.

---

## Design Principles

### 1. **DDD Architecture First**
- Clear separation between Infrastructure và Presentation layers
- Domain models không chứa UI logic
- Services chứa business logic, không chứa UI concerns
- Components chỉ orchestrate và display, không gọi API trực tiếp

### 2. **Coursera-Inspired Professional Design**
- Clean, minimal, spacious layouts
- Consistent color palette và typography
- Professional SVG icons (NO emoji)
- Subtle shadows và smooth transitions
- Clear visual hierarchy

### 3. **Component Reusability**
- Build once, use everywhere
- Shared components library
- Consistent props interface
- Flexible và extensible

### 4. **Performance & Accessibility**
- OnPush change detection
- Lazy loading
- WCAG AA compliance
- Keyboard navigation
- Screen reader support

### 5. **Mobile-First Responsive**
- Responsive grid layouts
- Touch-friendly targets (44x44px)
- Adaptive navigation
- Optimized for all screen sizes

---

## Architecture

### High-Level Structure

```
src/app/features/admin/
├── infrastructure/
│   └── services/
│       ├── admin.service.ts (✅ Existing - Keep)
│       └── user-management.service.ts (✅ Existing - Keep)
├── presentation/
│   ├── components/
│   │   ├── admin-layout-simple.component.ts (✅ Enhanced)
│   │   ├── dashboard/
│   │   │   ├── admin-dashboard.component.ts (✅ Enhanced)
│   │   │   ├── admin-dashboard.component.html (NEW)
│   │   │   ├── admin-dashboard.component.scss (NEW)
│   │   │   └── components/
│   │   │       ├── kpi-card.component.ts (NEW)
│   │   │       ├── quick-actions.component.ts (NEW)
│   │   │       ├── system-status.component.ts (NEW)
│   │   │       └── activity-feed.component.ts (NEW)
│   │   ├── user-management/
│   │   │   ├── user-management.component.ts (✅ Refactored)
│   │   │   ├── user-management.component.html (NEW - Extracted)
│   │   │   ├── user-management.component.scss (NEW - Extracted)
│   │   │   └── components/
│   │   │       ├── user-table.component.ts (NEW)
│   │   │       ├── user-form-modal.component.ts (NEW)
│   │   │       └── bulk-import-modal.component.ts (NEW)
│   │   ├── course-management/
│   │   │   ├── course-management.component.ts (✅ Enhanced)
│   │   │   ├── course-management.component.html (NEW)
│   │   │   ├── course-management.component.scss (NEW)
│   │   │   └── components/
│   │   │       ├── course-grid.component.ts (NEW)
│   │   │       ├── course-card.component.ts (NEW)
│   │   │       └── reject-modal.component.ts (NEW)
│   │   ├── analytics/
│   │   │   ├── admin-analytics.component.ts (✅ Enhanced)
│   │   │   ├── admin-analytics.component.html (NEW)
│   │   │   ├── admin-analytics.component.scss (NEW)
│   │   │   └── components/
│   │   │       ├── revenue-section.component.ts (NEW)
│   │   │       ├── course-stats.component.ts (NEW)
│   │   │       ├── system-health.component.ts (NEW)
│   │   │       └── user-growth.component.ts (NEW)
│   │   └── shared/
│   │       ├── badge.component.ts (NEW)
│   │       ├── modal.component.ts (NEW)
│   │       ├── empty-state.component.ts (NEW)
│   │       ├── skeleton-loader.component.ts (NEW)
│   │       └── kpi-card.component.ts (NEW)
│   └── pages/ (Optional - for future routing refactor)
└── admin.routes.ts (✅ Updated imports)
```


### Files to DELETE (Duplicates)

```
❌ src/app/features/admin/user-management.component.ts (Root level - 1455 lines)
❌ src/app/features/admin/course-management.component.ts (Root level)
❌ src/app/features/admin/admin.component.ts (Root level)
❌ src/app/features/admin/admin-analytics.component.ts (Root level)
❌ src/app/features/admin/shared/ (Old structure)
```

### Files to KEEP & ENHANCE

```
✅ src/app/features/admin/infrastructure/services/*.ts (All services - NO changes to logic)
✅ src/app/features/admin/presentation/components/*.ts (All components - Enhanced UI only)
✅ src/app/features/admin/admin.routes.ts (Update imports)
```

---

## Design System

### Colors (Synced with Student/Teacher)

```scss
// Primary Colors
$blue-primary: #0056D2;      // Coursera blue
$blue-hover: #004BB8;
$blue-pressed: #00419E;
$blue-light: #E6F0FF;

// Neutral Colors
$gray-50: #F9FAFB;
$gray-100: #F3F4F6;
$gray-200: #E5E7EB;
$gray-300: #D1D5DB;
$gray-400: #9CA3AF;
$gray-500: #6B7280;
$gray-600: #4B5563;
$gray-700: #374151;
$gray-800: #1F2937;
$gray-900: #111827;

// Semantic Colors
$success: #059669;
$success-light: #D1FAE5;
$warning: #D97706;
$warning-light: #FEF3C7;
$error: #DC2626;
$error-light: #FEE2E2;
$info: #2563EB;
$info-light: #DBEAFE;

// Role Colors
$admin-color: #059669;      // Green
$teacher-color: #8B5CF6;    // Purple
$student-color: #2563EB;    // Blue
```

### Typography

```scss
// Font Family
$font-family: 'Source Sans Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

// Font Sizes
$text-xs: 0.75rem;      // 12px - metadata, captions
$text-sm: 0.875rem;     // 14px - body text, buttons
$text-base: 1rem;       // 16px - default body
$text-lg: 1.125rem;     // 18px - card titles
$text-xl: 1.25rem;      // 20px - section headings
$text-2xl: 1.5rem;      // 24px - page titles
$text-3xl: 1.875rem;    // 30px - hero headings

// Font Weights
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;

// Line Heights
$leading-tight: 1.25;
$leading-normal: 1.5;
$leading-relaxed: 1.75;
```

### Spacing (8px Grid)

```scss
$spacing-1: 0.25rem;    // 4px
$spacing-2: 0.5rem;     // 8px
$spacing-3: 0.75rem;    // 12px
$spacing-4: 1rem;       // 16px
$spacing-5: 1.25rem;    // 20px
$spacing-6: 1.5rem;     // 24px
$spacing-8: 2rem;       // 32px
$spacing-10: 2.5rem;    // 40px
$spacing-12: 3rem;      // 48px
$spacing-16: 4rem;      // 64px
```

### Border Radius

```scss
$radius-sm: 0.25rem;    // 4px - small elements
$radius-md: 0.5rem;     // 8px - cards
$radius-lg: 0.75rem;    // 12px - modals
$radius-xl: 1rem;       // 16px - large elements
$radius-full: 9999px;   // fully rounded
```

### Shadows

```scss
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 1px 3px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-xl: 0 10px 15px rgba(0, 0, 0, 0.1);
$shadow-2xl: 0 20px 25px rgba(0, 0, 0, 0.15);

// Card shadows - Coursera style
$shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
$shadow-card-hover: 0 4px 6px rgba(0, 0, 0, 0.1);
```

---

## Component Designs

### 1. Dashboard Component

**Purpose:** Main admin landing page with system overview

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Header: "Quản trị Hệ thống"                        │
│ Subtitle: "Quản lý toàn bộ hệ thống LMS Maritime"  │
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ KPI Card │ KPI Card │ KPI Card │ KPI Card │
│ Users    │ Teachers │ Students │ Courses  │
│ 1,234    │ 45       │ 1,150    │ 156      │
│ +12% ↑   │ Active   │ Learning │ +8 new   │
└──────────┴──────────┴──────────┴──────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Revenue  │ Uptime   │ Online   │ Pending  │
│ 25M VND  │ 99.9%    │ 45       │ 12       │
│ +15% ↑   │ Healthy  │ users    │ courses  │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────┬─────────────────┐
│ Quick Actions Grid          │ Recent Activity │
│ ┌────┬────┬────┐           │ • User created  │
│ │ 👤 │ 📚 │ 📊 │           │ • Course submit │
│ └────┴────┴────┘           │ • Email slow    │
│ ┌────┬────┬────┐           │ • Backup done   │
│ │ ⚙️ │ 🔒 │ 💾 │           │                 │
│ └────┴────┴────┘           │ Quick Stats     │
└─────────────────────────────┴─────────────────┘

┌─────────────────────────────────────────────────────┐
│ System Status                                       │
│ ● Database: Online    ● API: Healthy               │
│ ● Storage: Available  ● Email: Slow                │
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- 8 KPI cards with color-coded borders
- Quick action buttons (6 buttons in 3x2 grid)
- Real-time activity feed from API
- System status indicators
- Refresh button
- Last update timestamp

**State Management:**
```typescript
// Signals
analytics = signal<SystemAnalytics | null>(null);
isLoading = signal(true);
lastUpdate = signal<Date>(new Date());

// Computed
totalUsers = computed(() => this.analytics()?.totalUsers || 0);
activeUsers = computed(() => this.analytics()?.activeUsers || 0);
```


### 2. User Management Component

**Purpose:** Comprehensive user CRUD operations with bulk import

**Current Issues:**
- 1455 lines in single file (❌ TOO LONG)
- Inline template (❌ HARD TO MAINTAIN)
- Mixed concerns (❌ UI + Business logic)

**Refactored Structure:**

**user-management.component.ts** (Main orchestrator - ~250 lines)
```typescript
@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent {
  private adminService = inject(AdminService);
  
  // State
  users = signal<AdminUser[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  roleFilter = signal('');
  statusFilter = signal('');
  pagination = signal<PaginationInfo>({
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 0
  });
  
  // Modals
  showCreateModal = signal(false);
  showBulkImportModal = signal(false);
  
  // Computed
  filteredUsers = computed(() => {
    let users = this.users();
    
    // Apply search filter
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (this.roleFilter()) {
      users = users.filter(u => u.role === this.roleFilter());
    }
    
    // Apply status filter
    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'active';
      users = users.filter(u => u.isActive === isActive);
    }
    
    return users;
  });
  
  totalUsers = computed(() => this.users().length);
  totalTeachers = computed(() => this.users().filter(u => u.role === 'TEACHER').length);
  totalStudents = computed(() => this.users().filter(u => u.role === 'STUDENT').length);
  totalAdmins = computed(() => this.users().filter(u => u.role === 'ADMIN').length);
  activeUsers = computed(() => this.users().filter(u => u.isActive).length);
  
  // Methods
  ngOnInit() {
    this.loadUsers();
  }
  
  loadUsers() {
    this.isLoading.set(true);
    this.adminService.getUsers({
      page: this.pagination().page,
      limit: this.pagination().limit,
      search: this.searchQuery(),
      role: this.roleFilter(),
      status: this.statusFilter()
    }).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.pagination.set(response.pagination);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isLoading.set(false);
      }
    });
  }
  
  onRoleChange(userId: string, oldRole: string, newRole: string) {
    // Show confirmation dialog
    // Call API to update role
    // Reload users
  }
  
  toggleUserStatus(userId: string) {
    // Call API to toggle status
    // Reload users
  }
  
  deleteUser(userId: string) {
    // Show confirmation dialog
    // Call API to delete
    // Reload users
  }
  
  openCreateModal() {
    this.showCreateModal.set(true);
  }
  
  openBulkImportModal() {
    this.showBulkImportModal.set(true);
  }
}
```

**user-table.component.ts** (Reusable table - ~150 lines)
```typescript
@Component({
  selector: 'app-user-table',
  template: `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th>Người dùng</th>
            <th>Vai trò</th>
            <th>Trạng thái</th>
            <th>Hoạt động cuối</th>
            <th>Thống kê</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          @for (user of users(); track user.id) {
            <tr class="hover:bg-gray-50">
              <!-- User info -->
              <td>
                <div class="flex items-center">
                  <img [src]="user.avatar || getDefaultAvatar(user.email)" 
                       class="w-10 h-10 rounded-full">
                  <div class="ml-4">
                    <div class="text-sm font-medium">{{ user.name }}</div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              
              <!-- Role dropdown -->
              <td>
                <select [value]="user.role"
                        (change)="roleChange.emit({userId: user.id, oldRole: user.role, newRole: $any($event.target).value})"
                        class="role-select">
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="TEACHER">Giảng viên</option>
                  <option value="STUDENT">Học viên</option>
                </select>
              </td>
              
              <!-- Status badge -->
              <td>
                <app-badge [variant]="user.isActive ? 'success' : 'error'">
                  {{ user.isActive ? 'Hoạt động' : 'Không hoạt động' }}
                </app-badge>
              </td>
              
              <!-- Last login -->
              <td class="text-sm text-gray-500">
                {{ user.lastLogin | date:'short' }}
              </td>
              
              <!-- Statistics -->
              <td class="text-sm text-gray-500">
                @if (user.role === 'TEACHER') {
                  <div>{{ user.coursesCreated || 0 }} khóa học</div>
                }
                @if (user.role === 'STUDENT') {
                  <div>{{ user.coursesEnrolled || 0 }} đã đăng ký</div>
                }
                <div>{{ user.loginCount || 0 }} lần đăng nhập</div>
              </td>
              
              <!-- Actions -->
              <td>
                <div class="flex space-x-2">
                  <button (click)="statusToggle.emit(user.id)"
                          [title]="user.isActive ? 'Khóa tài khoản' : 'Mở khóa'">
                    <!-- Icon -->
                  </button>
                  <button (click)="deleteClick.emit(user.id)"
                          title="Xóa">
                    <!-- Icon -->
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class UserTableComponent {
  users = input<AdminUser[]>([]);
  
  roleChange = output<{userId: string, oldRole: string, newRole: string}>();
  statusToggle = output<string>();
  deleteClick = output<string>();
  
  getDefaultAvatar(email: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`;
  }
}
```

**bulk-import-modal.component.ts** (Separate modal - ~200 lines)
```typescript
@Component({
  selector: 'app-bulk-import-modal',
  template: `
    <app-modal [show]="isOpen()" (close)="close.emit()">
      <div header>
        <h3>Import người dùng từ Excel</h3>
      </div>
      
      <div body>
        <!-- File upload -->
        <div class="mb-4">
          <label>Chọn file Excel</label>
          <input type="file" 
                 accept=".xlsx,.xls"
                 (change)="onFileSelect($event)">
        </div>
        
        <!-- Role selection -->
        <div class="mb-4">
          <label>Vai trò mặc định</label>
          <select [(ngModel)]="defaultRole">
            <option value="STUDENT">Học viên</option>
            <option value="TEACHER">Giảng viên</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>
        </div>
        
        <!-- Progress -->
        @if (isImporting()) {
          <div class="mb-4">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progress()"></div>
            </div>
            <p>{{ currentStep() }}</p>
          </div>
        }
        
        <!-- Results -->
        @if (importResult()) {
          <div class="results">
            <p>Tổng: {{ importResult()!.totalRows }}</p>
            <p class="text-green-600">Thành công: {{ importResult()!.successfulImports }}</p>
            <p class="text-red-600">Thất bại: {{ importResult()!.failedImports }}</p>
            
            @if (importResult()!.errors.length > 0) {
              <div class="errors">
                <h4>Lỗi:</h4>
                <ul>
                  @for (error of importResult()!.errors; track $index) {
                    <li>{{ error }}</li>
                  }
                </ul>
              </div>
            }
          </div>
        }
      </div>
      
      <div footer>
        <button (click)="startImport()" 
                [disabled]="!selectedFile() || isImporting()">
          Import
        </button>
        <button (click)="close.emit()">Đóng</button>
      </div>
    </app-modal>
  `
})
export class BulkImportModalComponent {
  isOpen = input(false);
  close = output<void>();
  importComplete = output<ImportResult>();
  
  selectedFile = signal<File | null>(null);
  defaultRole = signal<'ADMIN' | 'TEACHER' | 'STUDENT'>('STUDENT');
  isImporting = signal(false);
  progress = signal(0);
  currentStep = signal('');
  importResult = signal<ImportResult | null>(null);
  
  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }
  
  startImport() {
    if (!this.selectedFile()) return;
    
    this.isImporting.set(true);
    this.progress.set(0);
    this.currentStep.set('Đang đọc file...');
    
    // Call API to import
    // Update progress
    // Show results
  }
}
```

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Header + Actions                                    │
│ "Quản lý người dùng"  [+ Thêm] [📥 Import Excel]   │
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Total    │ Teachers │ Students │ Admins   │
│ 1,234    │ 45       │ 1,150    │ 39       │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────────────┐
│ [🔍 Search...] [Role ▼] [Status ▼]                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ User Table (UserTableComponent)                     │
│ ┌────────────────────────────────────────────────┐ │
│ │ Avatar | Name | Role | Status | Actions       │ │
│ ├────────────────────────────────────────────────┤ │
│ │ 👤     | John | 🔵   | ✓      | ⚙️ 🗑️        │ │
│ └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Pagination: [<] 1 2 3 ... 10 [>]  [25 per page ▼] │
└─────────────────────────────────────────────────────┘
```


### 3. Course Management Component

**Purpose:** Review and approve/reject courses submitted by teachers

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ "Quản lý khóa học hệ thống"                        │
│ Pending: 12 courses                                 │
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Total    │ Pending  │ Approved │ Revenue  │
│ 156      │ 12       │ 120      │ 2.5M     │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────────────┐
│ [🔍 Search...] [Status ▼] [Category ▼]             │
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┐
│ Course   │ Course   │ Course   │
│ Card 1   │ Card 2   │ Card 3   │
│ [Image]  │ [Image]  │ [Image]  │
│ Title    │ Title    │ Title    │
│ Teacher  │ Teacher  │ Teacher  │
│ 👥 45    │ 👥 32    │ 👥 67    │
│ ⭐ 4.5   │ ⭐ 4.8   │ ⭐ 4.2   │
│ 2.5M VND │ 1.8M VND │ 3.2M VND │
│          │          │          │
│ [Approve]│ [Approve]│ [View]   │
│ [Reject] │ [Reject] │ [Edit]   │
└──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────────────┐
│ Pagination: [<] 1 2 3 ... 8 [>]                    │
└─────────────────────────────────────────────────────┘
```

**Course Card Design:**
```html
<div class="course-card">
  <!-- Thumbnail with status badge -->
  <div class="thumbnail">
    <img [src]="course.thumbnail" />
    <span class="status-badge" [class]="getStatusClass(course.status)">
      {{ getStatusText(course.status) }}
    </span>
    <span class="level-badge">{{ getLevelText(course.level) }}</span>
  </div>
  
  <!-- Content -->
  <div class="content">
    <h3>{{ course.title }}</h3>
    <p class="description">{{ course.shortDescription }}</p>
    
    <!-- Instructor -->
    <div class="instructor">
      <img [src]="course.teacherAvatar" class="avatar" />
      <div>
        <div class="name">{{ course.teacherName }}</div>
        <div class="email">{{ course.teacherEmail }}</div>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="stats">
      <span><svg>👥</svg> {{ course.enrolledCount }} học viên</span>
      <span><svg>⭐</svg> {{ course.rating }}/5</span>
    </div>
    
    <!-- Price & Revenue -->
    <div class="price-revenue">
      <span class="price">{{ course.price | currency:'VND' }}</span>
      <span class="revenue">{{ course.revenue | currency:'VND' }} doanh thu</span>
    </div>
    
    <!-- Actions -->
    <div class="actions">
      @if (course.status === 'pending') {
        <button class="approve" (click)="approveCourse(course.id)">
          Phê duyệt
        </button>
        <button class="reject" (click)="openRejectModal(course)">
          Từ chối
        </button>
      } @else {
        <button class="view" (click)="viewCourse(course.id)">
          Xem chi tiết
        </button>
        <button class="edit" (click)="editCourse(course.id)">
          Chỉnh sửa
        </button>
      }
    </div>
    
    <!-- Submission info -->
    <div class="submission-info">
      <div>Nộp lúc: {{ course.submittedAt | date:'short' }}</div>
      @if (course.approvedAt) {
        <div>Phê duyệt: {{ course.approvedAt | date:'short' }}</div>
      }
      @if (course.rejectionReason) {
        <div class="rejection-reason">{{ course.rejectionReason }}</div>
      }
    </div>
  </div>
</div>
```

**Reject Modal:**
```html
<app-modal [show]="showRejectModal()" (close)="closeRejectModal()">
  <div header>
    <h3>Từ chối khóa học</h3>
  </div>
  
  <div body>
    <div class="course-info">
      <strong>{{ selectedCourse()?.title }}</strong>
      <div>Giảng viên: {{ selectedCourse()?.teacherName }}</div>
    </div>
    
    <div class="form-group">
      <label>Lý do từ chối *</label>
      <textarea [(ngModel)]="rejectionReason"
                rows="4"
                placeholder="Vui lòng giải thích lý do từ chối..."></textarea>
    </div>
  </div>
  
  <div footer>
    <button (click)="rejectCourse()" 
            [disabled]="!rejectionReason()"
            class="btn-danger">
      Từ chối khóa học
    </button>
    <button (click)="closeRejectModal()" class="btn-secondary">
      Hủy
    </button>
  </div>
</app-modal>
```

**State Management:**
```typescript
// Signals
courses = signal<AdminCourseSummary[]>([]);
isLoading = signal(true);
searchQuery = signal('');
statusFilter = signal('');
categoryFilter = signal('');
showRejectModal = signal(false);
selectedCourse = signal<AdminCourseSummary | null>(null);
rejectionReason = signal('');

// Computed
filteredCourses = computed(() => {
  let courses = this.courses();
  
  if (this.searchQuery()) {
    const query = this.searchQuery().toLowerCase();
    courses = courses.filter(c => 
      c.title.toLowerCase().includes(query) ||
      c.teacherName.toLowerCase().includes(query)
    );
  }
  
  if (this.statusFilter()) {
    courses = courses.filter(c => c.status === this.statusFilter());
  }
  
  if (this.categoryFilter()) {
    courses = courses.filter(c => c.category === this.categoryFilter());
  }
  
  return courses;
});

totalCourses = computed(() => this.courses().length);
pendingCourses = computed(() => this.courses().filter(c => c.status === 'pending').length);
approvedCourses = computed(() => this.courses().filter(c => c.status === 'approved').length);
totalRevenue = computed(() => this.courses().reduce((sum, c) => sum + (c.revenue || 0), 0));
```


### 4. Analytics Component

**Purpose:** Comprehensive system analytics and monitoring

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ "Phân tích hệ thống"                [🔄 Refresh]   │
│ Last updated: 10:30 AM                              │
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Users    │ Teachers │ Students │ Courses  │
│ 1,234    │ 45       │ 1,150    │ 156      │
│ +12% ↑   │ Active   │ Learning │ +8 new   │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────────────┐
│ Revenue Analytics                                   │
│ Total: 25M | Monthly: 2.5M | Growth: +15%          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Course Statistics                                   │
│ Pending: 12 | Approved: 120 | Rejected: 8          │
│ Active: 110 | Archived: 10                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────┬───────────────────────────────┐
│ System Health       │ User Growth                   │
│ ● Database: OK      │ This month: 150               │
│ ● API: OK           │ Last month: 134               │
│ ● Storage: OK       │ Growth: +12%                  │
│ ● Email: Slow       │ [Progress Bar]                │
└─────────────────────┴───────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Charts Placeholder                                  │
│ [Future: Line charts, bar charts, pie charts]      │
└─────────────────────────────────────────────────────┘
```

**System Health Component:**
```typescript
@Component({
  selector: 'app-system-health',
  template: `
    <div class="system-health">
      <h3>Trạng thái hệ thống</h3>
      
      <div class="health-items">
        @for (service of services(); track service.name) {
          <div class="health-item" [class]="getHealthClass(service.status)">
            <div class="flex items-center">
              <div class="status-dot" [class]="getHealthDotClass(service.status)"></div>
              <span class="service-name">{{ service.name }}</span>
            </div>
            <span class="status-text" [class]="getHealthTextClass(service.status)">
              {{ getHealthText(service.status) }}
            </span>
          </div>
        }
      </div>
    </div>
  `
})
export class SystemHealthComponent {
  services = input<SystemService[]>([]);
  
  getHealthClass(status: string): string {
    switch (status) {
      case 'healthy': return 'bg-green-50';
      case 'warning': return 'bg-yellow-50';
      case 'error': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  }
  
  getHealthDotClass(status: string): string {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
  
  getHealthTextClass(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }
  
  getHealthText(status: string): string {
    switch (status) {
      case 'healthy': return 'Hoạt động tốt';
      case 'warning': return 'Cảnh báo';
      case 'error': return 'Lỗi';
      default: return 'Không xác định';
    }
  }
}
```

**User Growth Component:**
```typescript
@Component({
  selector: 'app-user-growth',
  template: `
    <div class="user-growth">
      <h3>Tăng trưởng người dùng</h3>
      
      <div class="growth-stats">
        <div class="stat-item">
          <span class="label">Tháng này</span>
          <span class="value">{{ growth().thisMonth }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Tháng trước</span>
          <span class="value">{{ growth().lastMonth }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Tỷ lệ tăng trưởng</span>
          <span class="value text-green-600">+{{ growth().growthRate }}%</span>
        </div>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill" 
             [style.width.%]="Math.min(growth().growthRate * 2, 100)"></div>
      </div>
    </div>
  `
})
export class UserGrowthComponent {
  growth = input<UserGrowthData>({
    thisMonth: 0,
    lastMonth: 0,
    growthRate: 0
  });
  
  protected Math = Math;
}
```

---

## Shared Components Library

### 1. Badge Component

**Purpose:** Reusable badge for status, roles, etc.

```typescript
@Component({
  selector: 'app-badge',
  template: `
    <span [class]="badgeClasses()">
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      font-weight: 500;
      border-radius: 9999px;
      transition: all 0.2s;
    }
    
    /* Sizes */
    .badge-sm { padding: 0.125rem 0.5rem; font-size: 0.75rem; }
    .badge-md { padding: 0.25rem 0.75rem; font-size: 0.875rem; }
    .badge-lg { padding: 0.375rem 1rem; font-size: 1rem; }
    
    /* Variants */
    .badge-success { background: #D1FAE5; color: #059669; }
    .badge-warning { background: #FEF3C7; color: #D97706; }
    .badge-error { background: #FEE2E2; color: #DC2626; }
    .badge-info { background: #DBEAFE; color: #2563EB; }
    .badge-default { background: #F3F4F6; color: #6B7280; }
  `]
})
export class BadgeComponent {
  variant = input<'success' | 'warning' | 'error' | 'info' | 'default'>('default');
  size = input<'sm' | 'md' | 'lg'>('md');
  
  badgeClasses = computed(() => {
    return `badge badge-${this.variant()} badge-${this.size()}`;
  });
}
```

**Usage:**
```html
<app-badge variant="success">Active</app-badge>
<app-badge variant="warning" size="sm">Pending</app-badge>
<app-badge variant="error">Rejected</app-badge>
```

### 2. Modal Component

**Purpose:** Reusable modal dialog

```typescript
@Component({
  selector: 'app-modal',
  template: `
    @if (show()) {
      <div class="modal-overlay" (click)="onOverlayClick()">
        <div class="modal-content" 
             (click)="$event.stopPropagation()"
             [@fadeSlide]>
          <!-- Header -->
          <div class="modal-header">
            <ng-content select="[header]"></ng-content>
            <button class="close-button" (click)="onClose()">
              <svg>×</svg>
            </button>
          </div>
          
          <!-- Body -->
          <div class="modal-body">
            <ng-content select="[body]"></ng-content>
          </div>
          
          <!-- Footer -->
          <div class="modal-footer">
            <ng-content select="[footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class ModalComponent {
  show = input(false);
  closeOnOverlay = input(true);
  
  close = output<void>();
  
  onClose() {
    this.close.emit();
  }
  
  onOverlayClick() {
    if (this.closeOnOverlay()) {
      this.onClose();
    }
  }
}
```

**Usage:**
```html
<app-modal [show]="showModal()" (close)="closeModal()">
  <div header>
    <h3>Modal Title</h3>
  </div>
  
  <div body>
    <p>Modal content goes here</p>
  </div>
  
  <div footer>
    <button (click)="save()">Save</button>
    <button (click)="closeModal()">Cancel</button>
  </div>
</app-modal>
```

### 3. Skeleton Loader Component

**Purpose:** Loading placeholder

```typescript
@Component({
  selector: 'app-skeleton-loader',
  template: `
    <div class="skeleton" [class]="skeletonClasses()">
      <div class="shimmer"></div>
    </div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .skeleton-text { height: 1rem; width: 100%; }
    .skeleton-title { height: 1.5rem; width: 60%; }
    .skeleton-avatar { width: 40px; height: 40px; border-radius: 50%; }
    .skeleton-card { height: 200px; width: 100%; }
    .skeleton-button { height: 40px; width: 120px; border-radius: 8px; }
  `]
})
export class SkeletonLoaderComponent {
  type = input<'text' | 'title' | 'avatar' | 'card' | 'button'>('text');
  width = input<string>('');
  height = input<string>('');
  
  skeletonClasses = computed(() => {
    return `skeleton-${this.type()}`;
  });
}
```

**Usage:**
```html
<app-skeleton-loader type="title"></app-skeleton-loader>
<app-skeleton-loader type="text"></app-skeleton-loader>
<app-skeleton-loader type="avatar"></app-skeleton-loader>
<app-skeleton-loader type="card"></app-skeleton-loader>
```

### 4. KPI Card Component

**Purpose:** Reusable KPI display card

```typescript
@Component({
  selector: 'app-kpi-card',
  template: `
    <div class="kpi-card" [class]="'border-l-4 border-' + borderColor()">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-600 mb-1">{{ label() }}</p>
          <p class="text-3xl font-bold text-gray-900">{{ value() }}</p>
          
          @if (trend()) {
            <p class="text-sm flex items-center mt-1" [class]="getTrendClass()">
              <svg class="w-4 h-4 mr-1" [innerHTML]="getTrendIcon()"></svg>
              {{ trend() }}
            </p>
          }
        </div>
        
        <div class="w-12 h-12 rounded-xl flex items-center justify-center"
             [class]="'bg-' + iconBgColor()">
          <svg class="w-6 h-6" [class]="'text-' + iconColor()" [innerHTML]="icon()"></svg>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-card {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;
    }
    
    .kpi-card:hover {
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class KpiCardComponent {
  label = input<string>('');
  value = input<string | number>('');
  trend = input<string>('');
  icon = input<string>('');
  borderColor = input<string>('blue-500');
  iconColor = input<string>('blue-600');
  iconBgColor = input<string>('blue-100');
  
  getTrendClass(): string {
    const trend = this.trend();
    if (trend.includes('+') || trend.includes('↑')) {
      return 'text-green-600';
    } else if (trend.includes('-') || trend.includes('↓')) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  }
  
  getTrendIcon(): string {
    const trend = this.trend();
    if (trend.includes('+') || trend.includes('↑')) {
      return '<path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>';
    } else if (trend.includes('-') || trend.includes('↓')) {
      return '<path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>';
    }
    return '';
  }
}
```

**Usage:**
```html
<app-kpi-card
  label="Tổng học viên"
  [value]="1234"
  trend="+12% tháng này"
  icon="<path>...</path>"
  borderColor="blue-500"
  iconColor="blue-600"
  iconBgColor="blue-100">
</app-kpi-card>
```

### 5. Empty State Component

**Purpose:** Display when no data available

```typescript
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <svg class="icon" [innerHTML]="icon()"></svg>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      
      @if (actionLabel()) {
        <button (click)="action.emit()" class="action-button">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
    }
    
    .icon {
      width: 6rem;
      height: 6rem;
      color: #D1D5DB;
      margin: 0 auto 1rem;
    }
    
    h3 {
      font-size: 1.125rem;
      font-weight: 500;
      color: #111827;
      margin-bottom: 0.5rem;
    }
    
    p {
      color: #6B7280;
      margin-bottom: 1.5rem;
    }
    
    .action-button {
      padding: 0.75rem 1.5rem;
      background: #0056D2;
      color: white;
      border-radius: 0.5rem;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .action-button:hover {
      background: #004BB8;
    }
  `]
})
export class EmptyStateComponent {
  icon = input<string>('');
  title = input<string>('No data');
  message = input<string>('');
  actionLabel = input<string>('');
  
  action = output<void>();
}
```

**Usage:**
```html
<app-empty-state
  icon="<path>...</path>"
  title="Không có người dùng nào"
  message="Bắt đầu thêm người dùng đầu tiên"
  actionLabel="Thêm người dùng"
  (action)="openCreateModal()">
</app-empty-state>
```


---

## Data Models

### No Changes to Existing Models

All data models in `infrastructure/services/admin.service.ts` remain unchanged:

```typescript
// ✅ Keep as-is
export interface SystemAnalytics { ... }
export interface AdminUser { ... }
export interface AdminCourseSummary { ... }
export interface CreateUserRequest { ... }
export interface UpdateUserRequest { ... }
export interface SystemSettings { ... }
```

---

## Error Handling Strategy

### Error Types

```typescript
interface ErrorState {
  type: 'network' | 'validation' | 'auth' | 'server' | 'unknown';
  message: string;
  details?: string;
  retryable: boolean;
  action?: () => void;
}
```

### Error Display Component

```typescript
@Component({
  selector: 'app-error-banner',
  template: `
    <div class="error-banner" [class]="getErrorClass()">
      <div class="flex items-center">
        <svg class="icon">⚠️</svg>
        <div class="flex-1">
          <p class="message">{{ error().message }}</p>
          @if (error().details) {
            <p class="details">{{ error().details }}</p>
          }
        </div>
        @if (error().retryable) {
          <button (click)="retry.emit()" class="retry-button">
            Thử lại
          </button>
        }
        <button (click)="dismiss.emit()" class="close-button">
          ×
        </button>
      </div>
    </div>
  `
})
export class ErrorBannerComponent {
  error = input<ErrorState>();
  retry = output<void>();
  dismiss = output<void>();
  
  getErrorClass(): string {
    switch (this.error().type) {
      case 'network': return 'error-network';
      case 'validation': return 'error-validation';
      case 'auth': return 'error-auth';
      case 'server': return 'error-server';
      default: return 'error-unknown';
    }
  }
}
```

### Error Handling in Components

```typescript
// Example: User Management Component
loadUsers() {
  this.isLoading.set(true);
  this.error.set(null);
  
  this.adminService.getUsers().subscribe({
    next: (response) => {
      this.users.set(response.data);
      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('Error loading users:', error);
      
      // Determine error type
      let errorState: ErrorState;
      
      if (error.status === 0) {
        errorState = {
          type: 'network',
          message: 'Không thể kết nối đến server',
          details: 'Vui lòng kiểm tra kết nối internet của bạn',
          retryable: true
        };
      } else if (error.status === 401) {
        errorState = {
          type: 'auth',
          message: 'Phiên đăng nhập đã hết hạn',
          details: 'Vui lòng đăng nhập lại',
          retryable: false
        };
        // Redirect to login
        this.router.navigate(['/login']);
      } else if (error.status >= 500) {
        errorState = {
          type: 'server',
          message: 'Lỗi server',
          details: 'Vui lòng thử lại sau',
          retryable: true
        };
      } else {
        errorState = {
          type: 'unknown',
          message: 'Đã xảy ra lỗi',
          details: error.message || 'Vui lòng thử lại',
          retryable: true
        };
      }
      
      this.error.set(errorState);
      this.isLoading.set(false);
    }
  });
}

retryLoad() {
  this.loadUsers();
}
```

---

## Performance Optimization

### 1. OnPush Change Detection

```typescript
@Component({
  selector: 'app-user-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class UserManagementComponent {
  // Use signals for reactive state
  users = signal<AdminUser[]>([]);
  
  // Angular will automatically detect signal changes
}
```

### 2. Lazy Loading

```typescript
// admin.routes.ts
export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/components/admin-layout-simple.component')
      .then(m => m.AdminLayoutSimpleComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./presentation/components/dashboard/admin-dashboard.component')
          .then(m => m.AdminDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./presentation/components/user-management/user-management.component')
          .then(m => m.UserManagementComponent)
      },
      // ...
    ]
  }
];
```

### 3. Virtual Scrolling (for large lists)

```typescript
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="60" class="viewport">
      @for (user of users(); track user.id) {
        <div class="user-row">
          <!-- User content -->
        </div>
      }
    </cdk-virtual-scroll-viewport>
  `
})
export class UserTableComponent {
  users = input<AdminUser[]>([]);
}
```

### 4. Debounced Search

```typescript
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

searchQuery = signal('');
searchQuery$ = toObservable(this.searchQuery).pipe(
  debounceTime(300),
  distinctUntilChanged()
);

ngOnInit() {
  this.searchQuery$.subscribe(() => {
    this.loadUsers();
  });
}
```

### 5. Caching

```typescript
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private analyticsCache = signal<{
    data: SystemAnalytics | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });
  
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  getSystemAnalytics(): Observable<SystemAnalytics> {
    const cache = this.analyticsCache();
    const now = Date.now();
    
    // Return cached data if still valid
    if (cache.data && (now - cache.timestamp) < this.CACHE_DURATION) {
      return of(cache.data);
    }
    
    // Fetch fresh data
    return this.apiClient.get<SystemAnalytics>(ADMIN_ENDPOINTS.ANALYTICS).pipe(
      tap(data => {
        this.analyticsCache.set({ data, timestamp: now });
      })
    );
  }
}
```

---

## Responsive Design

### Breakpoints

```scss
$breakpoint-sm: 640px;   // Mobile landscape
$breakpoint-md: 768px;   // Tablet
$breakpoint-lg: 1024px;  // Desktop
$breakpoint-xl: 1280px;  // Large desktop
```

### Grid Layouts

```scss
// KPI Cards Grid
.kpi-grid {
  display: grid;
  gap: 1.5rem;
  
  // Mobile: 1 column
  grid-template-columns: 1fr;
  
  // Tablet: 2 columns
  @media (min-width: $breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  // Desktop: 4 columns
  @media (min-width: $breakpoint-lg) {
    grid-template-columns: repeat(4, 1fr);
  }
}

// Course Cards Grid
.course-grid {
  display: grid;
  gap: 1.5rem;
  
  // Mobile: 1 column
  grid-template-columns: 1fr;
  
  // Tablet: 2 columns
  @media (min-width: $breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  // Desktop: 3 columns
  @media (min-width: $breakpoint-xl) {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Mobile Table to Cards

```html
<!-- Desktop: Table -->
<div class="hidden md:block">
  <table class="user-table">
    <!-- Table content -->
  </table>
</div>

<!-- Mobile: Cards -->
<div class="block md:hidden">
  @for (user of users(); track user.id) {
    <div class="user-card">
      <div class="user-info">
        <img [src]="user.avatar" class="avatar" />
        <div>
          <div class="name">{{ user.name }}</div>
          <div class="email">{{ user.email }}</div>
        </div>
      </div>
      
      <div class="user-details">
        <div class="detail-row">
          <span class="label">Vai trò:</span>
          <app-badge [variant]="getRoleBadgeVariant(user.role)">
            {{ getRoleText(user.role) }}
          </app-badge>
        </div>
        
        <div class="detail-row">
          <span class="label">Trạng thái:</span>
          <app-badge [variant]="user.isActive ? 'success' : 'error'">
            {{ user.isActive ? 'Hoạt động' : 'Không hoạt động' }}
          </app-badge>
        </div>
        
        <div class="detail-row">
          <span class="label">Hoạt động cuối:</span>
          <span>{{ user.lastLogin | date:'short' }}</span>
        </div>
      </div>
      
      <div class="user-actions">
        <button (click)="toggleStatus(user.id)">
          {{ user.isActive ? 'Khóa' : 'Mở khóa' }}
        </button>
        <button (click)="deleteUser(user.id)">Xóa</button>
      </div>
    </div>
  }
</div>
```

---

## Accessibility

### ARIA Labels

```html
<!-- Icon-only buttons -->
<button (click)="refresh()" 
        aria-label="Làm mới dữ liệu"
        title="Làm mới dữ liệu">
  <svg>🔄</svg>
</button>

<!-- Status indicators -->
<div role="status" aria-live="polite">
  @if (isLoading()) {
    <span class="sr-only">Đang tải dữ liệu...</span>
  }
</div>

<!-- Form inputs -->
<label for="search-input">Tìm kiếm người dùng</label>
<input id="search-input" 
       type="text"
       aria-describedby="search-help"
       [(ngModel)]="searchQuery">
<span id="search-help" class="sr-only">
  Nhập tên hoặc email để tìm kiếm
</span>
```

### Keyboard Navigation

```typescript
@Component({
  host: {
    '(keydown.escape)': 'onEscape()',
    '(keydown.enter)': 'onEnter()',
    'tabindex': '0'
  }
})
export class ModalComponent {
  onEscape() {
    this.close.emit();
  }
  
  onEnter() {
    // Handle enter key
  }
}
```

### Focus Management

```typescript
@Component({
  template: `
    <button #firstButton>First</button>
    <button>Second</button>
    <button #lastButton>Last</button>
  `
})
export class ModalComponent implements AfterViewInit {
  @ViewChild('firstButton') firstButton!: ElementRef;
  @ViewChild('lastButton') lastButton!: ElementRef;
  
  ngAfterViewInit() {
    // Focus first button when modal opens
    this.firstButton.nativeElement.focus();
  }
  
  @HostListener('keydown.tab', ['$event'])
  onTab(event: KeyboardEvent) {
    // Trap focus within modal
    const focusableElements = this.el.nativeElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let adminService: jasmine.SpyObj<AdminService>;
  
  beforeEach(() => {
    adminService = jasmine.createSpyObj('AdminService', ['getUsers', 'deleteUser']);
    component = new UserManagementComponent();
    component['adminService'] = adminService;
  });
  
  it('should load users on init', () => {
    const mockUsers = [/* mock data */];
    adminService.getUsers.and.returnValue(of({ data: mockUsers, pagination: {} }));
    
    component.ngOnInit();
    
    expect(component.users()).toEqual(mockUsers);
    expect(component.isLoading()).toBe(false);
  });
  
  it('should filter users by search query', () => {
    component.users.set([
      { id: '1', name: 'John Doe', email: 'john@example.com', /* ... */ },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', /* ... */ }
    ]);
    
    component.searchQuery.set('john');
    
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].name).toBe('John Doe');
  });
});
```

### Integration Tests

```typescript
describe('User Management Integration', () => {
  it('should create user and refresh list', async () => {
    // Setup
    const page = await browser.newPage();
    await page.goto('http://localhost:4200/admin/users');
    
    // Click create button
    await page.click('[data-testid="create-user-button"]');
    
    // Fill form
    await page.fill('[data-testid="user-name-input"]', 'Test User');
    await page.fill('[data-testid="user-email-input"]', 'test@example.com');
    await page.select('[data-testid="user-role-select"]', 'STUDENT');
    
    // Submit
    await page.click('[data-testid="submit-button"]');
    
    // Verify
    await page.waitForSelector('[data-testid="user-row"]');
    const users = await page.$$('[data-testid="user-row"]');
    expect(users.length).toBeGreaterThan(0);
  });
});
```

---

## Migration Plan

### Phase 1: Cleanup & Foundation (Week 1)
1. Delete duplicate components
2. Extract inline templates to HTML files
3. Create shared components library
4. Remove all emoji, replace with SVG icons

### Phase 2: Refactor User Management (Week 2)
1. Split user-management.component.ts into sub-components
2. Extract user-table.component.ts
3. Extract bulk-import-modal.component.ts
4. Add loading states and error handling

### Phase 3: Enhance Dashboard & Analytics (Week 3)
1. Refactor dashboard component
2. Create KPI card components
3. Enhance analytics component
4. Add system health monitoring

### Phase 4: Course Management & Polish (Week 4)
1. Enhance course management component
2. Create course card components
3. Add pagination
4. Responsive design improvements
5. Accessibility improvements
6. Performance optimization
7. Testing

---

## Success Metrics

- ✅ All emoji replaced with SVG icons
- ✅ All components < 500 lines
- ✅ All inline templates < 200 lines extracted
- ✅ Design system 100% synced
- ✅ Loading states everywhere
- ✅ Responsive on all devices
- ✅ WCAG AA compliant
- ✅ No business logic changes
- ✅ Performance targets met (LCP < 2.5s, FID < 100ms)
- ✅ Lighthouse score > 90

---

**Document Version**: 1.0  
**Created**: November 13, 2025  
**Status**: Ready for Implementation  
**Philosophy**: Clean, Professional, DDD-Compliant, Practical
