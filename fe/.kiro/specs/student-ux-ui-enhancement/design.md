# Design Document - Student UX/UI Enhancement

## Overview

Tài liệu này mô tả chi tiết kiến trúc, thiết kế và kế hoạch cải thiện UX/UI cho toàn bộ hệ thống Student Portal trong LMS Maritime. Dựa trên phân tích chuyên sâu về codebase hiện tại, tài liệu này cung cấp roadmap rõ ràng để nâng cao trải nghiệm người dùng mà không làm ảnh hưởng đến logic nghiệp vụ.

### Design Principles

1. **User-Centric Design**: Tập trung vào nhu cầu và workflow của sinh viên hàng hải
2. **Consistency**: Đảm bảo tính nhất quán về UI patterns, colors, typography trên toàn bộ hệ thống
3. **Accessibility First**: Tuân thủ WCAG 2.1 AA cho tất cả components
4. **Performance**: Tối ưu loading times và perceived performance
5. **Mobile-First**: Thiết kế responsive từ mobile lên desktop
6. **Progressive Enhancement**: Xây dựng từ core functionality lên advanced features
7. **Clean Architecture**: Duy trì separation of concerns theo DDD principles

## Architecture

### Current Architecture Analysis

#### 1. Domain-Driven Design Structure

Hệ thống hiện tại tuân theo DDD với 4 layers rõ ràng:

**Domain Layer** (`domain/`)
- Entities: Course, Assignment, Quiz, Progress, Bookmark
- Value Objects: ProgressPercentage, SessionDuration, CourseSpecifications
- Repositories (Interfaces): CourseRepository, AssignmentRepository, ProgressRepository
- Domain Services: Business logic không thuộc về entities

**Application Layer** (`application/`)
- Use Cases: GetCoursesUseCase, SubmitAssignmentUseCase, TakeQuizUseCase
- Application Services: Orchestrate domain logic
- DTOs: Data transfer between layers

**Infrastructure Layer** (`infrastructure/`)
- Repository Implementations: Concrete implementations với HTTP calls
- External Services: API clients, file upload services

**Presentation Layer** (`presentation/` và root components)
- Components: UI components với OnPush change detection
- State Management: Angular Signals
- Routing: Lazy-loaded feature modules


#### 2. Component Hierarchy

```
StudentPortal
├── StudentLayoutComponent (Layout wrapper)
│   ├── StudentSidebarComponent (Navigation)
│   └── RouterOutlet (Content area)
│       ├── EnhancedStudentDashboardComponent
│       │   ├── DashboardHeroComponent
│       │   ├── DashboardQuickActionsComponent
│       │   ├── DashboardContinueLearningComponent
│       │   ├── DashboardAssignmentsComponent
│       │   └── DashboardSidebarComponent
│       ├── MyCoursesComponent
│       ├── AssignmentListPageComponent
│       │   ├── AssignmentCardComponent
│       │   ├── AssignmentFilterPanelComponent
│       │   ├── AssignmentPaginationComponent
│       │   └── AssignmentLoadingComponent
│       ├── ProfessionalLearningInterfaceComponent
│       │   ├── VideoPlayerComponent
│       │   ├── NoteTakingComponent
│       │   └── BookmarkSystemComponent
│       └── QuizListComponent
│           ├── QuizAttemptComponent
│           └── QuizResultComponent
```

#### 3. State Management Architecture

**Current Implementation:**
- Angular Signals cho reactive state
- Service-based state management (CourseService, QuizService)
- Component-level state với signals
- No global state management library (NgRx, Akita)

**State Flow:**
```
User Action → Component → Use Case → Repository → API
                ↓
            Signal Update → Computed Values → Template Update
```

#### 4. Routing Architecture

**Current Structure:**
```typescript
/student (StudentLayoutComponent)
  ├── /dashboard (EnhancedStudentDashboardComponent)
  ├── /courses (MyCoursesComponent)
  ├── /assignments (AssignmentListPageComponent)
  │   └── /:id/work (AssignmentWorkComponent)
  ├── /learn (Learning routes)
  │   └── /course/:id (ProfessionalLearningInterfaceComponent)
  ├── /quiz (QuizListComponent)
  │   ├── /take/:id (QuizAttemptComponent)
  │   └── /result (QuizResultComponent)
  ├── /analytics (StudentAnalyticsComponent)
  ├── /profile (StudentProfileComponent)
  └── /forum (StudentForumComponent)
```

**Lazy Loading Strategy:**
- Tất cả feature routes được lazy load
- Guards: studentGuard cho role-based access
- Preloading: None (có thể cải thiện)


## Components and Interfaces

### 1. Dashboard Components

#### 1.1 EnhancedStudentDashboardComponent

**Purpose**: Main landing page cho students, hiển thị overview về courses, assignments, progress

**Current Implementation Analysis:**
- ✅ Sử dụng OnPush change detection
- ✅ Signals cho reactive state
- ✅ Composition pattern với child components
- ✅ Error handling với ErrorHandlingService
- ⚠️ Loading state có thể cải thiện (skeleton screens)
- ⚠️ Không có empty states cho một số sections

**UI Patterns:**
- Hero section với gradient background
- Stats cards grid (4 columns)
- Quick actions cards (3 columns)
- Continue learning list
- Assignments list
- Sidebar với deadlines và achievements

**Data Flow:**
```
EnrollmentService → enrolledCourses signal
                 → completedCourses computed
                 → inProgressCourses computed
                 → enrollmentStats computed
```

**UX Issues Identified:**
1. Loading state không có skeleton screens
2. Empty states thiếu actionable CTAs
3. Stats cards không có animations khi update
4. Quick actions không có loading indicators
5. Không có error recovery options

**Proposed Improvements:**
- Thêm skeleton loading states
- Enhanced empty states với illustrations
- Micro-animations cho stats updates
- Loading indicators cho navigation actions
- Error boundaries với retry options
- Progressive disclosure cho complex data


#### 1.2 DashboardHeroComponent

**Current State:**
- Gradient background (blue-600 → indigo-800)
- User greeting với name
- Achievement badges (streak, level, achievements count)
- Quick stats grid (4 cards)

**Accessibility:**
- ⚠️ Background pattern không có proper ARIA labels
- ⚠️ Stats cards thiếu semantic HTML
- ✅ Color contrast đạt WCAG AA

**Mobile Responsiveness:**
- ✅ Responsive grid (2 cols mobile, 4 cols desktop)
- ⚠️ Text có thể bị truncate trên small screens
- ⚠️ Stats cards có thể quá nhỏ trên mobile

**Proposed Enhancements:**
- Add ARIA landmarks và labels
- Improve mobile layout (stack vertically)
- Add animations cho stats updates
- Personalized greetings based on time of day
- Progress indicators cho achievements

### 2. Learning Interface Components

#### 2.1 ProfessionalLearningInterfaceComponent

**Purpose**: Main learning interface với video player, lesson navigation, content display

**Current Architecture:**
- Split layout: Sidebar (25%) + Main content (75%)
- Lesson navigation với search
- Video player với YouTube support
- Content display với HTML rendering
- File attachments với inline viewers

**Strengths:**
- ✅ Clean separation of concerns
- ✅ Comprehensive file type support (PDF, Office, images, video, audio)
- ✅ Inline PDF viewer
- ✅ YouTube embed support
- ✅ Breadcrumb navigation
- ✅ Access control với enrollment check

**UX Issues:**
1. **Navigation Sidebar**:
   - Fixed width (320px) có thể quá rộng trên tablets
   - Search không có debounce
   - Lesson list không có virtualization (performance issue với nhiều lessons)
   - Không có keyboard shortcuts

2. **Video Player**:
   - Sử dụng native HTML5 video player (thiếu features)
   - Không có playback speed controls
   - Không có quality selection
   - Không có picture-in-picture
   - Không save progress automatically

3. **Content Display**:
   - HTML content không được sanitized properly
   - Không có table of contents cho long content
   - Code blocks không có syntax highlighting
   - Images không có lightbox
   - No print-friendly view

4. **File Attachments**:
   - PDF viewer có thể fail với CORS
   - Office viewer phụ thuộc vào external service
   - Không có download progress indicator
   - Không có file preview thumbnails


**Proposed Redesign:**

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Breadcrumb | Course Title | Actions                 │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ Lessons  │  Video Player / Content Area                     │
│ Sidebar  │  ┌─────────────────────────────────────────┐    │
│          │  │                                           │    │
│ [Search] │  │         Video / Content Display          │    │
│          │  │                                           │    │
│ Lesson 1 │  └─────────────────────────────────────────┘    │
│ Lesson 2 │                                                   │
│ Lesson 3 │  Tabs: [Overview] [Attachments] [Notes]         │
│ ...      │                                                   │
│          │  Content based on selected tab                   │
│          │                                                   │
│          │  [Previous] [Mark Complete] [Next]               │
└──────────┴──────────────────────────────────────────────────┘
```

**Key Improvements:**
1. Collapsible sidebar cho more screen space
2. Tabbed interface cho better organization
3. Enhanced video player với custom controls
4. Keyboard shortcuts (Space: play/pause, Arrow keys: seek, F: fullscreen)
5. Auto-save progress every 30 seconds
6. Offline support với service worker
7. Picture-in-picture mode
8. Speed controls (0.5x - 2x)
9. Quality selection (auto, 1080p, 720p, 480p)
10. Captions/subtitles support

### 3. Assignment Components

#### 3.1 AssignmentListPageComponent

**Current Implementation:**
- Comprehensive filtering system
- Grid/List view toggle
- Bulk selection mode
- Pagination
- Stats dashboard
- Loading states

**Strengths:**
- ✅ Well-structured state management với AssignmentListState
- ✅ Comprehensive filters (status, type, priority, course, instructor, date range)
- ✅ Bulk actions support
- ✅ Pagination với configurable page size
- ✅ View mode toggle (grid/list)
- ✅ Loading component

**UX Issues:**
1. **Filter Panel**:
   - Filters không collapse được (takes too much space)
   - Không có "active filters" indicator
   - Clear filters button không prominent
   - Không save filter preferences

2. **Assignment Cards**:
   - Quá nhiều information density
   - Priority badges không color-coded properly
   - Due dates không có countdown timer
   - Status không có progress indicator

3. **Bulk Actions**:
   - Selection mode không intuitive
   - Bulk actions limited (chỉ có "mark as read")
   - Không có undo functionality

4. **Empty States**:
   - Generic empty state message
   - Không có suggestions based on filters
   - Không có quick actions


**Proposed Improvements:**

1. **Collapsible Filter Panel**:
```typescript
interface FilterPanelState {
  isExpanded: boolean;
  activeFiltersCount: number;
  savedFilters: FilterPreset[];
}
```

2. **Enhanced Assignment Card**:
```
┌────────────────────────────────────────────┐
│ [Priority Badge]           [Status Badge]  │
│                                             │
│ Assignment Title                            │
│ Course Name • Instructor                    │
│                                             │
│ ⏰ Due in 2 days (Dec 15, 2024)            │
│ 📊 Progress: ████░░░░░░ 40%               │
│                                             │
│ [View Details] [Start Working]              │
└────────────────────────────────────────────┘
```

3. **Smart Empty States**:
- "No pending assignments" → Show completed assignments
- "No assignments for this course" → Suggest other courses
- "All caught up!" → Show achievements/badges

### 4. Quiz Components

#### 4.1 QuizListComponent

**Current State:**
- Grid layout với quiz cards
- Filtering by course, status, time limit
- Quiz metadata display (questions count, time limit, passing score)
- Start quiz button với validation

**Strengths:**
- ✅ Clean card-based layout
- ✅ Comprehensive quiz information
- ✅ Use case pattern (GetQuizListUseCase, TakeQuizUseCase)
- ✅ Validation before starting quiz

**UX Issues:**
1. No quiz preview functionality
2. No practice mode
3. No quiz history/attempts display
4. No difficulty indicators
5. No estimated completion time
6. No tags/topics display

**Proposed Enhancements:**

```
Quiz Card Layout:
┌────────────────────────────────────────────┐
│ [Difficulty: Medium] [Status: Active]      │
│                                             │
│ Quiz Title                                  │
│ Course Name                                 │
│                                             │
│ 📝 20 questions • ⏱️ 45 min • 🎯 70% pass │
│ 🏷️ Navigation, Safety, Regulations        │
│                                             │
│ Your Best: 85% (2 attempts left)           │
│                                             │
│ [Preview] [Start Quiz] [View Results]      │
└────────────────────────────────────────────┘
```

### 5. Course Components

#### 5.1 MyCoursesComponent

**Current Implementation:**
- Enhanced stats dashboard (4 cards)
- Study insights panel
- Upcoming deadlines panel
- Comprehensive filtering
- Rich course cards với multiple actions

**Strengths:**
- ✅ Comprehensive course information
- ✅ Multiple view options (favorite, notes, bookmarks)
- ✅ Study statistics
- ✅ Deadline tracking
- ✅ Certificate download

**UX Issues:**
1. **Course Cards**:
   - Information overload (too many elements)
   - Actions không prioritized
   - Progress bar quá nhỏ
   - Thumbnail không optimized

2. **Filters**:
   - Inline filters take too much space
   - No saved filter presets
   - No quick filters (e.g., "Due this week")

3. **Stats Dashboard**:
   - Static numbers (no trends)
   - No comparison với previous period
   - No goals/targets


**Proposed Redesign:**

```
Simplified Course Card:
┌────────────────────────────────────────────┐
│ [Course Thumbnail]                          │
│ [Progress: 75%] ████████████░░░░           │
├────────────────────────────────────────────┤
│ Course Title                                │
│ Instructor Name                             │
│                                             │
│ 9/12 lessons • Last accessed: 2 hours ago  │
│                                             │
│ [Continue Learning →]                       │
│                                             │
│ ⭐ 4.8 • 🔥 7 day streak • 📝 12 notes    │
└────────────────────────────────────────────┘
```

**Key Changes:**
- Prominent progress bar
- Single primary action (Continue Learning)
- Secondary info collapsed into icons
- Cleaner visual hierarchy

## Data Models

### 1. Student Dashboard Models

```typescript
interface StudentDashboardData {
  user: StudentProfile;
  stats: StudentStats;
  enrolledCourses: EnrolledCourse[];
  pendingAssignments: Assignment[];
  achievements: Achievement[];
  studyStreak: StudyStreak;
  upcomingDeadlines: Deadline[];
}

interface StudentStats {
  totalCourses: number;
  inProgressCourses: number;
  completedCourses: number;
  totalStudyTime: number; // in minutes
  averageGrade: number;
  currentStreak: number; // days
  currentLevel: number;
  achievementsCount: number;
  certificatesCount: number;
}

interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  instructor: string;
  thumbnail: string;
  progress: number; // 0-100
  totalLessons: number;
  completedLessons: number;
  duration: string;
  lastAccessed: Date;
  status: CourseStatus;
  category?: string;
  rating?: number;
  studyTime?: number; // minutes
  averageScore?: number;
  nextLesson?: string;
  studyStreak?: number;
  upcomingDeadlines?: Date[];
  notesCount?: number;
  bookmarksCount?: number;
  isFavorite?: boolean;
  certificate?: Certificate;
}

type CourseStatus = 'enrolled' | 'in-progress' | 'completed' | 'paused' | 'not-started';
```

### 2. Learning Interface Models

```typescript
interface LearningSession {
  id: string;
  courseId: string;
  lessonId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  progress: number; // 0-100
  completed: boolean;
  bookmarks: Bookmark[];
  notes: Note[];
}

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  content?: string;
  videoUrl: string;
  duration: number; // seconds
  thumbnail: string;
  courseId: string;
  order: number;
  isCompleted: boolean;
  watchedDuration: number;
  lastWatchedAt: Date;
  bookmarks: VideoBookmark[];
  notes: VideoNote[];
  attachments?: LessonAttachment[];
}

interface LessonAttachment {
  id: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
}
```


### 3. Assignment Models

```typescript
interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  courseId: string;
  instructorId: string;
  dueDate: string | Date;
  type: AssignmentType;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  totalPoints: number;
  earnedPoints?: number;
  submittedAt?: Date;
  gradedAt?: Date;
  feedback?: string;
  attachments?: AssignmentAttachment[];
  rubric?: Rubric;
}

type AssignmentType = 'assignment' | 'quiz' | 'project' | 'essay' | 'presentation';
type AssignmentStatus = 'pending' | 'in-progress' | 'submitted' | 'graded' | 'overdue';
type AssignmentPriority = 'low' | 'medium' | 'high' | 'urgent';

interface AssignmentFilters {
  searchQuery?: string;
  status?: AssignmentStatus[];
  type?: AssignmentType[];
  priority?: AssignmentPriority[];
  courseId?: string[];
  instructorId?: string[];
  dateRange?: DateRange;
}

interface AssignmentStats {
  totalAssignments: number;
  pendingAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  averageGrade: number;
  submissionRate: number;
}
```

### 4. Quiz Models

```typescript
interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  questions: QuizQuestion[];
  timeLimit: number; // minutes
  passingScore: number; // percentage
  totalPoints: number;
  maxAttempts: number;
  isActive: boolean;
  dueDate?: Date;
  instructions?: string;
  allowReview: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
}

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
  media?: QuestionMedia;
}

type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'matching';

interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  answers: QuizAnswer[];
  score: number;
  passed: boolean;
  timeSpent: number; // seconds
  attemptNumber: number;
}
```

## Error Handling

### Current Implementation

**ErrorHandlingService:**
- Centralized error handling
- Context-based error messages
- Success notifications
- API error parsing
- Navigation error handling

**Strengths:**
- ✅ Consistent error handling across app
- ✅ User-friendly error messages
- ✅ Context awareness

**Issues:**
1. No error recovery strategies
2. No offline error handling
3. No error logging/reporting
4. Toast notifications can be missed
5. No error boundaries for component crashes


### Proposed Error Handling Strategy

```typescript
interface ErrorHandlingStrategy {
  // Error Classification
  classify(error: any): ErrorType;
  
  // Error Recovery
  canRecover(error: ErrorType): boolean;
  recover(error: ErrorType): Promise<void>;
  
  // User Feedback
  getUserMessage(error: ErrorType): ErrorMessage;
  getSuggestedActions(error: ErrorType): Action[];
  
  // Error Reporting
  shouldReport(error: ErrorType): boolean;
  report(error: ErrorType, context: ErrorContext): void;
}

type ErrorType = 
  | 'network-error'
  | 'authentication-error'
  | 'authorization-error'
  | 'validation-error'
  | 'not-found-error'
  | 'server-error'
  | 'client-error'
  | 'unknown-error';

interface ErrorMessage {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  dismissible: boolean;
  autoHide: boolean;
  duration?: number;
}

interface Action {
  label: string;
  handler: () => void;
  primary: boolean;
}
```

**Error UI Patterns:**

1. **Inline Errors** (Form validation):
```html
<div class="field-error">
  <svg class="error-icon">...</svg>
  <span>Email is required</span>
</div>
```

2. **Toast Notifications** (Non-critical errors):
```html
<div class="toast toast-error">
  <svg class="icon">...</svg>
  <div class="content">
    <strong>Failed to save</strong>
    <p>Your changes could not be saved. Please try again.</p>
  </div>
  <button class="retry">Retry</button>
  <button class="dismiss">×</button>
</div>
```

3. **Modal Dialogs** (Critical errors):
```html
<div class="modal-error">
  <svg class="error-icon-large">...</svg>
  <h2>Connection Lost</h2>
  <p>We couldn't connect to the server. Please check your internet connection.</p>
  <div class="actions">
    <button class="primary">Retry</button>
    <button class="secondary">Go Offline</button>
  </div>
</div>
```

4. **Error Boundaries** (Component crashes):
```html
<div class="error-boundary">
  <svg class="error-icon">...</svg>
  <h3>Something went wrong</h3>
  <p>This component encountered an error. Please refresh the page.</p>
  <button class="primary">Refresh Page</button>
  <button class="secondary">Report Issue</button>
</div>
```

## Testing Strategy

### 1. Unit Testing

**Components to Test:**
- All presentation components
- State management services
- Use cases
- Domain entities and value objects
- Utility functions

**Testing Approach:**
```typescript
describe('EnhancedStudentDashboardComponent', () => {
  it('should display enrolled courses', () => {
    // Arrange
    const mockCourses = createMockCourses();
    component.enrolledCourses.set(mockCourses);
    
    // Act
    fixture.detectChanges();
    
    // Assert
    expect(compiled.querySelectorAll('.course-card').length).toBe(mockCourses.length);
  });
  
  it('should handle empty state', () => {
    // Arrange
    component.enrolledCourses.set([]);
    
    // Act
    fixture.detectChanges();
    
    // Assert
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
  });
});
```


### 2. Integration Testing

**Focus Areas:**
- Component interactions
- State management flow
- API integration
- Routing and navigation
- Error handling

### 3. E2E Testing (Playwright)

**Critical User Journeys:**
1. Student login → Dashboard → View course → Start lesson
2. Student → Assignments → Filter → Submit assignment
3. Student → Quiz → Take quiz → View results
4. Student → Courses → Enroll → Start learning

```typescript
test('Student can complete a lesson', async ({ page }) => {
  // Login
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'student@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to course
  await page.waitForURL('/student/dashboard');
  await page.click('.course-card:first-child .continue-button');
  
  // Complete lesson
  await page.waitForURL(/\/student\/learn\/course\/.+/);
  await page.click('.mark-complete-button');
  
  // Verify completion
  await expect(page.locator('.lesson-completed-badge')).toBeVisible();
});
```

### 4. Accessibility Testing

**Tools:**
- axe-core for automated testing
- Manual keyboard navigation testing
- Screen reader testing (NVDA, JAWS)
- Color contrast analyzer

**Checklist:**
- [ ] All interactive elements keyboard accessible
- [ ] Proper focus management
- [ ] ARIA labels on all icons and buttons
- [ ] Semantic HTML structure
- [ ] Color contrast ratios meet WCAG AA
- [ ] Form labels and error messages
- [ ] Skip links for navigation
- [ ] Heading hierarchy

### 5. Performance Testing

**Metrics to Track:**
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3.5s
- Cumulative Layout Shift (CLS) < 0.1
- First Input Delay (FID) < 100ms

**Tools:**
- Lighthouse CI
- WebPageTest
- Chrome DevTools Performance
- Bundle analyzer

## Design System

### 1. Color Palette

**Primary Colors:**
```scss
$blue-50: #eff6ff;
$blue-100: #dbeafe;
$blue-500: #3b82f6;
$blue-600: #2563eb;
$blue-700: #1d4ed8;
$blue-800: #1e40af;
```

**Semantic Colors:**
```scss
// Success
$green-50: #f0fdf4;
$green-600: #16a34a;
$green-700: #15803d;

// Warning
$orange-50: #fff7ed;
$orange-600: #ea580c;
$orange-700: #c2410c;

// Error
$red-50: #fef2f2;
$red-600: #dc2626;
$red-700: #b91c1c;

// Info
$purple-50: #faf5ff;
$purple-600: #9333ea;
$purple-700: #7e22ce;
```

**Neutral Colors:**
```scss
$gray-50: #f9fafb;
$gray-100: #f3f4f6;
$gray-200: #e5e7eb;
$gray-300: #d1d5db;
$gray-400: #9ca3af;
$gray-500: #6b7280;
$gray-600: #4b5563;
$gray-700: #374151;
$gray-800: #1f2937;
$gray-900: #111827;
```


### 2. Typography

**Font Family:**
```scss
$font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
$font-mono: 'Fira Code', 'Courier New', monospace;
```

**Font Sizes:**
```scss
$text-xs: 0.75rem;    // 12px
$text-sm: 0.875rem;   // 14px
$text-base: 1rem;     // 16px
$text-lg: 1.125rem;   // 18px
$text-xl: 1.25rem;    // 20px
$text-2xl: 1.5rem;    // 24px
$text-3xl: 1.875rem;  // 30px
$text-4xl: 2.25rem;   // 36px
```

**Font Weights:**
```scss
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;
```

**Line Heights:**
```scss
$leading-tight: 1.25;
$leading-normal: 1.5;
$leading-relaxed: 1.75;
```

### 3. Spacing System

```scss
$spacing-0: 0;
$spacing-1: 0.25rem;  // 4px
$spacing-2: 0.5rem;   // 8px
$spacing-3: 0.75rem;  // 12px
$spacing-4: 1rem;     // 16px
$spacing-5: 1.25rem;  // 20px
$spacing-6: 1.5rem;   // 24px
$spacing-8: 2rem;     // 32px
$spacing-10: 2.5rem;  // 40px
$spacing-12: 3rem;    // 48px
$spacing-16: 4rem;    // 64px
```

### 4. Border Radius

```scss
$rounded-sm: 0.125rem;   // 2px
$rounded: 0.25rem;       // 4px
$rounded-md: 0.375rem;   // 6px
$rounded-lg: 0.5rem;     // 8px
$rounded-xl: 0.75rem;    // 12px
$rounded-2xl: 1rem;      // 16px
$rounded-full: 9999px;
```

### 5. Shadows

```scss
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### 6. Component Library

#### 6.1 Buttons

```scss
// Primary Button
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-lg;
  @apply hover:bg-blue-700 active:bg-blue-800;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}

// Secondary Button
.btn-secondary {
  @apply px-4 py-2 bg-gray-100 text-gray-700 rounded-lg;
  @apply hover:bg-gray-200 active:bg-gray-300;
  @apply focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}

// Outline Button
.btn-outline {
  @apply px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg;
  @apply hover:bg-blue-50 active:bg-blue-100;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}
```

#### 6.2 Cards

```scss
.card {
  @apply bg-white rounded-xl shadow-sm border border-gray-200;
  @apply hover:shadow-md transition-shadow duration-200;
}

.card-header {
  @apply p-6 border-b border-gray-200;
}

.card-body {
  @apply p-6;
}

.card-footer {
  @apply p-6 border-t border-gray-200 bg-gray-50;
}
```

#### 6.3 Forms

```scss
.form-input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  @apply disabled:bg-gray-100 disabled:cursor-not-allowed;
  @apply transition-colors duration-200;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 mb-2;
}

.form-error {
  @apply text-sm text-red-600 mt-1;
}

.form-help {
  @apply text-sm text-gray-500 mt-1;
}
```


#### 6.4 Badges

```scss
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.badge-primary {
  @apply bg-blue-100 text-blue-800;
}

.badge-success {
  @apply bg-green-100 text-green-800;
}

.badge-warning {
  @apply bg-orange-100 text-orange-800;
}

.badge-error {
  @apply bg-red-100 text-red-800;
}
```

#### 6.5 Progress Bars

```scss
.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-2;
  
  .progress-fill {
    @apply bg-blue-600 h-2 rounded-full transition-all duration-500;
  }
}

.progress-bar-lg {
  @apply h-3;
  
  .progress-fill {
    @apply h-3;
  }
}
```

#### 6.6 Modals

```scss
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 z-50;
  @apply flex items-center justify-center p-4;
}

.modal-content {
  @apply bg-white rounded-xl shadow-xl max-w-lg w-full;
  @apply max-h-[90vh] overflow-y-auto;
}

.modal-header {
  @apply p-6 border-b border-gray-200;
}

.modal-body {
  @apply p-6;
}

.modal-footer {
  @apply p-6 border-t border-gray-200 flex justify-end space-x-3;
}
```

## Maritime-Specific Design Considerations

### 1. Nautical Theme Elements

**Color Palette Extensions:**
```scss
// Maritime Blues
$navy-blue: #001f3f;
$ocean-blue: #0074D9;
$sky-blue: #7FDBFF;

// Maritime Accents
$anchor-gray: #6c757d;
$rope-beige: #f5f5dc;
$signal-red: #FF4136;
$signal-green: #2ECC40;
$signal-yellow: #FFDC00;
```

**Icons and Imagery:**
- Anchor icons for bookmarks
- Compass rose for navigation
- Ship wheel for course selection
- Lighthouse for achievements
- Waves pattern for backgrounds
- Maritime flags for status indicators

### 2. Certification Display

```html
<div class="certificate-card">
  <div class="certificate-header">
    <img src="maritime-seal.svg" alt="Maritime Certification Seal">
    <h3>STCW Basic Safety Training</h3>
  </div>
  <div class="certificate-body">
    <p class="student-name">{{ studentName }}</p>
    <p class="completion-date">Completed: {{ completionDate }}</p>
    <p class="certificate-number">Certificate #{{ certificateNumber }}</p>
  </div>
  <div class="certificate-footer">
    <button class="btn-primary">Download PDF</button>
    <button class="btn-secondary">Share</button>
    <button class="btn-outline">Verify</button>
  </div>
</div>
```

### 3. Maritime Terminology

**UI Text Adaptations:**
- "Dashboard" → "Bridge" (optional, for immersion)
- "Progress" → "Voyage Progress"
- "Achievements" → "Credentials & Certifications"
- "Study Streak" → "Training Days"
- "Course Catalog" → "Training Programs"

### 4. Regulatory Compliance Indicators

```html
<div class="compliance-status">
  <div class="compliance-item">
    <svg class="icon">...</svg>
    <span class="label">STCW Compliant</span>
    <span class="badge badge-success">✓</span>
  </div>
  <div class="compliance-item">
    <svg class="icon">...</svg>
    <span class="label">IMO Approved</span>
    <span class="badge badge-success">✓</span>
  </div>
  <div class="compliance-item">
    <svg class="icon">...</svg>
    <span class="label">MLC 2006</span>
    <span class="badge badge-success">✓</span>
  </div>
</div>
```


## Accessibility Implementation

### 1. Keyboard Navigation

**Global Shortcuts:**
```typescript
const keyboardShortcuts = {
  'Alt + D': 'Go to Dashboard',
  'Alt + C': 'Go to Courses',
  'Alt + A': 'Go to Assignments',
  'Alt + Q': 'Go to Quiz',
  'Alt + P': 'Go to Profile',
  'Alt + /': 'Open Search',
  'Esc': 'Close Modal/Dropdown',
  'Tab': 'Next Element',
  'Shift + Tab': 'Previous Element',
  'Enter': 'Activate Element',
  'Space': 'Toggle/Select'
};
```

**Video Player Shortcuts:**
```typescript
const videoShortcuts = {
  'Space': 'Play/Pause',
  'K': 'Play/Pause',
  'F': 'Fullscreen',
  'M': 'Mute/Unmute',
  'Arrow Left': 'Rewind 5s',
  'Arrow Right': 'Forward 5s',
  'Arrow Up': 'Volume Up',
  'Arrow Down': 'Volume Down',
  '0-9': 'Jump to %',
  'C': 'Toggle Captions',
  '<': 'Decrease Speed',
  '>': 'Increase Speed'
};
```

### 2. Screen Reader Support

**ARIA Labels:**
```html
<!-- Navigation -->
<nav aria-label="Main navigation" role="navigation">
  <ul role="list">
    <li role="listitem">
      <a href="/student/dashboard" 
         aria-label="Dashboard - View your learning overview"
         aria-current="page">
        Dashboard
      </a>
    </li>
  </ul>
</nav>

<!-- Progress Bar -->
<div role="progressbar" 
     aria-valuenow="75" 
     aria-valuemin="0" 
     aria-valuemax="100"
     aria-label="Course progress: 75% complete">
  <div class="progress-fill" style="width: 75%"></div>
</div>

<!-- Loading State -->
<div role="status" aria-live="polite" aria-busy="true">
  <span class="sr-only">Loading courses...</span>
  <div class="spinner"></div>
</div>

<!-- Error Message -->
<div role="alert" aria-live="assertive">
  <p>Failed to load assignments. Please try again.</p>
</div>
```

**Screen Reader Only Text:**
```scss
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 3. Focus Management

```typescript
class FocusManager {
  private focusStack: HTMLElement[] = [];
  
  // Trap focus within modal
  trapFocus(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }
  
  // Save and restore focus
  saveFocus(): void {
    this.focusStack.push(document.activeElement as HTMLElement);
  }
  
  restoreFocus(): void {
    const element = this.focusStack.pop();
    element?.focus();
  }
}
```

### 4. Color Contrast

**WCAG AA Compliance:**
- Normal text (< 18px): Contrast ratio ≥ 4.5:1
- Large text (≥ 18px or ≥ 14px bold): Contrast ratio ≥ 3:1
- UI components and graphics: Contrast ratio ≥ 3:1

**Contrast Checker:**
```typescript
function checkContrast(foreground: string, background: string): {
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
} {
  const fgLuminance = getRelativeLuminance(foreground);
  const bgLuminance = getRelativeLuminance(background);
  
  const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                (Math.min(fgLuminance, bgLuminance) + 0.05);
  
  return {
    ratio,
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7
  };
}
```


## Performance Optimization

### 1. Bundle Optimization

**Current Bundle Size:** 572.37 kB (exceeds 550 kB budget by ~4%)

**Optimization Strategies:**

```typescript
// 1. Lazy load heavy components
const VideoPlayerComponent = () => import('./video-player.component');
const QuizTakingComponent = () => import('./quiz-taking.component');
const ChartComponent = () => import('./chart.component');

// 2. Tree-shakeable imports
import { map, filter } from 'rxjs/operators'; // ✓ Good
import * as rxjs from 'rxjs'; // ✗ Bad

// 3. Dynamic imports for large libraries
async loadPdfViewer() {
  const { PDFViewer } = await import('pdfjs-dist');
  return new PDFViewer();
}

// 4. Code splitting by route
const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component')
  },
  {
    path: 'courses',
    loadComponent: () => import('./courses/courses.component')
  }
];
```

**Bundle Analysis:**
```bash
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

### 2. Image Optimization

```typescript
// Use NgOptimizedImage
<img ngSrc="/assets/course-thumbnail.jpg"
     width="400"
     height="300"
     priority
     alt="Course thumbnail">

// Responsive images
<img ngSrc="/assets/hero.jpg"
     width="1200"
     height="600"
     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
     alt="Hero image">

// Lazy loading
<img ngSrc="/assets/course-image.jpg"
     width="400"
     height="300"
     loading="lazy"
     alt="Course image">
```

**Image Format Strategy:**
- Use WebP with JPEG fallback
- Serve appropriate sizes based on viewport
- Compress images (target: < 100KB per image)
- Use CDN for image delivery

### 3. Lazy Loading Strategies

```typescript
// Component lazy loading
@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    // Lazy load heavy components
    () => import('./charts/chart.component'),
    () => import('./calendar/calendar.component')
  ]
})

// Data lazy loading (Infinite scroll)
class CourseListComponent {
  private page = signal(1);
  private pageSize = 20;
  
  loadMore(): void {
    this.courseService.getCourses({
      page: this.page(),
      limit: this.pageSize
    }).subscribe(courses => {
      this.courses.update(current => [...current, ...courses]);
      this.page.update(p => p + 1);
    });
  }
}

// Virtual scrolling for long lists
<cdk-virtual-scroll-viewport itemSize="100" class="lesson-list">
  @for (lesson of lessons; track lesson.id) {
    <app-lesson-card [lesson]="lesson"></app-lesson-card>
  }
</cdk-virtual-scroll-viewport>
```

### 4. Caching Strategy

```typescript
// HTTP Caching
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, HttpResponse<any>>();
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle(req);
    }
    
    // Check cache
    const cachedResponse = this.cache.get(req.url);
    if (cachedResponse) {
      return of(cachedResponse);
    }
    
    // Make request and cache
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cache.set(req.url, event);
        }
      })
    );
  }
}

// Service Worker Caching
// ngsw-config.json
{
  "dataGroups": [
    {
      "name": "api-cache",
      "urls": ["/api/**"],
      "cacheConfig": {
        "maxSize": 100,
        "maxAge": "1h",
        "strategy": "freshness"
      }
    },
    {
      "name": "static-cache",
      "urls": ["/assets/**"],
      "cacheConfig": {
        "maxSize": 500,
        "maxAge": "7d",
        "strategy": "performance"
      }
    }
  ]
}
```


### 5. Change Detection Optimization

```typescript
// OnPush strategy (already implemented)
@Component({
  selector: 'app-course-card',
  changeDetection: ChangeDetectionStrategy.OnPush
})

// Detach change detection for static content
class HeavyComponent implements OnInit {
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    // Detach for initial render
    this.cdr.detach();
    
    // Manually trigger when needed
    this.dataService.getData().subscribe(data => {
      this.data = data;
      this.cdr.detectChanges();
    });
  }
}

// Use trackBy for *ngFor
<div *ngFor="let course of courses; trackBy: trackByCourseId">
  {{ course.title }}
</div>

trackByCourseId(index: number, course: Course): string {
  return course.id;
}
```

### 6. Network Optimization

```typescript
// Request batching
class BatchRequestService {
  private queue: Request[] = [];
  private batchDelay = 50; // ms
  
  addRequest(request: Request): Observable<Response> {
    return new Observable(observer => {
      this.queue.push({ request, observer });
      
      setTimeout(() => {
        if (this.queue.length > 0) {
          this.processBatch();
        }
      }, this.batchDelay);
    });
  }
  
  private processBatch(): void {
    const batch = this.queue.splice(0);
    // Send batched request
    this.http.post('/api/batch', batch.map(b => b.request))
      .subscribe(responses => {
        batch.forEach((item, index) => {
          item.observer.next(responses[index]);
          item.observer.complete();
        });
      });
  }
}

// Request deduplication
class RequestDeduplicationService {
  private pending = new Map<string, Observable<any>>();
  
  get(url: string): Observable<any> {
    if (this.pending.has(url)) {
      return this.pending.get(url)!;
    }
    
    const request = this.http.get(url).pipe(
      shareReplay(1),
      finalize(() => this.pending.delete(url))
    );
    
    this.pending.set(url, request);
    return request;
  }
}
```

## Mobile Optimization

### 1. Touch-Friendly Design

**Minimum Touch Target Size:** 44x44px (iOS) / 48x48px (Android)

```scss
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
  
  @media (hover: none) {
    // Increase size on touch devices
    min-width: 48px;
    min-height: 48px;
  }
}
```

**Touch Gestures:**
```typescript
class TouchGestureHandler {
  private startX = 0;
  private startY = 0;
  
  onTouchStart(event: TouchEvent): void {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  }
  
  onTouchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    
    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    
    // Swipe detection
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
      if (deltaX > 0) {
        this.onSwipeRight();
      } else {
        this.onSwipeLeft();
      }
    }
  }
  
  onSwipeLeft(): void {
    // Navigate to next lesson
  }
  
  onSwipeRight(): void {
    // Navigate to previous lesson
  }
}
```

### 2. Responsive Breakpoints

```scss
// Mobile First Approach
$breakpoints: (
  'xs': 0,
  'sm': 640px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
  '2xl': 1536px
);

// Usage
.container {
  padding: 1rem;
  
  @media (min-width: 640px) {
    padding: 1.5rem;
  }
  
  @media (min-width: 1024px) {
    padding: 2rem;
  }
}
```

### 3. Mobile Navigation

```html
<!-- Bottom Navigation for Mobile -->
<nav class="mobile-nav" aria-label="Mobile navigation">
  <a href="/student/dashboard" class="nav-item">
    <svg class="icon">...</svg>
    <span>Home</span>
  </a>
  <a href="/student/courses" class="nav-item">
    <svg class="icon">...</svg>
    <span>Courses</span>
  </a>
  <a href="/student/assignments" class="nav-item">
    <svg class="icon">...</svg>
    <span>Tasks</span>
  </a>
  <a href="/student/profile" class="nav-item">
    <svg class="icon">...</svg>
    <span>Profile</span>
  </a>
</nav>

<style>
.mobile-nav {
  @apply fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200;
  @apply flex justify-around items-center h-16 z-50;
  @apply lg:hidden; /* Hide on desktop */
}

.nav-item {
  @apply flex flex-col items-center justify-center flex-1 h-full;
  @apply text-gray-600 hover:text-blue-600 transition-colors;
}
</style>
```


### 4. Offline Support

```typescript
// Service Worker Strategy
@Injectable()
export class OfflineService {
  private isOnline = signal(navigator.onLine);
  
  constructor() {
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }
  
  // Queue requests when offline
  queueRequest(request: HttpRequest<any>): void {
    const queue = this.getQueue();
    queue.push(request);
    localStorage.setItem('offline-queue', JSON.stringify(queue));
  }
  
  // Process queue when back online
  processQueue(): void {
    const queue = this.getQueue();
    queue.forEach(request => {
      this.http.request(request).subscribe();
    });
    localStorage.removeItem('offline-queue');
  }
  
  private getQueue(): HttpRequest<any>[] {
    const queue = localStorage.getItem('offline-queue');
    return queue ? JSON.parse(queue) : [];
  }
}

// Offline UI Indicator
<div *ngIf="!offlineService.isOnline()" class="offline-banner">
  <svg class="icon">...</svg>
  <span>You're offline. Some features may be limited.</span>
  <button (click)="retry()">Retry</button>
</div>
```

## Animation and Micro-interactions

### 1. Page Transitions

```scss
// Route transition animations
:host {
  display: block;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 2. Loading States

```html
<!-- Skeleton Screen -->
<div class="skeleton-card">
  <div class="skeleton-image"></div>
  <div class="skeleton-title"></div>
  <div class="skeleton-text"></div>
  <div class="skeleton-text short"></div>
</div>

<style>
.skeleton-card {
  @apply bg-white rounded-xl p-6 animate-pulse;
}

.skeleton-image {
  @apply w-full h-48 bg-gray-200 rounded-lg mb-4;
}

.skeleton-title {
  @apply h-6 bg-gray-200 rounded w-3/4 mb-3;
}

.skeleton-text {
  @apply h-4 bg-gray-200 rounded w-full mb-2;
}

.skeleton-text.short {
  @apply w-1/2;
}
</style>
```

### 3. Micro-interactions

```scss
// Button hover effect
.btn {
  @apply transition-all duration-200;
  
  &:hover {
    @apply transform scale-105 shadow-lg;
  }
  
  &:active {
    @apply transform scale-95;
  }
}

// Card hover effect
.card {
  @apply transition-all duration-300;
  
  &:hover {
    @apply shadow-xl transform -translate-y-1;
  }
}

// Progress bar animation
.progress-fill {
  @apply transition-all duration-500 ease-out;
}

// Toast notification
.toast {
  animation: slideIn 0.3s ease-out, slideOut 0.3s ease-in 2.7s;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
```

### 4. Loading Spinners

```html
<!-- Spinner Component -->
<div class="spinner" role="status" aria-label="Loading">
  <svg class="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  <span class="sr-only">Loading...</span>
</div>
```

## Security Considerations

### 1. XSS Prevention

```typescript
// Sanitize user input
import { DomSanitizer } from '@angular/platform-browser';

class ContentComponent {
  constructor(private sanitizer: DomSanitizer) {}
  
  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
  }
}

// Use Angular's built-in sanitization
<div [innerHTML]="getSafeHtml(userContent)"></div>
```

### 2. CSRF Protection

```typescript
// CSRF Token Interceptor
@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const csrfToken = this.getCsrfToken();
    
    if (csrfToken && this.shouldAddToken(req)) {
      req = req.clone({
        setHeaders: {
          'X-CSRF-TOKEN': csrfToken
        }
      });
    }
    
    return next.handle(req);
  }
  
  private getCsrfToken(): string | null {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || null;
  }
  
  private shouldAddToken(req: HttpRequest<any>): boolean {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  }
}
```

### 3. Authentication Token Management

```typescript
// Secure token storage
class AuthTokenService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  setToken(token: string): void {
    // Use sessionStorage for sensitive tokens
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }
  
  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }
  
  clearTokens(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
  
  // Auto-refresh token before expiry
  scheduleTokenRefresh(expiresIn: number): void {
    const refreshTime = (expiresIn - 300) * 1000; // 5 minutes before expiry
    setTimeout(() => this.refreshToken(), refreshTime);
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: November 11, 2025  
**Status**: Ready for Review  
**Next Phase**: Implementation Tasks
