# Design - Teacher Dashboard Enhancement

## Overview

Thiết kế Teacher Dashboard theo phong cách Coursera chuyên nghiệp, đồng bộ 100% với Student Dashboard về design system. Focus: UI/UX improvements only.

## Design Principles

1. **Coursera Professional Style** - Clean, minimal, data-focused
2. **Consistency First** - Đồng bộ hoàn toàn với Student Dashboard
3. **Teacher Context** - Hiển thị metrics và actions phù hợp với giảng viên
4. **No Emoji** - Chỉ SVG icons
5. **Simple Implementation** - Không over-engineering

## Layout Structure

### Desktop Layout (>1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ Greeting: Good morning, [Teacher Name]                      │
├─────────────────────────────────────────────────────────────┤
│ KPI Cards (4 columns)                                       │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│ │Courses│ │Active│ │Students│ │Rating│                      │
│ │  24   │ │  18  │ │  156   │ │ 4.8  │                      │
│ └──────┘ └──────┘ └──────┘ └──────┘                       │
├──────────────────────────────────┬──────────────────────────┤
│ Main Column (70%)                │ Sidebar (30%)            │
│                                  │                          │
│ Recent Courses List              │ Teaching Statistics      │
│ ┌────────────────────────────┐  │ ┌──────────────────────┐ │
│ │ ME101 - Maritime Safety    │  │ │ Active Courses: 18   │ │
│ │ [Active] 45 students       │  │ │ Total Students: 156  │ │
│ │ [Edit] [View]              │  │ │ Avg Progress: 67%    │ │
│ └────────────────────────────┘  │ └──────────────────────┘ │
│                                  │                          │
│ Pending Assignments              │ Quick Actions            │
│ ┌────────────────────────────┐  │ ┌──────────────────────┐ │
│ │ Assignment 1               │  │ │ [+ Create Course]    │ │
│ │ 15/25 submitted            │  │ │ [+ Create Assignment]│ │
│ │ [Grade]                    │  │ │ [View All Students]  │ │
│ └────────────────────────────┘  │ └──────────────────────┘ │
└──────────────────────────────────┴──────────────────────────┘
```

### Mobile Layout (<768px)
```
┌─────────────────────────┐
│ Good morning, [Name]    │
├─────────────────────────┤
│ KPI Cards (2x2 grid)    │
│ ┌──────┐ ┌──────┐       │
│ │Courses│ │Active│       │
│ └──────┘ └──────┘       │
│ ┌──────┐ ┌──────┐       │
│ │Students│ │Rating│       │
│ └──────┘ └──────┘       │
├─────────────────────────┤
│ Sidebar Widgets         │
│ (moved to top)          │
├─────────────────────────┤
│ Recent Courses          │
│ (stacked vertically)    │
├─────────────────────────┤
│ Pending Assignments     │
│ (stacked vertically)    │
└─────────────────────────┘
```

## Component Specifications

### 1. Greeting Header

```html
<div class="dashboard-header">
  <h1 class="greeting">{{ getGreeting() }}, {{ getTeacherName() }}</h1>
  <p class="subtitle">Tổng quan giảng dạy của bạn</p>
</div>
```

```scss
.dashboard-header {
  margin-bottom: 32px;
}

.greeting {
  font-size: 28px;
  font-weight: 700;
  color: #1F1F1F;
  margin: 0 0 8px 0;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 15px;
  color: #6B7280;
  margin: 0;
}
```

### 2. KPI Cards

```html
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-icon">
      <app-icon name="academic-cap" size="md" />
    </div>
    <div class="kpi-content">
      <p class="kpi-label">Tổng số khóa học</p>
      <div class="kpi-value-row">
        <h2 class="kpi-value">{{ totalCourses() }}</h2>
        <span class="kpi-trend positive">+12%</span>
      </div>
      <p class="kpi-comparison">vs. tháng trước</p>
    </div>
  </div>
  <!-- Repeat for other KPIs -->
</div>
```

```scss
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kpi-card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}

.kpi-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #0056D2 0%, #004BB8 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 16px;
}

.kpi-label {
  font-size: 13px;
  color: #6B7280;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 700;
  color: #1F1F1F;
  margin: 0;
  line-height: 1;
  letter-spacing: -1px;
}

.kpi-trend {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;

  &.positive {
    color: #10B981;
    background: #D1FAE5;
  }

  &.negative {
    color: #EF4444;
    background: #FEE2E2;
  }
}

.kpi-comparison {
  font-size: 12px;
  color: #9CA3AF;
  margin: 0;
}
```

### 3. Recent Courses List

```html
<div class="section-card">
  <div class="section-header">
    <h2 class="section-title">Khóa học gần đây</h2>
    <a routerLink="/teacher/courses" class="view-all-link">
      Xem tất cả
      <app-icon name="arrow-right" size="xs" />
    </a>
  </div>

  <div class="courses-list">
    @for (course of recentCourses(); track course.id) {
      <div class="course-item">
        <div class="course-info">
          <h3 class="course-title">{{ course.title }}</h3>
          <div class="course-meta">
            <span class="course-category">{{ course.category }}</span>
            <span class="separator">·</span>
            <span class="badge" [class]="'badge-' + course.status">
              {{ course.status }}
            </span>
            <span class="separator">·</span>
            <span class="student-count">{{ course.enrolledStudents }} học viên</span>
          </div>
        </div>
        <div class="course-actions">
          <button class="action-btn" [routerLink]="['/teacher/courses', course.id, 'edit']">
            <app-icon name="pencil" size="xs" />
            Sửa
          </button>
          <button class="action-btn" [routerLink]="['/teacher/courses', course.id]">
            <app-icon name="eye" size="xs" />
            Xem
          </button>
        </div>
      </div>
    }
  </div>
</div>
```

```scss
.section-card {
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F1F1F;
  margin: 0;
  letter-spacing: -0.3px;
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #0056D2;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;

  &:hover {
    color: #004BB8;
  }
}

.courses-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.course-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: #F3F4F6;
  }
}

.course-info {
  flex: 1;
  min-width: 0;
}

.course-title {
  font-size: 15px;
  font-weight: 600;
  color: #1F1F1F;
  margin: 0 0 8px 0;
  @include line-clamp(1);
}

.course-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: #6B7280;

  .separator {
    color: #D1D5DB;
  }
}

.badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &.badge-active {
    background: #D1FAE5;
    color: #10B981;
  }

  &.badge-draft {
    background: #FEF3C7;
    color: #F59E0B;
  }

  &.badge-archived {
    background: #F3F4F6;
    color: #6B7280;
  }
}

.course-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #F9FAFB;
    border-color: #D1D5DB;
  }
}
```


### 4. Pending Assignments List

```html
<div class="section-card">
  <div class="section-header">
    <h2 class="section-title">Bài tập cần chấm</h2>
    <a routerLink="/teacher/assignments" class="view-all-link">
      Xem tất cả
      <app-icon name="arrow-right" size="xs" />
    </a>
  </div>

  <div class="assignments-list">
    @for (assignment of pendingAssignments(); track assignment.id) {
      <div class="assignment-item">
        <div class="assignment-info">
          <h3 class="assignment-title">{{ assignment.title }}</h3>
          <div class="assignment-meta">
            <span class="course-name">{{ assignment.courseTitle }}</span>
            <span class="separator">·</span>
            <span class="due-date" [class.overdue]="isOverdue(assignment.dueDate)">
              Hạn: {{ assignment.dueDate | date:'dd/MM/yyyy' }}
            </span>
            <span class="separator">·</span>
            <span class="submissions">
              {{ assignment.submissions }}/{{ assignment.totalStudents }} nộp
            </span>
          </div>
        </div>
        <button class="grade-btn" [routerLink]="['/teacher/grading', assignment.id]">
          <app-icon name="clipboard-document-check" size="xs" />
          Chấm điểm
        </button>
      </div>
    }
  </div>
</div>
```

```scss
.assignments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.assignment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: #F3F4F6;
  }
}

.assignment-info {
  flex: 1;
  min-width: 0;
}

.assignment-title {
  font-size: 15px;
  font-weight: 600;
  color: #1F1F1F;
  margin: 0 0 8px 0;
  @include line-clamp(1);
}

.assignment-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: #6B7280;

  .separator {
    color: #D1D5DB;
  }

  .due-date {
    &.overdue {
      color: #EF4444;
      font-weight: 600;
    }
  }

  .submissions {
    font-weight: 500;
  }
}

.grade-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #0056D2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #004BB8;
  }
}
```

### 5. Sidebar Widgets

```html
<aside class="sidebar">
  <!-- Teaching Statistics Widget -->
  <div class="widget">
    <h3 class="widget-title">Thống kê giảng dạy</h3>
    <div class="stats-list">
      <div class="stat-item">
        <span class="stat-label">Khóa học đang hoạt động</span>
        <span class="stat-value">{{ activeCourses() }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Tổng học viên</span>
        <span class="stat-value">{{ totalStudents() }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Tiến độ trung bình</span>
        <span class="stat-value">{{ avgProgress() }}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Đánh giá trung bình</span>
        <span class="stat-value">{{ avgRating() }}/5</span>
      </div>
    </div>
  </div>

  <!-- Quick Actions Widget -->
  <div class="widget">
    <h3 class="widget-title">Thao tác nhanh</h3>
    <div class="quick-actions">
      <button class="quick-action-btn" routerLink="/teacher/course-creation">
        <app-icon name="plus" size="sm" />
        <span>Tạo khóa học</span>
      </button>
      <button class="quick-action-btn" routerLink="/teacher/assignment-creation">
        <app-icon name="clipboard-document-list" size="sm" />
        <span>Tạo bài tập</span>
      </button>
      <button class="quick-action-btn" routerLink="/teacher/students">
        <app-icon name="users" size="sm" />
        <span>Xem học viên</span>
      </button>
    </div>
  </div>
</aside>
```

```scss
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 1024px) {
    order: -1; // Move to top on mobile
  }
}

.widget {
  padding: 24px;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.widget-title {
  font-size: 16px;
  font-weight: 600;
  color: #1F1F1F;
  margin: 0 0 16px 0;
  letter-spacing: -0.2px;
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

  &:not(:last-child) {
    padding-bottom: 16px;
    border-bottom: 1px solid #F3F4F6;
  }
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
  font-weight: 400;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1F1F1F;
  letter-spacing: -0.3px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: white;
    border-color: #0056D2;
    color: #0056D2;
  }

  app-icon {
    color: currentColor;
  }
}
```

## Data Models

```typescript
interface DashboardData {
  kpis: {
    totalCourses: number;
    activeCourses: number;
    totalStudents: number;
    averageRating: number;
    trends: {
      courses: number;  // percentage change
      students: number;
      rating: number;
    };
  };
  recentCourses: TeacherCourse[];
  pendingAssignments: TeacherAssignment[];
  statistics: {
    avgProgress: number;
    totalRevenue: number;
    completionRate: number;
  };
}
```

## Component Structure

```typescript
@Component({
  selector: 'app-teacher-dashboard',
  imports: [CommonModule, RouterModule, IconComponent, ButtonComponent, CardComponent],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherDashboardComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private router = inject(Router);

  // State
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Data from service
  courses = this.teacherService.courses;
  students = this.teacherService.students;
  assignments = this.teacherService.assignments;

  // Computed
  totalCourses = computed(() => this.courses().length);
  activeCourses = computed(() => 
    this.courses().filter(c => c.status === 'active').length
  );
  totalStudents = computed(() => this.students().length);
  averageRating = computed(() => {
    const courses = this.courses();
    if (courses.length === 0) return 0;
    const sum = courses.reduce((acc, c) => acc + c.rating, 0);
    return (sum / courses.length).toFixed(1);
  });

  recentCourses = computed(() => 
    this.courses().slice(0, 5)
  );

  pendingAssignments = computed(() =>
    this.assignments()
      .filter(a => a.status === 'pending')
      .slice(0, 5)
  );

  avgProgress = computed(() => {
    const students = this.students();
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + s.progress, 0);
    return Math.round(sum / students.length);
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);
    // Data is already loaded from TeacherService
    // Just set loading to false
    setTimeout(() => this.isLoading.set(false), 500);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getTeacherName(): string {
    // Get from auth service
    return 'Giảng viên';
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }
}
```

## Implementation Notes

### Phase 1: Layout & Structure
1. Create dashboard container với 2-column layout
2. Add greeting header
3. Implement responsive breakpoints

### Phase 2: KPI Cards
1. Create KPI card component
2. Add icons với gradient backgrounds
3. Implement trend indicators
4. Add hover effects

### Phase 3: Lists
1. Implement recent courses list
2. Add pending assignments list
3. Create action buttons
4. Add status badges

### Phase 4: Sidebar
1. Create statistics widget
2. Add quick actions widget
3. Implement responsive behavior

### Phase 5: Polish
1. Add loading states
2. Add empty states
3. Add transitions
4. Test responsive design

## Key Reminders

- ⚠️ **Chỉ cải thiện UI/UX** - Không thay đổi business logic
- ⚠️ **Đồng bộ với Student Dashboard** - Dùng cùng design system
- ⚠️ **Coursera Style** - Clean, minimal, professional
- ⚠️ **No Emoji** - Chỉ SVG icons
- ✅ Có thể thêm computed signals cho derived data
- ✅ Có thể thêm CSS/SCSS tùy ý

---

**Version**: 1.0  
**Status**: Ready for Implementation  
**Philosophy**: Simple, Professional, Coursera Style, Consistent

