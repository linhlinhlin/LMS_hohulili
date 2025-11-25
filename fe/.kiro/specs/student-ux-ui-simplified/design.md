# Design Document - Student Portal (Simplified)

## Overview

Thiết kế đơn giản, chuyên nghiệp theo phong cách **Coursera**. Focus vào **UI/UX improvements only** - không thay đổi business logic.

### Design Principles
1. **UI/UX Only** - Chỉ cải thiện giao diện, không đụng logic
2. **Simplicity First** - Code đơn giản, dễ maintain
3. **Professional Design** - Clean, minimal (Coursera style)
4. **Practical Over Perfect** - Working code > Perfect architecture  
5. **No Emoji** - Chỉ SVG icons
6. **Keep Existing Logic** - Giữ nguyên API calls, data flow, business rules

### Scope (Rất quan trọng!)
✅ **Được phép:**
- Cải thiện layout, spacing, typography
- Thêm/sửa CSS/SCSS
- Cải thiện component templates (HTML)
- Thêm loading states, transitions
- Responsive design improvements
- Accessibility improvements

❌ **KHÔNG được:**
- Thay đổi API endpoints
- Thay đổi data models (trừ khi chỉ thêm optional fields cho UI)
- Thay đổi business logic
- Thêm features mới (gamification, social, etc.)
- Thay đổi authentication/authorization
- Thay đổi database schema

## Architecture (Simplified)

### Folder Structure
```
src/app/features/student/
├── pages/              # Smart Components
│   ├── dashboard.page.ts
│   ├── courses.page.ts
│   ├── learning.page.ts
│   └── assignments.page.ts
├── components/         # Dumb Components
│   ├── course-card/
│   ├── assignment-card/
│   └── progress-bar/
├── services/           # API + Logic
│   ├── student-api.service.ts
│   └── enrollment.service.ts
└── models/             # Interfaces
    ├── course.model.ts
    └── assignment.model.ts
```

**Không có:** Domain layer, Use cases, Repositories, Value objects

### Data Flow
```
User Action → Page → Service → API
                ↓
            Signal Update
                ↓
            Template Render
```

## Component Design (Coursera Style)

### 1. Dashboard Layout

**Từ Coursera HTML, chúng ta thấy:**
- Header với avatar + greeting: "Good morning, [Name]"
- Career goal section (optional - có thể bỏ)
- Today's goals / Learning plan widget (optional - có thể bỏ)
- Tab navigation: "In Progress" / "Completed"
- Course cards trong grid layout
- Mỗi card có: thumbnail, metadata, progress bar, next item, CTA button

```
┌─────────────────────────────────────────────────┐
│ ┌─┐ Good morning, [Name]                       │
│ └─┘ [Optional: Career goal text]               │
├─────────────────────────────────────────────────┤
│ [In Progress] [Completed]  ← Tabs              │
├─────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐     │
│ │ [Partner Logo]   │ │ [Partner Logo]   │     │
│ │ Course Title     │ │ Course Title     │     │
│ │ Course · 20%     │ │ Course · 45%     │     │
│ │ ████░░░░░░       │ │ ████████░░       │     │
│ │                  │ │                  │     │
│ │ Next: Lesson X   │ │ Next: Quiz Y     │     │
│ │ Video (5 min)    │ │ Widget (15 min)  │     │
│ │ [Resume]    [⋮]  │ │ [Resume]    [⋮]  │     │
│ └──────────────────┘ └──────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Design Specs (từ Coursera):**
- Background: White (#FFFFFF)
- Primary Button: Blue (#0056D2)
- Text: Dark gray headings, medium gray body
- Progress bar: Thin (4px), blue fill
- Card spacing: 16px gap
- Card shadow: Subtle (0 1px 3px rgba(0,0,0,0.1))
- Icons: SVG, 16-20px
- **Không có emoji, không có gamification badges**

### 2. Course Card (Coursera Pattern)

**Từ HTML Coursera:**
- Card có 2 sections: metadata (top) + next item (bottom)
- Metadata: partner logo, title, progress percentage, progress bar
- Next item: icon + type + duration, CTA button
- Menu button (⋮) ở góc phải

```
┌────────────────────────────────────┐
│ [Logo] Partner Name                │
│ Course Title                       │
│ Course · 20% complete              │
│ ████░░░░░░░░░░░░░░░░               │ ← Thin progress bar
├────────────────────────────────────┤
│ [📄] Next Item Title               │
│      Widget (15 minutes)           │
│                                    │
│ [Resume]                      [⋮]  │
└────────────────────────────────────┘
```

**Code Example (Simplified):**
```typescript
@Component({
  selector: 'app-course-card',
  template: `
    <div class="course-card">
      <!-- Metadata Section -->
      <div class="card-header">
        <div class="partner-info">
          <img [src]="course().partnerLogo" class="partner-logo">
          <span class="partner-name">{{ course().partnerName }}</span>
        </div>
        <a [routerLink]="['/courses', course().id]" class="course-title">
          {{ course().title }}
        </a>
        <div class="progress-info">
          <span>Course · {{ course().progress }}% complete</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="course().progress"></div>
        </div>
      </div>

      <!-- Next Item Section -->
      <div class="card-body">
        <div class="next-item">
          <svg class="item-icon"><!-- Icon SVG --></svg>
          <div class="item-info">
            <p class="item-title">{{ course().nextItem.title }}</p>
            <p class="item-meta">
              {{ course().nextItem.type }} 
              <span>({{ course().nextItem.duration }} minutes)</span>
            </p>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-primary" (click)="onResume.emit()">
            Resume
          </button>
          <button class="btn-menu" (click)="onMenu.emit()">
            <svg><!-- Menu icon --></svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .course-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .card-header {
      padding: 16px;
    }
    .partner-logo {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
    .progress-bar {
      height: 4px;
      background: #E5E7EB;
      border-radius: 2px;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      background: #0056D2;
      border-radius: 2px;
    }
    .card-body {
      padding: 16px;
      border-top: 1px solid #E5E7EB;
    }
  `]
})
export class CourseCardComponent {
  course = input.required<Course>();
  onResume = output<void>();
  onMenu = output<void>();
}
```

### 3. Tab Navigation (Coursera Pattern)

**Từ HTML Coursera:** Dashboard có tabs "In Progress" / "Completed"

```typescript
@Component({
  selector: 'app-course-tabs',
  template: `
    <div class="tabs-container">
      <div class="tabs" role="tablist">
        <button 
          class="tab"
          [class.active]="activeTab() === 'in_progress'"
          (click)="activeTab.set('in_progress')"
          role="tab"
          aria-selected="activeTab() === 'in_progress'">
          In Progress
        </button>
        <button 
          class="tab"
          [class.active]="activeTab() === 'completed'"
          (click)="activeTab.set('completed')"
          role="tab"
          aria-selected="activeTab() === 'completed'">
          Completed
        </button>
      </div>
      
      <div class="tab-content" role="tabpanel">
        @if (activeTab() === 'in_progress') {
          <app-course-list [courses]="inProgressCourses()" />
        } @else {
          <app-course-list [courses]="completedCourses()" />
        }
      </div>
    </div>
  `,
  styles: [`
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #E5E7EB;
      margin-bottom: 24px;
    }
    .tab {
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #4B5563;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab.active {
      color: #0056D2;
      border-bottom-color: #0056D2;
    }
  `]
})
export class CourseTabsComponent {
  activeTab = signal<'in_progress' | 'completed'>('in_progress');
  inProgressCourses = computed(() => 
    this.courses().filter(c => c.status === 'in_progress')
  );
  completedCourses = computed(() => 
    this.courses().filter(c => c.status === 'completed')
  );
}
```

### 4. Learning Interface (Keep Simple)

**Lưu ý quan trọng:** Phần này chỉ cải thiện UI/UX, **KHÔNG thay đổi logic hiện tại**

```
┌─────────────────────────────────────────────────┐
│ [< Back to Course] Course Name > Lesson Title   │
├──────┬──────────────────────────────────────────┤
│ ☰    │ [Video Player - HTML5]                   │
│ ──── │                                          │
│ ✓ L1 │ Lesson Content                           │
│ → L2 │ - Text content                           │
│   L3 │ - Images                                 │
│   L4 │ - Embedded resources                     │
│      │                                          │
│      │ [← Previous] [Mark Complete] [Next →]   │
└──────┴──────────────────────────────────────────┘
```

**UI/UX Improvements Only:**
- ✅ Better visual hierarchy (typography, spacing)
- ✅ Clearer lesson list with completion indicators
- ✅ Improved button styling (Coursera-style)
- ✅ Better responsive layout
- ✅ Loading states and transitions
- ❌ **NO new features** (tabs, bookmarks, notes)
- ❌ **NO logic changes** (keep existing auto-save, navigation)
- ❌ **NO custom video controls** (use existing HTML5 player)

## Data Models (Coursera-inspired)

```typescript
interface Course {
  id: string;
  title: string;
  partnerName: string;        // e.g., "Google", "Coursera"
  partnerLogo: string;
  progress: number;           // 0-100
  status: 'in_progress' | 'completed' | 'not_started';
  
  // Next item to resume
  nextItem: {
    title: string;
    type: 'Video' | 'Widget' | 'Reading' | 'Quiz';
    duration: number;         // minutes
    url: string;
  };
  
  // Optional metadata
  estimatedCompletion?: string;  // "Oct 10, 2025"
  courseNumber?: string;         // "Course 1 of 7"
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'quiz' | 'assignment';
  duration: number;
  videoUrl?: string;
  content?: string;
  isCompleted: boolean;
  order: number;
}

interface Assignment {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
}
```

## Design System (Coursera-inspired)

### Colors
```scss
// Primary
$blue-primary: #0056D2;      // Primary button, links
$blue-hover: #004BB8;        // Hover state

// Neutrals
$gray-50: #F9FAFB;          // Page background
$gray-100: #F3F4F6;         // Card hover
$gray-200: #E5E7EB;         // Borders, progress bg
$gray-600: #4B5563;         // Body text
$gray-900: #111827;         // Headings

// Semantic
$success: #059669;          // Completed
$warning: #D97706;          // Due soon
$error: #DC2626;            // Overdue
```

### Typography (Source Sans Pro / Inter)
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

### Spacing (8px grid)
```scss
$spacing-1: 0.25rem;    // 4px
$spacing-2: 0.5rem;     // 8px
$spacing-3: 0.75rem;    // 12px
$spacing-4: 1rem;       // 16px
$spacing-6: 1.5rem;     // 24px
$spacing-8: 2rem;       // 32px
```

### Components
```scss
// Buttons
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

// Cards
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}

// Progress Bar (Coursera style - thin)
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

// Tabs
.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid $gray-200;
  
  .tab {
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: $gray-600;
    font-weight: $font-medium;
    cursor: pointer;
    
    &.active {
      color: $blue-primary;
      border-bottom-color: $blue-primary;
    }
  }
}
```

## State Management (Simple)

```typescript
@Component({...})
export class DashboardPage {
  private api = inject(StudentApiService);
  
  // State
  courses = signal<Course[]>([]);
  isLoading = signal(false);
  
  // Computed
  inProgress = computed(() => 
    this.courses().filter(c => c.progress > 0 && c.progress < 100)
  );
  
  // Methods
  loadCourses() {
    this.isLoading.set(true);
    this.api.getCourses().subscribe({
      next: (data) => this.courses.set(data),
      complete: () => this.isLoading.set(false)
    });
  }
}
```

## Error Handling

```typescript
// Simple error display
<div *ngIf="error()" class="error-banner">
  <p>{{ error() }}</p>
  <button (click)="retry()">Try again</button>
</div>
```

## Performance

- Lazy load routes
- OnPush change detection
- Image lazy loading
- Simple caching

## Accessibility

- Semantic HTML
- ARIA labels for icons
- Keyboard navigation
- 4.5:1 color contrast

## Responsive Layout (Coursera Grid)

### Grid System
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
  
  // Desktop: 3 columns (như Coursera)
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Mobile Optimizations
- ✅ 1 column layout on mobile
- ✅ 44px minimum touch targets
- ✅ Readable text (16px+ body)
- ✅ Collapsible sidebar on learning page
- ✅ Stack buttons vertically on small screens
- ❌ No hamburger menu (keep simple navigation)

## Implementation Notes

### Phase 1: Dashboard
1. Update dashboard layout với Coursera-style header
2. Implement tab navigation (In Progress / Completed)
3. Redesign course cards theo Coursera pattern
4. Add responsive grid layout

### Phase 2: Course Cards
1. Update card structure (metadata + next item sections)
2. Add partner logo display
3. Implement thin progress bar (4px)
4. Add menu button (⋮) với dropdown

### Phase 3: Learning Interface
1. Improve typography và spacing
2. Better lesson list styling
3. Update button styles
4. Add loading states

### Phase 4: Polish
1. Add transitions và hover effects
2. Accessibility improvements
3. Mobile responsive testing
4. Performance optimization

### Key Reminders
- ⚠️ **Không thay đổi API calls**
- ⚠️ **Không thay đổi data flow**
- ⚠️ **Không thêm business logic mới**
- ⚠️ **Chỉ cải thiện UI/UX**
- ✅ Có thể thêm optional fields vào models cho UI
- ✅ Có thể thêm computed signals cho filtering/sorting
- ✅ Có thể thêm CSS/SCSS tùy ý

---

**Version**: 3.0 (Coursera-inspired, UI/UX Only)  
**Status**: Ready for Implementation  
**Updated**: Based on actual Coursera HTML structure
