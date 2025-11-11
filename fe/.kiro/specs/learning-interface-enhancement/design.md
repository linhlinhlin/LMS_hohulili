# Design Document - Learning Interface Enhancement

## Overview

Thiết kế này mô tả kiến trúc và implementation details cho việc cải thiện Learning Interface của LMS Hàng Hải. Design được lấy cảm hứng từ Coursera và tối ưu hóa cho trải nghiệm học tập trực tuyến chuyên nghiệp.

### Design Goals

1. **Clean & Focused**: Giao diện sạch sẽ, tập trung vào nội dung học tập
2. **Professional**: Thiết kế chuyên nghiệp như các nền tảng học tập hàng đầu
3. **Performant**: Tối ưu hiệu suất, load nhanh, smooth transitions
4. **Accessible**: Hỗ trợ keyboard navigation và screen readers
5. **Responsive**: Hoạt động tốt trên mọi thiết bị

## Architecture

### Component Structure

```
learning-interface/
├── pages/
│   ├── course-overview.component.ts          # Trang tổng quan khóa học
│   └── course-learning.component.ts          # Trang học chính (container)
├── components/
│   ├── lesson-sidebar/
│   │   ├── lesson-sidebar.component.ts       # Sidebar navigation
│   │   ├── lesson-list-item.component.ts     # Item trong danh sách
│   │   └── section-accordion.component.ts    # Accordion cho sections
│   ├── lesson-content/
│   │   ├── lesson-content.component.ts       # Main content area
│   │   ├── lesson-header.component.ts        # Lesson title & metadata
│   │   ├── video-player-wrapper.component.ts # Video player wrapper
│   │   └── lesson-html-content.component.ts  # HTML content renderer
│   ├── attachments/
│   │   ├── attachment-list.component.ts      # Danh sách attachments
│   │   ├── attachment-viewer.component.ts    # Viewer cho attachments
│   │   ├── pdf-viewer.component.ts           # PDF viewer
│   │   ├── office-viewer.component.ts        # Office docs viewer
│   │   └── media-viewer.component.ts         # Image/Video/Audio viewer
│   └── navigation/
│       ├── lesson-navigation.component.ts    # Prev/Next buttons
│       └── breadcrumb.component.ts           # Breadcrumb navigation
├── services/
│   ├── learning.service.ts                   # Learning state management
│   ├── progress-tracking.service.ts          # Progress tracking logic
│   └── file-viewer.service.ts                # File viewing utilities
└── models/
    ├── learning.models.ts                    # TypeScript interfaces
    └── lesson-types.enum.ts                  # Lesson type enums
```

### State Management Strategy

Sử dụng **Angular Signals** cho reactive state management:

```typescript
// learning.service.ts
export class LearningService {
  // Course state
  private courseState = signal<CourseState>({
    course: null,
    sections: [],
    loading: false,
    error: null
  });

  // Lesson state
  private lessonState = signal<LessonState>({
    currentLesson: null,
    loading: false,
    error: null
  });

  // Progress state
  private progressState = signal<ProgressState>({
    completedLessons: new Set<string>(),
    progressPercentage: 0
  });

  // Computed signals
  course = computed(() => this.courseState().course);
  currentLesson = computed(() => this.lessonState().currentLesson);
  isLoading = computed(() => 
    this.courseState().loading || this.lessonState().loading
  );
}
```

## Components and Interfaces

### 1. Course Overview Page

**Purpose**: Hiển thị tổng quan khóa học trước khi bắt đầu học

**Component**: `CourseOverviewComponent`

**Template Structure**:
```html
<div class="course-overview-container">
  <!-- Course Header -->
  <div class="course-header">
    <img [src]="course.thumbnail" alt="Course thumbnail">
    <div class="course-info">
      <h1>{{ course.title }}</h1>
      <p class="instructor">{{ course.instructor }}</p>
      <p class="description">{{ course.description }}</p>
      <div class="course-meta">
        <span>{{ course.sectionsCount }} sections</span>
        <span>{{ course.lessonsCount }} lessons</span>
        <span>{{ course.duration }}</span>
      </div>
    </div>
  </div>

  <!-- Course Content Accordion -->
  <div class="course-content">
    <h2>Course Content</h2>
    @for (section of sections(); track section.id) {
      <app-section-accordion 
        [section]="section"
        [completedLessons]="completedLessons()"
        (lessonClick)="onLessonClick($event)">
      </app-section-accordion>
    }
  </div>

  <!-- Start Learning Button -->
  <div class="action-buttons">
    @if (isEnrolled()) {
      <button (click)="startLearning()">Continue Learning</button>
    } @else {
      <button (click)="enrollCourse()">Enroll Now</button>
    }
  </div>
</div>
```

**Key Features**:
- Expandable section accordions (giống Coursera)
- Lesson completion indicators
- Estimated time for each lesson
- Enroll button nếu chưa đăng ký

### 2. Course Learning Page (Container)

**Purpose**: Container chính cho learning interface

**Component**: `CourseLearningComponent`

**Template Structure**:
```html
<div class="learning-container" [class.sidebar-collapsed]="sidebarCollapsed()">
  <!-- Sidebar -->
  <app-lesson-sidebar
    [course]="course()"
    [sections]="sections()"
    [currentLesson]="currentLesson()"
    [searchQuery]="searchQuery()"
    [collapsed]="sidebarCollapsed()"
    (lessonSelect)="onLessonSelect($event)"
    (searchChange)="onSearchChange($event)"
    (toggleCollapse)="toggleSidebar()">
  </app-lesson-sidebar>

  <!-- Main Content Area -->
  <div class="main-content">
    <!-- Breadcrumb -->
    <app-breadcrumb 
      [course]="course()"
      [currentLesson]="currentLesson()">
    </app-breadcrumb>

    <!-- Lesson Content -->
    @if (isLoadingLesson()) {
      <app-loading-spinner message="Loading lesson..."></app-loading-spinner>
    } @else if (currentLesson()) {
      <app-lesson-content
        [lesson]="currentLesson()"
        (markComplete)="onMarkComplete()"
        (videoStateChange)="onVideoStateChange($event)">
      </app-lesson-content>
    } @else {
      <div class="no-lesson-selected">
        <p>Select a lesson to start learning</p>
      </div>
    }

    <!-- Navigation Buttons -->
    <app-lesson-navigation
      [canGoPrevious]="canGoPrevious()"
      [canGoNext]="canGoNext()"
      (previous)="previousLesson()"
      (next)="nextLesson()">
    </app-lesson-navigation>
  </div>
</div>
```

**Responsive Behavior**:
- Desktop (>1024px): Sidebar visible, 320px width
- Tablet (768-1024px): Collapsible sidebar
- Mobile (<768px): Sidebar as overlay/bottom sheet

### 3. Lesson Sidebar Component

**Purpose**: Navigation sidebar với lesson list

**Component**: `LessonSidebarComponent`

**Key Features**:
- Search box với real-time filtering
- Hierarchical section/lesson structure
- Completion indicators
- Current lesson highlight
- Smooth scroll to current lesson

**Template Structure**:
```html
<aside class="lesson-sidebar" [class.collapsed]="collapsed">
  <!-- Header -->
  <div class="sidebar-header">
    <h2>{{ course.title }}</h2>
    <button (click)="toggleCollapse.emit()" aria-label="Toggle sidebar">
      <i [class]="collapsed ? 'icon-expand' : 'icon-collapse'"></i>
    </button>
  </div>

  <!-- Search Box -->
  <div class="search-box">
    <input 
      type="text"
      placeholder="Search lessons..."
      [value]="searchQuery"
      (input)="onSearchInput($event)">
  </div>

  <!-- Lesson List -->
  <div class="lesson-list">
    @for (section of filteredSections(); track section.id) {
      <div class="section-group">
        <h3 class="section-title">{{ section.title }}</h3>
        @for (lesson of section.lessons; track lesson.id) {
          <app-lesson-list-item
            [lesson]="lesson"
            [isActive]="lesson.id === currentLesson?.id"
            [isCompleted]="isLessonCompleted(lesson.id)"
            (click)="onLessonClick(lesson)">
          </app-lesson-list-item>
        }
      </div>
    }
  </div>
</aside>
```

### 4. Lesson Content Component

**Purpose**: Hiển thị nội dung bài học chính

**Component**: `LessonContentComponent`

**Template Structure**:
```html
<div class="lesson-content">
  <!-- Lesson Header -->
  <app-lesson-header
    [lesson]="lesson"
    [isCompleted]="isCompleted"
    (markComplete)="markComplete.emit()">
  </app-lesson-header>

  <!-- Video Player (if video lesson) -->
  @if (lesson.videoUrl) {
    <app-video-player-wrapper
      [videoUrl]="lesson.videoUrl"
      [thumbnail]="lesson.thumbnail"
      [duration]="lesson.duration"
      (stateChange)="videoStateChange.emit($event)"
      (ended)="onVideoEnded()">
    </app-video-player-wrapper>
  }

  <!-- HTML Content -->
  @if (lesson.content) {
    <app-lesson-html-content
      [content]="lesson.content">
    </app-lesson-html-content>
  }

  <!-- Attachments -->
  @if (lesson.attachments?.length) {
    <app-attachment-list
      [attachments]="lesson.attachments">
    </app-attachment-list>
  }
</div>
```

### 5. Attachment Viewer Components

**Purpose**: Hiển thị và xem các file đính kèm

#### PDF Viewer Component

```typescript
@Component({
  selector: 'app-pdf-viewer',
  template: `
    <div class="pdf-viewer-container">
      <iframe 
        [src]="safeUrl"
        width="100%"
        height="600px"
        frameborder="0">
      </iframe>
      <button (click)="download()">Download PDF</button>
    </div>
  `
})
export class PdfViewerComponent {
  @Input() fileUrl!: string;
  safeUrl: SafeResourceUrl;
  
  constructor(private sanitizer: DomSanitizer) {}
  
  ngOnInit() {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl);
  }
}
```

#### Office Viewer Component

```typescript
@Component({
  selector: 'app-office-viewer',
  template: `
    <div class="office-viewer-container">
      <iframe 
        [src]="officeViewerUrl"
        width="100%"
        height="600px"
        frameborder="0">
      </iframe>
      <button (click)="download()">Download File</button>
    </div>
  `
})
export class OfficeViewerComponent {
  @Input() fileUrl!: string;
  officeViewerUrl: SafeResourceUrl;
  
  ngOnInit() {
    const encodedUrl = encodeURIComponent(this.fileUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    this.officeViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }
}
```

## Data Models

### TypeScript Interfaces

```typescript
// learning.models.ts

export interface CourseOverview {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  sectionsCount: number;
  lessonsCount: number;
  duration: string;
  isEnrolled: boolean;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonSummary[];
}

export interface LessonSummary {
  id: string;
  title: string;
  description: string;
  lessonType: LessonType;
  duration: number; // in minutes
  orderIndex: number;
}

export interface LessonDetail extends LessonSummary {
  content: string; // HTML content
  videoUrl?: string;
  thumbnail?: string;
  attachments: LessonAttachment[];
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  courseTitle: string;
}

export interface LessonAttachment {
  id: string;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  fileType: FileType;
  displayOrder: number;
  uploadedAt: string;
}

export enum LessonType {
  LECTURE = 'LECTURE',
  READING = 'READING',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  LAB = 'LAB'
}

export enum FileType {
  PDF = 'PDF',
  WORD = 'WORD',
  EXCEL = 'EXCEL',
  POWERPOINT = 'POWERPOINT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  OTHER = 'OTHER'
}

export interface ProgressState {
  completedLessons: Set<string>;
  progressPercentage: number;
  lastAccessedLessonId?: string;
}

export interface CourseState {
  course: CourseOverview | null;
  sections: Section[];
  loading: boolean;
  error: string | null;
}

export interface LessonState {
  currentLesson: LessonDetail | null;
  loading: boolean;
  error: string | null;
}
```

## API Integration

### Learning Service

```typescript
@Injectable({ providedIn: 'root' })
export class LearningService {
  private courseApi = inject(CourseApi);
  private lessonApi = inject(LessonApi);
  
  // State signals
  private courseState = signal<CourseState>({
    course: null,
    sections: [],
    loading: false,
    error: null
  });
  
  private lessonState = signal<LessonState>({
    currentLesson: null,
    loading: false,
    error: null
  });
  
  private progressState = signal<ProgressState>({
    completedLessons: new Set<string>(),
    progressPercentage: 0
  });
  
  // Public computed signals
  course = computed(() => this.courseState().course);
  sections = computed(() => this.courseState().sections);
  currentLesson = computed(() => this.lessonState().currentLesson);
  isLoadingCourse = computed(() => this.courseState().loading);
  isLoadingLesson = computed(() => this.lessonState().loading);
  completedLessons = computed(() => this.progressState().completedLessons);
  progressPercentage = computed(() => this.progressState().progressPercentage);
  
  // API Methods
  loadCourse(courseId: string): void {
    this.courseState.update(s => ({ ...s, loading: true, error: null }));
    
    // Load course info and content in parallel
    forkJoin({
      courseInfo: this.courseApi.getCourseById(courseId),
      courseContent: this.courseApi.getCourseContent(courseId)
    }).subscribe({
      next: ({ courseInfo, courseContent }) => {
        const course: CourseOverview = {
          id: courseInfo.data.id,
          title: courseInfo.data.title,
          description: courseInfo.data.description,
          instructor: courseInfo.data.teacherName,
          thumbnail: courseInfo.data.thumbnail || '',
          sectionsCount: courseInfo.data.sectionsCount,
          lessonsCount: this.countLessons(courseContent.data),
          duration: this.calculateTotalDuration(courseContent.data),
          isEnrolled: true // Assume enrolled if we can fetch content
        };
        
        const sections = this.mapSections(courseContent.data);
        
        this.courseState.set({
          course,
          sections,
          loading: false,
          error: null
        });
      },
      error: (err) => {
        this.courseState.update(s => ({
          ...s,
          loading: false,
          error: err.message || 'Failed to load course'
        }));
      }
    });
  }
  
  loadLesson(lessonId: string): void {
    this.lessonState.update(s => ({ ...s, loading: true, error: null }));
    
    this.lessonApi.getLessonById(lessonId).subscribe({
      next: (res) => {
        const lesson: LessonDetail = res.data;
        this.lessonState.set({
          currentLesson: lesson,
          loading: false,
          error: null
        });
      },
      error: (err) => {
        this.lessonState.update(s => ({
          ...s,
          loading: false,
          error: err.message || 'Failed to load lesson'
        }));
      }
    });
  }
  
  markLessonComplete(lessonId: string): void {
    this.progressState.update(state => {
      const newCompleted = new Set(state.completedLessons);
      newCompleted.add(lessonId);
      
      const totalLessons = this.countTotalLessons();
      const progressPercentage = Math.round((newCompleted.size / totalLessons) * 100);
      
      return {
        completedLessons: newCompleted,
        progressPercentage
      };
    });
  }
  
  // Helper methods
  private mapSections(data: CourseContentSection[]): Section[] {
    return data.map(section => ({
      id: section.id,
      title: section.title,
      description: section.description || '',
      orderIndex: section.orderIndex || 0,
      lessons: section.lessons?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || '',
        lessonType: this.determineLessonType(lesson.title),
        duration: 0, // Will be loaded when lesson is selected
        orderIndex: lesson.orderIndex || 0
      })) || []
    }));
  }
  
  private determineLessonType(title: string): LessonType {
    const lower = title.toLowerCase();
    if (lower.includes('quiz')) return LessonType.QUIZ;
    if (lower.includes('assignment')) return LessonType.ASSIGNMENT;
    if (lower.includes('lab')) return LessonType.LAB;
    if (lower.includes('reading')) return LessonType.READING;
    return LessonType.LECTURE;
  }
  
  private countLessons(sections: CourseContentSection[]): number {
    return sections.reduce((total, section) => 
      total + (section.lessons?.length || 0), 0
    );
  }
  
  private calculateTotalDuration(sections: CourseContentSection[]): string {
    // Placeholder - will calculate based on lesson durations
    return '10 hours';
  }
  
  private countTotalLessons(): number {
    return this.sections().reduce((total, section) => 
      total + section.lessons.length, 0
    );
  }
}
```

## Error Handling

### Error States

1. **Network Error**: Hiển thị error message với retry button
2. **403 Forbidden**: Hiển thị access denied với enroll button
3. **404 Not Found**: Hiển thị "Lesson not found" message
4. **Video Load Error**: Hiển thị video error với troubleshooting tips

### Error Component

```typescript
@Component({
  selector: 'app-error-state',
  template: `
    <div class="error-container">
      <i class="error-icon" [class]="errorIcon"></i>
      <h3>{{ errorTitle }}</h3>
      <p>{{ errorMessage }}</p>
      @if (showRetry) {
        <button (click)="retry.emit()">Try Again</button>
      }
      @if (showEnroll) {
        <button (click)="enroll.emit()">Enroll Now</button>
      }
    </div>
  `
})
export class ErrorStateComponent {
  @Input() errorType: 'network' | 'forbidden' | 'notfound' | 'video';
  @Input() errorMessage: string;
  @Output() retry = new EventEmitter<void>();
  @Output() enroll = new EventEmitter<void>();
  
  get errorIcon(): string {
    switch (this.errorType) {
      case 'network': return 'icon-wifi-off';
      case 'forbidden': return 'icon-lock';
      case 'notfound': return 'icon-search';
      case 'video': return 'icon-video-off';
      default: return 'icon-alert';
    }
  }
  
  get errorTitle(): string {
    switch (this.errorType) {
      case 'network': return 'Connection Error';
      case 'forbidden': return 'Access Denied';
      case 'notfound': return 'Not Found';
      case 'video': return 'Video Error';
      default: return 'Error';
    }
  }
  
  get showRetry(): boolean {
    return this.errorType === 'network' || this.errorType === 'video';
  }
  
  get showEnroll(): boolean {
    return this.errorType === 'forbidden';
  }
}
```

## Testing Strategy

### Unit Tests

1. **Component Tests**
   - Test component rendering with different inputs
   - Test event emissions
   - Test computed signals

2. **Service Tests**
   - Test API calls with mocked responses
   - Test state updates
   - Test error handling

3. **Utility Tests**
   - Test file type detection
   - Test duration formatting
   - Test search filtering

### Integration Tests

1. **Navigation Flow**
   - Test lesson selection
   - Test prev/next navigation
   - Test search functionality

2. **Video Player Integration**
   - Test video loading
   - Test video state changes
   - Test auto-complete on video end

3. **Attachment Viewing**
   - Test PDF viewer
   - Test Office viewer
   - Test media player

### E2E Tests

1. **Complete Learning Flow**
   - Navigate to course overview
   - Enroll in course
   - Select and complete lessons
   - Verify progress tracking

2. **Responsive Behavior**
   - Test on different screen sizes
   - Test sidebar collapse/expand
   - Test mobile navigation

## Performance Optimization

### Strategies

1. **Lazy Loading**
   - Lazy load attachment previews
   - Lazy load video thumbnails
   - Virtual scrolling for long lesson lists

2. **Caching**
   - Cache lesson details in service
   - Cache course content
   - Use HTTP cache headers

3. **OnPush Change Detection**
   - Use OnPush strategy for all components
   - Use signals for reactive updates
   - Minimize unnecessary re-renders

4. **Code Splitting**
   - Lazy load attachment viewer components
   - Lazy load video player component
   - Split by route

### Performance Metrics

- **Initial Load**: < 2 seconds
- **Lesson Switch**: < 500ms
- **Search Filter**: < 100ms
- **Video Start**: < 1 second

## Accessibility

### ARIA Labels

- Add aria-labels to all interactive elements
- Use aria-live regions for dynamic updates
- Add aria-expanded for accordions

### Keyboard Navigation

- Tab: Move focus to next element
- Shift+Tab: Move focus to previous element
- Arrow keys: Navigate lessons
- Space: Play/pause video
- Escape: Close modals/sidebar

### Screen Reader Support

- Semantic HTML elements
- Descriptive alt text for images
- Announce state changes
- Skip links for navigation

## Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Optimizations

- Bottom sheet for lesson list
- Touch-friendly buttons (min 44x44px)
- Swipe gestures for prev/next
- Fullscreen video player

---

**Created:** November 11, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Tasks Phase
