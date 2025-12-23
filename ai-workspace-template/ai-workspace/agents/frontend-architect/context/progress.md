# Progress - LMS

## Frontend Layer - Deep Analysis

### Tech Stack
- **Framework**: Angular 20 (SSR enabled)
- **Styling**: Tailwind CSS v4 + SCSS design tokens
- **UI Library**: Angular Material 20 + Custom Coursera-style components
- **Icons**: Lucide Angular, Heroicons (40+)
- **Editor**: CKEditor 5
- **Charts**: Chart.js
- **Animations**: GSAP
- **Testing**: Playwright E2E, Karma/Jasmine unit

---

## Project Structure

```
fe/src/app/
├── api/                    # HTTP layer
│   ├── client/             # ApiClient wrapper
│   ├── endpoints/          # 12 API files
│   │   ├── quiz.api.ts     # 408 lines, V2 DDD approach
│   │   ├── question.api.ts # Question CRUD
│   │   └── ...
│   ├── interceptors/       # HTTP interceptors
│   └── types/              # API response types
│
├── core/                   # Core module
│   ├── guards/             # Auth, role guards
│   ├── interceptors/       # Error, auth interceptors
│   ├── services/           # 9 services
│   │   ├── auth.service.ts         # 183 lines, JWT, SSR-safe
│   │   ├── distribution.service.ts # 17KB
│   │   ├── notification.service.ts # 14KB
│   │   └── messaging.service.ts    # 13KB
│   └── utils/              # Utility functions
│
├── features/               # 17 feature modules
│   ├── teacher/ (12 sub-modules)
│   ├── student/ (9 sub-modules)
│   ├── admin/
│   ├── auth/
│   ├── courses/
│   └── ...
│
├── shared/                 # Shared code
│   ├── components/         # 17 folders + 3 standalone
│   ├── directives/
│   ├── models/
│   ├── services/           # 8 shared services
│   ├── types/
│   └── validators/
│
├── state/                  # State management
│   ├── global.state.ts     # 233 lines, unified state
│   ├── course.service.ts   # 11.6KB
│   ├── quiz.service.ts     # 13.3KB
│   └── class.service.ts    # 3.2KB
│
└── types/                  # Global TypeScript types
```

---

## Teacher Module (12 sub-modules)

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **dashboard** | Teacher home, stats | teacher-dashboard.component.ts |
| **courses** | Course list, section-editor | section-editor.component.ts |
| **course-editor** | Full curriculum builder | 6 sub-folders (tabs, pages, store) |
| **quiz** | Quiz bank, create, edit | quiz-bank (36KB), quiz-create (15KB) |
| **assignments** | Assignment management | assignment-submissions.component.ts |
| **assignment-hub** | Unified view | assignment-hub.routes.ts |
| **students** | Student list, detail | student-management.component.ts |
| **grading** | Speed grader | Redirects to assignment-hub |
| **analytics** | Performance reports | teacher-analytics.component.ts |

### Large Files (Need Refactoring)
| File | Size | Reason |
|------|------|--------|
| quiz-bank.component.ts | 36KB (776 lines) | Too many methods (20+) |
| quiz-preview.component.ts | 28KB | Should split into sub-components |
| question-edit.component.ts | 16KB | |

---

## Student Module (9 sub-modules)

| Module | Purpose |
|--------|---------|
| dashboard | Student home |
| pages | Course detail, learning |
| quiz | Quiz taking, results |
| assignments | Submit assignments |
| messages | Student messaging |
| components | Shared UI |
| services | Student-specific API |
| shared | Utilities |

### Large Files
- `student-my-courses.component.ts`: 28KB (needs splitting)

---

## State Management

### GlobalState (233 lines)
Signal-based unified state service:
- Network status monitoring
- Activity tracking
- Role-based dashboard data (computed)
- Permission checks
- Global search across courses/messages

```typescript
// Signals
_isInitializing = signal<boolean>(true)
_networkStatus = signal<'online' | 'offline'>('online')

// Computed
studentDashboardData = computed(...)
teacherDashboardData = computed(...)
adminDashboardData = computed(...)
```

### AuthService (183 lines)
- BehaviorSubject for currentUser$
- JWT token storage (localStorage)
- SSR-safe guards (`typeof localStorage !== 'undefined'`)
- Role-based checks (`hasRole()`)

---

## UI Component Library

### Coursera-Style Design System
Located: `shared/components/ui/`

| Component | Features |
|-----------|----------|
| **Button** | 4 variants (primary, ghost, outline, text), 3 sizes |
| **Card** | Shadow, hover, bordered variants |
| **Progress Bar** | 4px thin, shimmer effect, accessible |
| **Loading Spinner** | 3 sizes, 3 modes (inline, centered, overlay) |
| **Tabs** | Underline indicator, badge support |
| **Icon** | 40+ Heroicons, 5 sizes |

### Design Tokens
```scss
$blue-primary: #0056D2;  // Coursera blue
$spacing: 8px grid;
$border-radius: 4px to 16px;
$transitions: 150ms to 300ms;
```

---

## API Layer

### V2 API (DDD Approach)
quiz.api.ts implements new patterns:
```typescript
// Discriminated union types
type QuizResponseV2 = LessonQuizResponse | AssignmentQuizResponse;

// Type-safe handling
if (quiz.type === 'LESSON_QUIZ') {
  // quiz.lessonId is guaranteed
}
```

### Services (17 total)
| Layer | Count | Notable |
|-------|-------|---------|
| Core | 9 | auth, messaging, notification |
| Shared | 8 | communication (17KB), file-upload (12KB) |

---

## Routing

### Teacher Routes Pattern
- Standalone routes (no sidebar): quiz wizard, course-editor
- Layout routes (with sidebar): dashboard, courses, students
- Legacy redirects for backward compatibility
- Lazy loading via `loadComponent()` / `loadChildren()`

```typescript
// Standalone (no teacher sidebar)
path: 'courses/:id/editor',
loadChildren: () => import('./course-editor/...')

// Layout (with sidebar)
path: '',
loadComponent: () => import('./shared/teacher-layout-simple...')
```

---

## Patterns Identified

### Good Practices ✓
- Signal-based state management
- Lazy loading for all routes
- Coursera-style design system
- V2 DDD API approach
- SSR-safe code guards
- Computed signals for derived state

### Areas for Improvement
- Large component files (should split)
- Some duplicated logic between modules
- Consider standalone components migration

---

**Last Audit**: 2025-12-23
**Audit Depth**: Deep (code-level + pattern analysis)
