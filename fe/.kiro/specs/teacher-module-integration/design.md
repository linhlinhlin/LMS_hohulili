# Design Document - Teacher Module Integration

## Overview

Thiết kế này mô tả chi tiết cách sáp nhập Teacher Module từ ThamKhao vào dự án Angular v20 hiện tại. Chiến lược chính là **Hybrid Merge** - kết hợp logic mới từ ThamKhao với UI/UX improvements từ code hiện tại.

### Key Design Principles

1. **Preserve UI/UX**: Giữ lại tất cả HTML/SCSS files đã được cải tiến
2. **Update Logic**: Merge TypeScript logic mới từ ThamKhao
3. **Incremental Integration**: Merge từng module một, test trước khi tiếp tục
4. **Backward Compatibility**: Đảm bảo không break existing features
5. **Signal-Based State**: Maintain Angular Signals pattern throughout

## Architecture

### Current Architecture (Code hiện tại)

```
src/app/features/teacher/
├── infrastructure/
│   └── services/
│       └── teacher.service.ts          (Signals-based, API integration)
├── types/
│   └── teacher.types.ts                (TypeScript interfaces)
├── shared/
│   ├── teacher-layout-simple.component.ts
│   └── teacher-sidebar-simple.component.ts
├── dashboard/
│   ├── teacher-dashboard.component.ts
│   ├── teacher-dashboard.component.html  (UI improvements)
│   └── teacher-dashboard.component.scss  (UI improvements)
├── courses/
│   ├── components/
│   │   └── course-students-list.component.*
│   ├── course-management.component.*
│   ├── course-creation.component.*
│   └── course-editor.component.*
├── assignments/
│   ├── assignment-management.component.ts
│   ├── assignment-creation.component.ts
│   ├── assignment-editor.component.ts
│   ├── assignment-submissions.component.ts
│   └── enhanced-assignment-creation.component.ts
├── students/
│   ├── student-management.component.*
│   └── student-detail.component.ts
├── quiz/
│   ├── quiz-*.component.ts
│   └── quiz.routes.ts
├── grading/
│   ├── advanced-grading-system.component.ts
│   ├── assignment-grader.component.ts
│   └── rubric-*.component.ts
├── analytics/
│   └── teacher-analytics.component.ts
├── notifications/
│   └── teacher-notifications.component.ts
├── teacher.component.ts
└── teacher.routes.ts
```

### ThamKhao Architecture (Code mới)

```
ThamKhao/frontend/fe/src/app/features/teacher/
├── services/                           (NEW LOCATION)
│   ├── teacher.service.ts              (Updated logic)
│   └── notification.service.ts         (NEW)
├── types/
│   └── teacher.types.ts                (Updated interfaces)
├── shared/
│   ├── teacher-layout-simple.component.ts
│   └── teacher-sidebar-simple.component.ts
├── dashboard/
│   └── teacher-dashboard.component.ts  (Updated logic)
├── courses/
│   ├── course-management.component.ts  (Updated logic)
│   ├── course-creation.component.ts    (Updated logic)
│   ├── course-editor.component.ts      (Updated logic)
│   ├── section-editor.component.ts
│   └── section-list.component.ts
├── assignments/
│   ├── assignment-management.component.ts
│   ├── assignment-creation.component.ts
│   ├── assignment-editor.component.ts
│   ├── assignment-detail.component.ts
│   ├── assignment-submissions.component.ts
│   └── enhanced-assignment-creation.component.ts
├── students/
│   ├── student-management.component.ts (Updated logic)
│   └── student-detail.component.ts
├── quiz/
│   ├── quiz-*.component.ts
│   └── quiz.routes.ts
├── grading/
│   ├── advanced-grading-system.component.ts
│   ├── assignment-grader.component.ts
│   └── rubric-*.component.ts
├── analytics/
│   └── teacher-analytics.component.ts
└── notifications/
    └── teacher-notifications.component.ts
```

### Target Architecture (Sau khi merge)

```
src/app/features/teacher/
├── infrastructure/
│   └── services/
│       ├── teacher.service.ts          (MERGED: ThamKhao logic + current structure)
│       └── notification.service.ts     (NEW: from ThamKhao)
├── types/
│   └── teacher.types.ts                (MERGED: all interfaces)
├── shared/
│   ├── teacher-layout-simple.component.ts (MERGED)
│   └── teacher-sidebar-simple.component.ts (MERGED)
├── dashboard/
│   ├── teacher-dashboard.component.ts  (MERGED: ThamKhao logic)
│   ├── teacher-dashboard.component.html (KEEP: current UI)
│   └── teacher-dashboard.component.scss (KEEP: current UI)
├── courses/
│   ├── components/
│   │   └── course-students-list.component.* (KEEP: current)
│   ├── course-management.component.ts  (MERGED: ThamKhao logic)
│   ├── course-management.component.html (KEEP: current UI)
│   ├── course-management.component.scss (KEEP: current UI)
│   ├── course-creation.component.ts    (MERGED: ThamKhao logic)
│   ├── course-creation.component.html  (KEEP: current UI)
│   ├── course-creation.component.scss  (KEEP: current UI)
│   ├── course-editor.component.ts      (MERGED: ThamKhao logic)
│   ├── course-editor.component.html    (KEEP: current UI)
│   ├── course-editor.component.scss    (KEEP: current UI)
│   ├── section-editor.component.ts     (MERGED)
│   └── section-list.component.ts       (MERGED)
├── assignments/
│   └── [Similar pattern: merge TS, keep HTML/SCSS]
├── students/
│   └── [Similar pattern: merge TS, keep HTML/SCSS]
├── quiz/
│   └── [Merge all files]
├── grading/
│   └── [Merge all files]
├── analytics/
│   └── [Merge all files]
├── notifications/
│   └── [Merge all files]
├── teacher.component.ts
└── teacher.routes.ts                   (MERGED: all routes)
```

## Components and Interfaces

### 1. Service Layer Integration

#### TeacherService Merge Strategy

**Current State:**
- Location: `src/app/features/teacher/infrastructure/services/teacher.service.ts`
- Uses Angular Signals for state management
- Has API integration with `/api/v1/courses/my-courses`
- Mock data for students and assignments

**ThamKhao State:**
- Location: `ThamKhao/frontend/fe/src/app/features/teacher/services/teacher.service.ts`
- Updated API methods
- Better error handling
- More comprehensive state management

**Merge Plan:**
1. Keep current file location (`infrastructure/services/`)
2. Merge new methods from ThamKhao
3. Update API endpoints to match backend
4. Preserve existing Signals structure
5. Add any new Signals from ThamKhao

**Key Methods to Verify:**
```typescript
// Core CRUD operations
- loadMyCourses(page, size)
- createCourse(data)
- updateCourse(id, data)
- deleteCourse(id)
- enrollStudent(courseId, studentId)
- bulkEnrollStudents(courseId, file)

// Assignment operations
- loadAssignments()
- createAssignment(data)
- updateAssignment(id, data)
- deleteAssignment(id)
- gradeAssignment(id, grade)

// Student operations
- loadStudents(courseId)
- getStudentProgress(studentId, courseId)
- removeStudent(courseId, studentId)

// Analytics
- getCourseAnalytics(courseId)
- getTeacherAnalytics()
```

#### NotificationService (NEW)

**Source:** `ThamKhao/frontend/fe/src/app/features/teacher/services/notification.service.ts`

**Target:** `src/app/features/teacher/infrastructure/services/notification.service.ts`

**Action:** Copy entire file to new location

**Features:**
- Real-time notification management
- Notification preferences
- Mark as read/unread
- Filter by type and priority

### 2. Type Definitions Integration

#### teacher.types.ts Merge Strategy

**Current Interfaces:**
```typescript
- TeacherCourse
- TeacherStudent
- TeacherAssignment
- TeacherAnalytics
- CoursePerformance
- StudentEngagement
- Notification
- NotificationPreferences
```

**ThamKhao Additions:**
```typescript
- CreateCourseRequest
- UpdateCourseRequest
- CreateAssignmentRequest
- UpdateAssignmentRequest
- CreateQuizRequest
- GradeSubmissionRequest
- EnrollmentRequest
- BulkEnrollmentRequest
- Section
- Lesson
- Quiz
- Question
- Submission
- Grade
- Rubric
- RubricCriterion
```

**Merge Plan:**
1. Keep all existing interfaces
2. Add all new interfaces from ThamKhao
3. Ensure no naming conflicts
4. Update existing interfaces if ThamKhao has additional fields
5. Add JSDoc comments for clarity

### 3. Component Integration Strategy

#### Dashboard Component

**Files:**
- `teacher-dashboard.component.ts` - MERGE logic from ThamKhao
- `teacher-dashboard.component.html` - KEEP current (has UI improvements)
- `teacher-dashboard.component.scss` - KEEP current (has UI improvements)

**Merge Steps:**
1. Compare TypeScript files side-by-side
2. Identify new methods/properties in ThamKhao version
3. Add new methods to current file
4. Update existing methods if ThamKhao has improvements
5. Ensure all template bindings still work
6. Test component renders correctly

**Key Areas to Check:**
- Signal declarations
- Computed properties
- API calls via TeacherService
- Event handlers
- Lifecycle hooks
- Template variable names

#### Course Management Components

**Components to Merge:**
1. `course-management.component.*`
2. `course-creation.component.*`
3. `course-editor.component.*`
4. `section-editor.component.ts` (NEW)
5. `section-list.component.ts` (NEW)

**Pattern for Each:**
- TS file: Merge logic from ThamKhao
- HTML file: Keep current if exists, else copy from ThamKhao
- SCSS file: Keep current if exists, else copy from ThamKhao

**Special Considerations:**
- `course-students-list.component.*` exists only in current → KEEP
- Section components are NEW → COPY entirely

#### Assignment Components

**Components:**
1. `assignment-management.component.ts`
2. `assignment-creation.component.ts`
3. `assignment-editor.component.ts`
4. `assignment-detail.component.ts`
5. `assignment-submissions.component.ts`
6. `enhanced-assignment-creation.component.ts`

**Merge Strategy:**
- All exist in both versions
- Merge TS logic
- Keep current HTML/SCSS
- Verify form bindings work

#### Student Management Components

**Components:**
1. `student-management.component.*`
2. `student-detail.component.ts`

**Merge Strategy:**
- `student-management`: Has HTML/SCSS in current → merge TS, keep UI
- `student-detail`: Only TS in both → merge logic

#### Quiz, Grading, Analytics, Notifications

**Strategy:**
- These modules are relatively new
- Less likely to have UI improvements in current
- **Approach:** Compare files, if current has HTML/SCSS, keep them; otherwise copy all from ThamKhao

### 4. Routing Integration

#### teacher.routes.ts Merge

**Current Routes:**
```typescript
- /dashboard
- /courses
- /course-creation
- /courses/:id/edit
- /assignments
- /assignment-creation
- /assignments/:id/edit
- /assignments/:id/submissions
- /courses/:courseId/sections/:sectionId/assignments/:assignmentId/submissions
- /students
- /students/:id
- ...quizRoutes
- /analytics
- /grading
- /grading/:id
- /rubrics
- /rubrics/create
- /rubrics/:id/edit
- /notifications
```

**ThamKhao Routes:**
```typescript
- /dashboard
- /courses
- /courses/create (different from current)
- /courses/:id/edit
- /assignments
- /assignments/create (different from current)
- /assignments/:id/edit
- /assignments/:id/submissions
- /students
- /students/:id
- /quiz/* (nested routes)
- /analytics
- /grading
- /grading/rubrics
- /grading/rubrics/create
- /notifications
```

**Merge Plan:**
1. Keep all current routes
2. Add any missing routes from ThamKhao
3. Standardize route naming:
   - Use `/courses/create` instead of `/course-creation`
   - Use `/assignments/create` instead of `/assignment-creation`
4. Ensure all lazy-loaded components exist
5. Verify teacherGuard is applied correctly
6. Test all route navigations

**Route Standardization:**
```typescript
// OLD (current)
/course-creation → /courses/create
/assignment-creation → /assignments/create

// Keep nested routes for submissions
/courses/:courseId/sections/:sectionId/assignments/:assignmentId/submissions
```

## Data Models

### Core Entities

#### TeacherCourse
```typescript
interface TeacherCourse {
  id: string;
  code: string;                    // NEW from ThamKhao
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  status: 'draft' | 'pending' | 'approved' | 'published'; // Updated statuses
  teacherId: string;               // NEW from ThamKhao
  teacherName: string;             // NEW from ThamKhao
  enrolledStudents: number;
  rating: number;
  revenue?: number;
  thumbnail?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  price?: number;
  sections: Section[];             // NEW from ThamKhao
  sectionCount?: number;
  lessonCount?: number;
  skills?: string[];
  prerequisites?: string[];
  certificate?: {
    type: string;
    description: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### Section (NEW)
```typescript
interface Section {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  lessons: Lesson[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Lesson (NEW)
```typescript
interface Lesson {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  duration?: number;
  orderIndex: number;
  resources?: Resource[];
  createdAt: Date;
  updatedAt: Date;
}
```

### API Request/Response Models

#### CreateCourseRequest
```typescript
interface CreateCourseRequest {
  code: string;
  title: string;
  description: string;
  shortDescription?: string;
  category?: string;
  level?: string;
  price?: number;
  thumbnail?: string;
}
```

#### EnrollmentRequest
```typescript
interface EnrollmentRequest {
  courseId: string;
  studentId: string;
}

interface BulkEnrollmentRequest {
  courseId: string;
  file: File; // Excel file with student emails
}
```

## Error Handling

### Service-Level Error Handling

```typescript
class TeacherService {
  private _error = signal<string | null>(null);
  readonly error = computed(() => this._error());

  async loadMyCourses() {
    this._isLoading.set(true);
    this._error.set(null);
    
    try {
      const response = await firstValueFrom(
        this.apiClient.get('/api/v1/courses/my-courses')
      );
      this._courses.set(response.data.content);
    } catch (error) {
      console.error('Failed to load courses:', error);
      this._error.set('Không thể tải danh sách khóa học');
      // Fallback to mock data or show error UI
    } finally {
      this._isLoading.set(false);
    }
  }
}
```

### Component-Level Error Handling

```typescript
class TeacherDashboardComponent {
  teacherService = inject(TeacherService);
  
  error = this.teacherService.error;
  
  // Template can show error message
  // <div *ngIf="error()" class="error-banner">{{ error() }}</div>
}
```

### HTTP Interceptor Integration

- Existing ApiClient handles authentication
- Token refresh on 401
- Global error handling for network issues
- CORS configuration already set in backend

## Testing Strategy

### Phase 1: Unit Testing (Optional)

**Focus:** Critical business logic in services

**Test Cases:**
- TeacherService CRUD operations
- Signal updates on API responses
- Error handling scenarios
- Computed signal calculations

### Phase 2: Integration Testing

**Focus:** Component-Service integration

**Test Approach:**
1. Manual testing in development environment
2. Verify each route loads correctly
3. Test CRUD operations end-to-end
4. Verify UI updates when data changes

**Test Checklist:**
```
Dashboard:
- [ ] Loads course statistics
- [ ] Shows student count
- [ ] Displays recent assignments
- [ ] Charts render correctly

Courses:
- [ ] List all courses
- [ ] Create new course
- [ ] Edit existing course
- [ ] Delete course
- [ ] View course details

Assignments:
- [ ] List assignments
- [ ] Create assignment
- [ ] Edit assignment
- [ ] View submissions
- [ ] Grade submissions

Students:
- [ ] List enrolled students
- [ ] View student details
- [ ] Enroll single student
- [ ] Bulk enroll via Excel
- [ ] Remove student

Quiz:
- [ ] Create quiz
- [ ] Add questions
- [ ] Edit quiz
- [ ] Preview quiz
- [ ] View results

Grading:
- [ ] Create rubric
- [ ] Apply rubric to assignment
- [ ] Grade with rubric
- [ ] View grade distribution

Analytics:
- [ ] View course performance
- [ ] Student engagement metrics
- [ ] Revenue statistics
- [ ] Export reports

Notifications:
- [ ] View notifications
- [ ] Mark as read
- [ ] Filter by type
- [ ] Update preferences
```

### Phase 3: Build Verification

**Commands:**
```bash
# Development build
ng build

# Production build
ng build --configuration production

# Verify no errors
# Check bundle size
# Test in production mode
```

### Phase 4: Browser Testing

**Browsers:**
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (if available)

**Test:**
- All routes accessible
- No console errors
- Responsive design works
- Forms submit correctly

## Integration Phases

### Phase 1: Foundation (Services & Types)
**Duration:** 30 minutes

1. Backup current code
2. Merge teacher.types.ts
3. Merge teacher.service.ts
4. Copy notification.service.ts
5. Build and verify no compilation errors

### Phase 2: Core Components (Dashboard & Courses)
**Duration:** 1 hour

1. Merge dashboard component
2. Merge course management components
3. Copy section components
4. Update routes
5. Test dashboard and course pages

### Phase 3: Extended Features (Assignments, Students)
**Duration:** 1 hour

1. Merge assignment components
2. Merge student components
3. Test assignment and student pages

### Phase 4: Advanced Features (Quiz, Grading, Analytics)
**Duration:** 1 hour

1. Merge quiz components
2. Merge grading components
3. Merge analytics component
4. Merge notifications component
5. Test all advanced features

### Phase 5: Final Integration & Testing
**Duration:** 1 hour

1. Final route configuration
2. Comprehensive testing
3. Fix any remaining issues
4. Documentation
5. Team handover

## Rollback Strategy

### Git-Based Rollback

```bash
# If issues found, rollback to backup branch
git checkout backup/frontend-$(date +%Y%m%d)

# Or cherry-pick specific commits
git cherry-pick <commit-hash>

# Or revert specific files
git checkout HEAD~1 -- src/app/features/teacher/
```

### Incremental Rollback

- Each phase is a separate commit
- Can rollback to any phase
- Preserve working features

### Emergency Rollback

```bash
# Complete rollback
git reset --hard <backup-commit-hash>
git push --force origin main
```

## Performance Considerations

### Lazy Loading

- All teacher routes use lazy loading
- Components loaded on-demand
- Reduces initial bundle size

### Signal-Based Reactivity

- Efficient change detection
- OnPush strategy compatible
- Minimal re-renders

### API Optimization

- Pagination for large lists
- Caching where appropriate
- Debounced search inputs

### Bundle Size

- Monitor bundle size after merge
- Use webpack-bundle-analyzer if needed
- Ensure no duplicate dependencies

## Security Considerations

### Route Guards

- teacherGuard on all teacher routes
- Prevents unauthorized access
- Redirects to login if not authenticated

### API Security

- JWT tokens in Authorization header
- Token refresh mechanism
- CORS properly configured

### Data Validation

- Form validation on client side
- Server-side validation expected
- Sanitize user inputs

## Migration Checklist

### Pre-Migration
- [ ] Read all documentation
- [ ] Understand current architecture
- [ ] Identify UI improvements to preserve
- [ ] Create backup branch
- [ ] Verify build works

### During Migration
- [ ] Merge services first
- [ ] Merge types
- [ ] Merge components incrementally
- [ ] Test after each phase
- [ ] Fix compilation errors immediately

### Post-Migration
- [ ] Full build succeeds
- [ ] All routes accessible
- [ ] No console errors
- [ ] API calls work
- [ ] UI looks correct
- [ ] Create integration report
- [ ] Team review

## Success Criteria

1. ✅ All TypeScript files compile without errors
2. ✅ All routes navigate successfully
3. ✅ All API calls return expected data
4. ✅ UI improvements from current code are preserved
5. ✅ New features from ThamKhao are functional
6. ✅ No regression in existing features
7. ✅ Documentation is complete
8. ✅ Team can maintain the code

## Conclusion

This design provides a comprehensive strategy for merging the Teacher Module from ThamKhao into the current project. The hybrid approach ensures we get the best of both worlds: new functionality and improved UI. The phased approach allows for incremental progress and easy rollback if issues arise.
