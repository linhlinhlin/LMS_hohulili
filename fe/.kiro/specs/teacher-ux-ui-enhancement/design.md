# Design Document - Teacher Portal (Simplified & Aligned)

## Overview

Thiết kế đơn giản, chuyên nghiệp theo phong cách **Coursera/Udemy**, đồng bộ hoàn toàn với Student Portal. Focus vào **UI/UX improvements only** - không thay đổi business logic.

### Design Principles (Đồng bộ với Student)
1. **UI/UX Only** - Chỉ cải thiện giao diện, không đụng logic
2. **Simplicity First** - Code đơn giản, dễ maintain
3. **Professional Design** - Clean, minimal (Coursera/Udemy style)
4. **Practical Over Perfect** - Working code > Perfect architecture
5. **No Emoji** - Chỉ SVG icons
6. **Keep Existing Logic** - Giữ nguyên API calls, data flow, business rules
7. **Consistency** - Đồng bộ với Student Portal

### Scope
✅ **Được phép:** Layout, CSS, HTML templates, loading states, responsive, accessibility
❌ **KHÔNG được:** API changes, data models, business logic, new features, over-engineering

## Architecture (Simple - Giống Student)

### Folder Structure
```
src/app/features/teacher/
├── dashboard/              # Dashboard page
├── courses/                # Course management pages
├── assignments/            # Assignment management pages
├── students/               # Student management pages
├── quiz/                   # Quiz management pages
├── grading/                # Grading pages
├── analytics/              # Analytics pages
├── notifications/          # Notifications page
├── shared/                 # Shared components (layout, sidebar)
├── services/               # API + Logic services
└── types/                  # TypeScript interfaces
```

**Không có:** Complex domain layer, Use cases, Repositories, Value objects

### Data Flow (Simple)
```
User Action → Page Component → Service → API
                    ↓
              Signal Update
                    ↓
              Template Render
```

## Design System (Đồng bộ với Student)

### Colors (Coursera/Udemy Style)
```scss
// Primary - Blue (giống Student)
$blue-primary: #0056D2;      // Primary button, links
$blue-hover: #004BB8;        // Hover state

// Neutrals
$gray-50: #F9FAFB;          // Page background
$gray-100: #F3F4F6;         // Card hover
$gray-200: #E5E7EB;         // Borders, progress bg
$gray-600: #4B5563;         // Body text
$gray-900: #111827;         // Headings

// Semantic
$success: #059669;          // Completed, Published
$warning: #D97706;          // Pending, Draft
$error: #DC2626;            // Error, Overdue
$info: #0284C7;             // Info messages
```

### Typography (Giống Student)
```scss
$font-family: 'Source Sans Pro', 'Inter', sans-serif;

// Sizes
$text-xs: 0.75rem;      // 12px - metadata
$text-sm: 0.875rem;     // 14px - body
$text-base: 1rem;       // 16px - default
$text-lg: 1.125rem;     // 18px - card titles
$text-xl: 1.25rem;      // 20px - page titles
$text-2xl: 1.5rem;      // 24px - main heading

// Weights
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;
```

### Spacing (8px grid - Giống Student)
```scss
$spacing-1: 0.25rem;    // 4px
$spacing-2: 0.5rem;     // 8px
$spacing-3: 0.75rem;    // 12px
$spacing-4: 1rem;       // 16px
$spacing-6: 1.5rem;     // 24px
$spacing-8: 2rem;       // 32px
```

### Components (Đồng bộ với Student)

#### Buttons
```scss
.btn-primary {
  padding: 10px 16px;
  background: $blue-primary;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: $text-sm;
  font-weight: $font-semibold;
  cursor: pointer;
  
  &:hover {
    background: $blue-hover;
  }
}

.btn-ghost {
  padding: 8px 12px;
  background: transparent;
  color: $gray-600;
  border: 1px solid $gray-200;
  border-radius: 4px;
}
```

#### Cards
```scss
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}
```

#### Progress Bar (Thin - Coursera style)
```scss
.progress-bar {
  height: 4px;
  background: $gray-200;
  border-radius: 2px;
  overflow: hidden;
  
  .progress-fill {
    height: 100%;
    background: $blue-primary;
    transition: width 0.3s ease;
  }
}
```


## Component Designs (Teacher-specific)

### 1. Dashboard Layout

**Giống Student nhưng với Teacher context:**
```
┌─────────────────────────────────────────────────┐
│ Good morning, [Teacher Name]                    │
├─────────────────────────────────────────────────┤
│ KPI Cards (4 cards in row)                     │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │Courses│ │Students│ │Assign│ │Rating│          │
│ │  24   │ │  156   │ │  12  │ │ 4.8  │          │
│ └──────┘ └──────┘ └──────┘ └──────┘           │
├─────────────────────────────────────────────────┤
│ Recent Courses (List with actions)              │
│ ┌────────────────────────────────────────────┐ │
│ │ ME101 - Maritime Safety    [Edit] [View]  │ │
│ │ ME102 - Navigation         [Edit] [View]  │ │
│ └────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Pending Assignments (List with actions)         │
│ ┌────────────────────────────────────────────┐ │
│ │ Assignment 1 - 15/25 submitted  [Grade]   │ │
│ │ Assignment 2 - 8/18 submitted   [Grade]   │ │
│ └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Design Specs:**
- Background: White (#FFFFFF)
- Primary Button: Blue (#0056D2)
- KPI Cards: Simple numbers, no emoji
- Card spacing: 16px gap
- Card shadow: Subtle (0 1px 3px rgba(0,0,0,0.1))
- Icons: SVG, 16-20px

### 2. Course Management Page (Teacher Courses)

**Layout Structure (70-30 split như Dashboard):**
```
┌─────────────────────────────────────────────────────────────────┐
│ Main Content (70%)                    │ Sidebar (30%)          │
│                                       │                        │
│ ┌─ Header ─────────────────────────┐ │ ┌─ Quick Stats ─────┐ │
│ │ Khóa học của tôi                 │ │ │ Active: 12        │ │
│ │                    [+ Tạo khóa]  │ │ │ Draft: 3          │ │
│ └──────────────────────────────────┘ │ │ Archived: 5       │ │
│                                       │ └───────────────────┘ │
│ ┌─ Filters ────────────────────────┐ │                        │
│ │ [Search] [Status▾] [Category▾]  │ │ ┌─ Recent Activity ─┐│
│ └──────────────────────────────────┘ │ │ • Course updated  │ │
│                                       │ │ • New enrollment  │ │
│ ┌─ Courses Table ──────────────────┐ │ └───────────────────┘ │
│ │ Code │ Title │ Status │ Students││ │                        │
│ │ ME101│ Safety│ Active │   45   ⋮││ │                        │
│ │ ME102│ Nav   │ Draft  │    0   ⋮││ │                        │
│ └──────────────────────────────────┘ │                        │
│                                       │                        │
│ ┌─ Pagination ─────────────────────┐ │                        │
│ │ [<] Page 1/5 [>]    Total: 48   │ │                        │
│ └──────────────────────────────────┘ │                        │
└─────────────────────────────────────────────────────────────────┘
```

**Design Specs:**

#### Header Section
- Title: "Khóa học của tôi" (28px, bold, #1F1F1F)
- Primary button: "+ Tạo khóa học" (Blue #0056D2)
- Spacing: 32px bottom margin

#### Filters Bar
- Search input: Full-width, placeholder "Tìm kiếm theo mã hoặc tên..."
- Status dropdown: "Tất cả trạng thái", "APPROVED", "PENDING", "DRAFT"
- Category dropdown: "Tất cả danh mục", "Maritime Safety", "Navigation", etc.
- Filter button: "Lọc" (Slate #475569)
- Layout: Flex row with 16px gap
- Background: White card with shadow

#### Courses Table
- Clean table design với borders
- Columns:
  - **Mã khóa học** (Code): 120px width, monospace font
  - **Tên khóa học** (Title): Flex 1, truncate long text
  - **Trạng thái** (Status): 120px, badge component
  - **Học viên** (Students): 100px, right-aligned number
  - **Actions**: 180px, button group
- Row height: 64px
- Hover effect: Light gray background (#F9FAFB)
- Border: 1px solid #E5E7EB

#### Status Badges (Đồng bộ với Student)
```scss
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  
  &.approved {
    background: #D1FAE5;
    color: #065F46;
    border: 1px solid #A7F3D0;
  }
  
  &.pending {
    background: #FEF3C7;
    color: #92400E;
    border: 1px solid #FDE68A;
  }
  
  &.draft {
    background: #E5E7EB;
    color: #374151;
    border: 1px solid #D1D5DB;
  }
}
```

#### Action Buttons
- **Sửa** (Edit): Ghost button, Stone #78716C
- **Xuất bản** (Publish): Teal #14B8A6 (only for draft/pending)
- **Xóa** (Delete): Red #EF4444
- Button size: Small (sm), padding 8px 12px
- Gap between buttons: 8px
- Disabled state: opacity 50%, cursor not-allowed

#### Pagination
- Background: White card
- Layout: Flex row, space-between
- Left: "Hiển thị [5▾] mỗi trang"
- Center: "[< Trước] Trang 1/5 [Sau >]"
- Right: "Tổng: 48"
- Button style: Ghost with shadow on hover

#### Sidebar Widgets (30%)

**Quick Stats Widget:**
```
┌─────────────────────┐
│ Thống kê nhanh      │
├─────────────────────┤
│ Đang hoạt động: 12  │
│ Nháp: 3             │
│ Đã lưu trữ: 5       │
│ Tổng học viên: 156  │
└─────────────────────┘
```

**Recent Activity Widget:**
```
┌─────────────────────┐
│ Hoạt động gần đây   │
├─────────────────────┤
│ 🔵 Course updated   │
│    2 giờ trước      │
│ 🟢 New enrollment   │
│    4 giờ trước      │
└─────────────────────┘
```

#### Responsive Mobile (<768px)
- Switch to single column layout
- Hide sidebar (or move to bottom)
- Transform table to card layout:
```
┌─────────────────────────┐
│ ME101 - Maritime Safety │
│ Status: Active          │
│ Students: 45            │
│ [Sửa] [Xuất bản] [Xóa] │
└─────────────────────────┘
```

#### Empty State
```
┌─────────────────────────┐
│      📚                 │
│ Chưa có khóa học nào    │
│ Tạo khóa học đầu tiên   │
│   [+ Tạo khóa học]      │
└─────────────────────────┘
```

#### Loading State
- Skeleton loaders for table rows
- Shimmer animation
- 5 skeleton rows by default

#### Error State
- Red alert box
- Error message
- Retry button

### 3. Assignment Management

**List view với status badges:**
```
┌─────────────────────────────────────────────────┐
│ [Search] [Filter: Status] [+ Create Assignment]│
├─────────────────────────────────────────────────┤
│ Title              │ Course  │ Due Date │Status│
├────────────────────┼─────────┼──────────┼──────┤
│ Safety Assignment  │ ME101   │ Nov 20   │ 🟢   │
│ Navigation Quiz    │ ME102   │ Nov 25   │ 🟡   │
└─────────────────────────────────────────────────┘
```

**Status Colors:**
- 🟢 Green: Graded
- 🟡 Yellow: Pending
- 🔵 Blue: Submitted

### 4. Student Management

**Table với progress bars:**
```
┌─────────────────────────────────────────────────┐
│ [Search] [Filter: Course] [Filter: Status]     │
├─────────────────────────────────────────────────┤
│ Name        │ Email          │ Progress │ Grade│
├─────────────┼────────────────┼──────────┼──────┤
│ Nguyễn V.A  │ nva@email.com  │ ████░░   │ 8.5  │
│ Trần T.B    │ ttb@email.com  │ █████░   │ 9.2  │
└─────────────────────────────────────────────────┘
```

### 5. Grading Interface

**Simple grading form:**
```
┌─────────────────────────────────────────────────┐
│ Student: Nguyễn Văn A                           │
│ Assignment: Safety Assignment                   │
├─────────────────────────────────────────────────┤
│ Submission Content:                             │
│ [File attachments]                              │
│ [Text content]                                  │
├─────────────────────────────────────────────────┤
│ Grade: [____] / 10                              │
│ Feedback:                                       │
│ [Text area]                                     │
│                                                 │
│ [Save Grade] [Next Student]                     │
└─────────────────────────────────────────────────┘
```

## State Management (Simple)

### Dashboard Example
```typescript
@Component({...})
export class DashboardPage {
  private api = inject(TeacherService);
  
  // State
  courses = signal<Course[]>([]);
  students = signal<Student[]>([]);
  assignments = signal<Assignment[]>([]);
  isLoading = signal(false);
  
  // Computed
  activeCourses = computed(() => 
    this.courses().filter(c => c.status === 'active')
  );
  
  pendingAssignments = computed(() =>
    this.assignments().filter(a => a.status === 'pending')
  );
  
  // Methods
  loadData() {
    this.isLoading.set(true);
    this.api.getDashboardData().subscribe({
      next: (data) => {
        this.courses.set(data.courses);
        this.students.set(data.students);
        this.assignments.set(data.assignments);
      },
      complete: () => this.isLoading.set(false)
    });
  }
}
```

### Course Management Example
```typescript
@Component({...})
export class CourseManagementComponent {
  private api = inject(CourseApi);
  
  // State
  courses = signal<CourseSummary[]>([]);
  filtered = signal<CourseSummary[]>([]);
  loading = signal(true);
  error = signal('');
  
  // Filter state
  keyword = signal('');
  status = signal<'' | 'APPROVED' | 'PENDING' | 'DRAFT'>('');
  category = signal('');
  
  // Pagination state
  pageIndex = signal(1);
  pageSize = signal(10);
  
  // Action state
  publishingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  
  // Computed
  paged = computed(() => {
    const start = (this.pageIndex() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  
  total = computed(() => this.filtered().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  
  activeCourses = computed(() => 
    this.courses().filter(c => c.status === 'APPROVED')
  );
  
  draftCourses = computed(() =>
    this.courses().filter(c => c.status === 'DRAFT')
  );
  
  // Methods
  applyFilters() {
    const kw = this.keyword().trim().toLowerCase();
    this.filtered.set(
      this.courses()
        .filter(c => !this.status() || c.status === this.status())
        .filter(c => !kw || c.code?.toLowerCase().includes(kw) || c.title?.toLowerCase().includes(kw))
    );
    this.pageIndex.set(1);
  }
  
  publish(id: string) {
    this.publishingId.set(id);
    this.api.publishCourse(id).subscribe({
      next: () => {
        // Update local state
        const apply = (list: CourseSummary[]) => 
          list.map(item => item.id === id ? { ...item, status: 'APPROVED' } : item);
        this.courses.set(apply(this.courses()));
        this.filtered.set(apply(this.filtered()));
      },
      complete: () => this.publishingId.set(null)
    });
  }
  
  deleteCourse(id: string, title: string) {
    if (!confirm(`Xóa khóa học "${title}"?`)) return;
    
    this.deletingId.set(id);
    this.api.deleteCourse(id).subscribe({
      next: () => {
        const removeFromList = (list: CourseSummary[]) => 
          list.filter(item => item.id !== id);
        this.courses.set(removeFromList(this.courses()));
        this.filtered.set(removeFromList(this.filtered()));
      },
      error: (err) => alert('Không thể xóa: ' + err?.message),
      complete: () => this.deletingId.set(null)
    });
  }
}
```

## Data Models (Simple)

```typescript
interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  enrolledStudents: number;
  rating: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  progress: number;           // 0-100
  averageGrade: number;       // 0-10
  status: 'active' | 'inactive';
}

interface Assignment {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  submissions: number;
  totalStudents: number;
}
```

## Responsive Layout

### Grid System (Giống Student)
```scss
.course-grid {
  display: grid;
  gap: 16px;
  
  // Mobile: 1 column
  grid-template-columns: 1fr;
  
  // Tablet: 2 columns
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  // Desktop: 3 columns
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Mobile Optimizations
- ✅ 1 column layout on mobile
- ✅ 44px minimum touch targets
- ✅ Readable text (16px+ body)
- ✅ Stack buttons vertically on small screens
- ✅ Tables transform to cards on mobile
- ❌ No complex hamburger menu (keep simple)

## Template Structure Examples

### Course Management Template (Coursera Style)
```html
<div class="course-management-container">
  <!-- Main Content (70%) -->
  <div class="main-content">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">Khóa học của tôi</h1>
      <app-button 
        variant="primary" 
        (clicked)="createCourse()">
        <app-icon name="plus" size="sm" />
        Tạo khóa học
      </app-button>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar">
      <input 
        class="search-input" 
        placeholder="Tìm kiếm theo mã hoặc tên..."
        [(ngModel)]="keyword"
        (input)="applyFilters()" />
      
      <select class="filter-select" [(ngModel)]="status" (change)="applyFilters()">
        <option value="">Tất cả trạng thái</option>
        <option value="APPROVED">Đang hoạt động</option>
        <option value="PENDING">Chờ duyệt</option>
        <option value="DRAFT">Nháp</option>
      </select>
      
      <select class="filter-select" [(ngModel)]="category" (change)="applyFilters()">
        <option value="">Tất cả danh mục</option>
        <option value="maritime-safety">Maritime Safety</option>
        <option value="navigation">Navigation</option>
      </select>
    </div>

    <!-- Courses Table -->
    <div class="table-container">
      <table class="courses-table">
        <thead>
          <tr>
            <th>Mã khóa học</th>
            <th>Tên khóa học</th>
            <th>Trạng thái</th>
            <th>Học viên</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (course of paged(); track course.id) {
            <tr class="course-row">
              <td class="course-code">{{ course.code }}</td>
              <td class="course-title">{{ course.title }}</td>
              <td class="course-status">
                <app-badge 
                  [variant]="getStatusVariant(course.status)" 
                  size="sm">
                  {{ getStatusLabel(course.status) }}
                </app-badge>
              </td>
              <td class="course-students">{{ course.enrolledCount }}</td>
              <td class="course-actions">
                <div class="action-buttons">
                  <app-button 
                    variant="ghost" 
                    size="sm"
                    (clicked)="editCourse(course.id)">
                    Sửa
                  </app-button>
                  
                  @if (course.status !== 'APPROVED') {
                    <app-button 
                      variant="primary" 
                      size="sm"
                      [disabled]="publishingId() === course.id"
                      (clicked)="publish(course.id)">
                      {{ publishingId() === course.id ? 'Đang xuất bản...' : 'Xuất bản' }}
                    </app-button>
                  }
                  
                  <app-button 
                    variant="danger" 
                    size="sm"
                    [disabled]="deletingId() === course.id"
                    (clicked)="deleteCourse(course.id, course.title)">
                    {{ deletingId() === course.id ? 'Đang xóa...' : 'Xóa' }}
                  </app-button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <!-- Empty State -->
      @if (!loading() && paged().length === 0) {
        <div class="empty-state">
          <app-icon name="book-open" size="xl" />
          <h3>Chưa có khóa học nào</h3>
          <p>Tạo khóa học đầu tiên của bạn</p>
          <app-button variant="primary" (clicked)="createCourse()">
            Tạo khóa học
          </app-button>
        </div>
      }

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <app-loading-spinner />
          <p>Đang tải...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <app-icon name="exclamation-circle" size="xl" />
          <p>{{ error() }}</p>
          <app-button variant="ghost" (clicked)="loadCourses()">
            Thử lại
          </app-button>
        </div>
      }
    </div>

    <!-- Pagination -->
    <div class="pagination-bar">
      <div class="page-size-selector">
        <span>Hiển thị</span>
        <select [(ngModel)]="pageSize" (change)="onPageSizeChange()">
          <option [value]="5">5</option>
          <option [value]="10">10</option>
          <option [value]="20">20</option>
        </select>
        <span>mỗi trang</span>
      </div>
      
      <div class="page-navigation">
        <app-button 
          variant="ghost" 
          size="sm"
          [disabled]="pageIndex() <= 1"
          (clicked)="prevPage()">
          Trước
        </app-button>
        <span class="page-info">Trang {{ pageIndex() }} / {{ totalPages() }}</span>
        <app-button 
          variant="ghost" 
          size="sm"
          [disabled]="pageIndex() >= totalPages()"
          (clicked)="nextPage()">
          Sau
        </app-button>
      </div>
      
      <div class="total-count">
        Tổng: {{ total() }}
      </div>
    </div>
  </div>

  <!-- Sidebar (30%) -->
  <aside class="sidebar">
    <!-- Quick Stats Widget -->
    <app-card class="widget">
      <h3 class="widget-title">Thống kê nhanh</h3>
      <div class="stats-list">
        <div class="stat-item">
          <span class="stat-label">Đang hoạt động</span>
          <span class="stat-value">{{ activeCourses().length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Nháp</span>
          <span class="stat-value">{{ draftCourses().length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Tổng học viên</span>
          <span class="stat-value">{{ totalStudents() }}</span>
        </div>
      </div>
    </app-card>

    <!-- Recent Activity Widget -->
    <app-card class="widget">
      <h3 class="widget-title">Hoạt động gần đây</h3>
      <div class="activity-list">
        @for (activity of recentActivities(); track activity.id) {
          <div class="activity-item">
            <div class="activity-icon">
              <app-icon [name]="activity.icon" size="sm" />
            </div>
            <div class="activity-content">
              <p class="activity-text">{{ activity.text }}</p>
              <p class="activity-time">{{ activity.time }}</p>
            </div>
          </div>
        }
      </div>
    </app-card>
  </aside>
</div>
```

## Implementation Strategy

### Phase 1: Foundation (Week 1)
1. Update design tokens (colors, typography, spacing)
2. Create/update shared UI components (buttons, cards, badges)
3. Update layout components (header, sidebar)
4. Ensure consistency with Student Portal

### Phase 2: Dashboard (Week 2)
1. Redesign dashboard layout
2. Update KPI cards
3. Improve recent courses list
4. Improve pending assignments list

### Phase 3: Core Features (Week 3-4)
1. Course Management table redesign
2. Assignment Management redesign
3. Student Management table redesign
4. Grading interface improvements

### Phase 4: Polish (Week 5)
1. Add loading states
2. Add transitions
3. Accessibility improvements
4. Mobile responsive testing
5. Performance optimization

## SCSS Styles for Course Management

```scss
@import '../../../../styles/variables';

/* ===== COURSE MANAGEMENT CONTAINER ===== */
.course-management-container {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 32px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 48px;
  background: $bg-page;
  min-height: 100vh;

  @include mobile {
    grid-template-columns: 1fr;
    padding: 24px 16px;
    gap: 24px;
  }
}

/* ===== MAIN CONTENT ===== */
.main-content {
  min-width: 0;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  @include mobile {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
}

.page-title {
  font-size: 28px;
  font-weight: $font-bold;
  color: $text-primary;
  margin: 0;
  letter-spacing: -0.5px;
}

/* Filters Bar */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 20px;
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  box-shadow: $shadow-sm;

  @include mobile {
    flex-direction: column;
  }
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid $border-default;
  border-radius: $radius-sm;
  font-size: $text-sm;
  color: $text-primary;
  background: white;
  transition: border-color $transition-fast;

  &::placeholder {
    color: $text-muted;
  }

  &:focus {
    outline: none;
    border-color: $blue-primary;
    box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.1);
  }
}

.filter-select {
  min-width: 180px;
  padding: 10px 16px;
  border: 1px solid $border-default;
  border-radius: $radius-sm;
  font-size: $text-sm;
  color: $text-primary;
  background: white;
  cursor: pointer;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $gray-400;
  }

  &:focus {
    outline: none;
    border-color: $blue-primary;
    box-shadow: 0 0 0 3px rgba(0, 86, 210, 0.1);
  }

  @include mobile {
    min-width: 100%;
  }
}

/* Table Container */
.table-container {
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  overflow: hidden;
  box-shadow: $shadow-sm;
  margin-bottom: 24px;
}

/* Courses Table */
.courses-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: $gray-50;
    border-bottom: 1px solid $border-default;

    th {
      padding: 16px 20px;
      text-align: left;
      font-size: $text-sm;
      font-weight: $font-semibold;
      color: $text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid $border-light;
      transition: background $transition-fast;

      &:hover {
        background: $gray-50;
      }

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 20px;
      font-size: $text-sm;
      color: $text-primary;
    }
  }
}

.course-code {
  font-family: 'Courier New', monospace;
  font-weight: $font-semibold;
  color: $blue-primary;
  background: $blue-light;
  padding: 4px 12px;
  border-radius: $radius-full;
  display: inline-block;
}

.course-title {
  font-weight: $font-medium;
  @include line-clamp(2);
  max-width: 400px;
}

.course-students {
  text-align: right;
  font-weight: $font-semibold;
}

.course-actions {
  text-align: right;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 24px;
  color: $text-secondary;

  app-icon {
    color: $text-muted;
    margin-bottom: 16px;
  }

  h3 {
    font-size: $text-xl;
    font-weight: $font-semibold;
    color: $text-primary;
    margin: 0 0 8px 0;
  }

  p {
    margin: 0 0 24px 0;
    font-size: $text-base;
  }
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 80px 24px;
  color: $text-secondary;

  p {
    margin-top: 16px;
    font-size: $text-base;
  }
}

/* Error State */
.error-state {
  text-align: center;
  padding: 80px 24px;
  color: $error;

  app-icon {
    margin-bottom: 16px;
  }

  p {
    margin: 0 0 24px 0;
    font-size: $text-base;
  }
}

/* Pagination Bar */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  box-shadow: $shadow-sm;

  @include mobile {
    flex-direction: column;
    gap: 16px;
  }
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: $text-sm;
  color: $text-secondary;

  select {
    padding: 6px 12px;
    border: 1px solid $border-default;
    border-radius: $radius-sm;
    font-size: $text-sm;
    cursor: pointer;
  }
}

.page-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  font-size: $text-sm;
  color: $text-primary;
  font-weight: $font-medium;
}

.total-count {
  font-size: $text-sm;
  color: $text-secondary;
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;

  @include mobile {
    order: -1;
  }
}

.widget {
  padding: 24px;
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

.widget-title {
  font-size: 16px;
  font-weight: $font-semibold;
  color: $text-primary;
  margin: 0 0 16px 0;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-light;

  &:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }
}

.stat-label {
  font-size: $text-sm;
  color: $text-secondary;
}

.stat-value {
  font-size: 20px;
  font-weight: $font-bold;
  color: $text-primary;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: $gray-50;
  border-radius: $radius-sm;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: $radius-full;
  background: $blue-light;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $blue-primary;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: $text-sm;
  color: $text-primary;
  margin: 0 0 4px 0;
}

.activity-time {
  font-size: $text-xs;
  color: $text-muted;
  margin: 0;
}

/* Mobile Table to Cards */
@include mobile {
  .courses-table {
    display: none;
  }

  .course-card-mobile {
    padding: 20px;
    background: white;
    border-bottom: 1px solid $border-light;

    &:last-child {
      border-bottom: none;
    }
  }

  .course-card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 12px;
  }

  .course-card-body {
    margin-bottom: 16px;
  }

  .course-card-footer {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}
```

## Key Reminders

- ⚠️ **Không thay đổi API calls**
- ⚠️ **Không thay đổi data flow**
- ⚠️ **Không thêm business logic mới**
- ⚠️ **Chỉ cải thiện UI/UX**
- ⚠️ **Đồng bộ với Student Portal**
- ✅ Có thể thêm optional fields vào models cho UI
- ✅ Có thể thêm computed signals cho filtering/sorting
- ✅ Có thể thêm CSS/SCSS tùy ý

## Accessibility (Basic)

- Semantic HTML (headings, lists, buttons)
- ARIA labels for icons
- Keyboard navigation
- 4.5:1 color contrast
- Visible focus indicators

## Performance (Simple)

- Lazy load routes
- OnPush change detection
- Image lazy loading
- Simple caching in services

---

**Version**: 1.0 (Simplified & Aligned with Student)  
**Status**: Ready for Implementation  
**Philosophy**: Simple, Professional, Practical, Consistent

