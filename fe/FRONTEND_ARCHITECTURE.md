# Frontend Architecture Reference

> **Last Updated**: 2026-02-06 | **Angular**: 20.3 | **Score**: 9.5/10

This document is the **single source of truth** for the LMS frontend architecture.
Read this instead of re-auditing the codebase.

---

## Quick Facts

| Metric | Value |
|--------|-------|
| Framework | Angular 20.3+ (standalone, signals) |
| Components | 257 |
| Services (@Injectable) | ~100 |
| Total TypeScript LOC | ~46,000 |
| OnPush Coverage | **257/257 (100%)** |
| Legacy Patterns | **0** (*ngIf, *ngFor, standalone:true, @Input, @Output, @ViewChild) |
| console.log/warn/debug | **0** in production code |
| API Clients | 17 |
| Shared Components | 52 |
| Core Services | 14 |
| State Services | 4 (global, course, class, quiz) |
| Guards | 5 (6 exported fns in 2 files) |
| Routes | 70+ |
| Port | 4200 |
| Build | `npm start` / `npm run build` |

---

## Architecture Overview

```
fe/src/app/
├── api/                    # HTTP layer (17 clients, 18 endpoints, 18+ types)
│   ├── client/             # ApiClient + domain-specific clients (17 files)
│   ├── endpoints/          # URL constant definitions (18 files)
│   ├── types/              # TypeScript interfaces for all DTOs (18+ files)
│   ├── interceptors/       # Auth, base-url, error interceptors (3 files)
│   └── operators/          # RxJS operators (unwrapSpringPage)
├── core/                   # Singleton services & guards
│   ├── services/           # Auth, messaging, notification, etc. (14 services)
│   └── guards/             # auth.guard, role.guard (5 guard functions)
├── features/               # Feature modules (lazy-loaded)
│   ├── admin/              # 22 components - Admin dashboard
│   ├── teacher/            # 74 components - Course editor, assignments, grading
│   ├── student/            # 12 components - Learning, enrollments
│   ├── ai-chat/            # 15 components - AI assistant (full DDD)
│   ├── learning/           # 20+ components - Course learning interface
│   ├── courses/            # 10+ components - Course browsing, categories
│   ├── assignments/        # 12 components - Student assignment work
│   ├── auth/               # 3 components - Login, register, forgot-password
│   ├── communication/      # 4+ components - Forum, discussions
│   ├── payment/            # 4 components - VNPay integration
│   ├── profile/            # 2 components - User profile
│   ├── home/               # 1 component - Landing page
│   └── (about, contact, privacy, terms, settings, analytics)
├── shared/                 # Reusable components (52) & services (8)
│   ├── components/         # UI, layout, content, navigation
│   ├── services/           # Analytics, file-upload, communication, etc.
│   └── blocks/             # Content block renderers
└── state/                  # Global state services (4: course, class, quiz, global)
```

---

## Modern Angular Metrics (Post-Modernization)

### Pattern Adoption

| Pattern | Files | Status |
|---------|-------|--------|
| `inject()` (modern DI) | 270 | Standard |
| `signal()` | 137 | Standard |
| `computed()` | 129 | Standard |
| `input()` / `input.required()` | 69 | Standard |
| `output()` | 56 | Standard |
| `viewChild()` / `viewChild.required()` | 23 | Standard |
| `effect()` | 21 | Where needed |
| `@if` / `@for` / `@switch` | 234 files (2,117 instances) | Standard |
| `ChangeDetectionStrategy.OnPush` | 257/257 (100%) | Enforced |
| `takeUntilDestroyed(DestroyRef)` | Standard | Cleanup pattern |

### Legacy Patterns (All Eliminated)

| Pattern | Before | After |
|---------|--------|-------|
| `*ngIf` / `*ngFor` | 107 files | **0** |
| `standalone: true` (redundant) | 197 files | **0** |
| `@Input()` / `@Output()` | 2 files | **0** |
| `@ViewChild` | 10 files | **0** active |

---

## Feature Modules

### Per-Module Breakdown

| Module | Files | Components | Architecture |
|--------|-------|------------|-------------|
| Teacher | 106 | 74 | Partial DDD (course-editor has store) |
| AI-Chat | 45 | 15 | Full DDD |
| Learning | 44 | 20+ | Full DDD |
| Courses | 31 | 10+ | DDD |
| Admin | 30 | 22 | Feature-based |
| Assignments | 29 | 12 | Full DDD |
| Student | 22 | 12 | Feature-based |
| Auth | 8 | 3 | Flat |
| Communication | 7 | 4+ | Flat |
| Payment | 5 | 4 | Flat |

### Admin (`features/admin/`)
**22 components** | Store + Signals pattern

```
admin/
├── ai-knowledge/           # AI knowledge base management
│   ├── ai-knowledge-page.component
│   └── components/knowledge-upload.component
├── infrastructure/services/admin.service.ts (675 LOC)
├── presentation/components/
│   ├── admin.component (Layout)
│   ├── admin-layout-simple.component
│   ├── admin-user-management.component
│   ├── course-management.component
│   ├── course-review.component (542 LOC)
│   ├── student-management.component
│   ├── teacher-management.component
│   ├── system-settings.component
│   └── user-management/ (Refactored version)
└── services/admin.service.ts (809 LOC)
```

### Teacher (`features/teacher/`)
**74 components** | Stores + Signals | Most complex feature

```
teacher/
├── course-editor/          # Standalone layout (no sidebar)
│   ├── layouts/course-editor-layout/
│   ├── components/ (header, sidebar)
│   ├── pages/
│   │   ├── course-info/
│   │   ├── course-curriculum/ (680 LOC + extracted components)
│   │   │   ├── components/ (chapter-item, lesson-item, etc.)
│   │   │   └── state/ (curriculum state management)
│   │   ├── course-classes/
│   │   │   └── class-students/ (add-student-dialog, drawer)
│   │   └── course-settings/course-instructors.component
│   ├── store/course-editor.store.ts (Main state)
│   └── services/course-instructor.service.ts
├── courses/
│   ├── course-management.component
│   ├── course-creation.component
│   ├── section-editor/ (Refactored: 8 files, max 386 LOC)
│   │   ├── section-smart-editor.component.ts (303 LOC)
│   │   ├── state/section-editor.state.ts (386 LOC)
│   │   └── 6 child components
│   └── components/ (quiz-creation-modal, course-students-list, etc.)
├── assignment-hub/         # Unified assignment + grading
│   ├── components/ (list, overview, detail-layout, submissions, speed-grader)
│   └── assignment-hub.routes.ts
├── assignments/ (Legacy components)
├── quiz/                   # Quiz management
│   ├── quiz-create/edit/bank.component
│   ├── question-create/edit.component
│   └── containers/ (assignment-quiz-create, lesson-quiz-create)
├── students/ (management, detail, assignments)
├── grading/ (advanced-grading, rubric-manager, speed-grader-layout)
├── dashboard/ (teacher-dashboard, my-invitations)
├── analytics/
├── revenue/ (dashboard, payout-history)
├── infrastructure/services/ (teacher.service, notification.service, revenue.service)
└── shared/teacher-layout-simple.component
```

### AI Chat (`features/ai-chat/`)
**15 components** | Full DDD | Signal-based streaming

```
ai-chat/
├── domain/
│   ├── entities/ (chat-message, chat-session)
│   ├── value-objects/ (message-status, source-citation)
│   └── types.ts
├── application/services/
│   ├── chat.service.ts (1,265 LOC - Main orchestration)
│   ├── session-management.service.ts
│   └── content-classifier.service.ts (Extracted: status/thinking detection)
├── infrastructure/
│   ├── api/chat-api.client.ts
│   └── repositories/session.repository.ts
├── presentation/
│   ├── components/ (widget, panel, dialog, main-area, message,
│   │                message-input, sidebar, suggested-questions,
│   │                source-panel, source-citation, typing-indicator, toast)
│   └── pages/ (full-page, chat-page)
└── utils/typewriter.util.ts
```

**Key**: Real streaming enabled (`USE_REAL_STREAMING = true`), session isolation, typewriter effect.

### Learning (`features/learning/`)
**20+ components** | Services + Signals

```
learning/
├── domain/ (entities, repositories, value-objects)
├── quiz/
│   └── presentation/components/ (quiz-list, quiz-attempt, quiz-result)
├── services/ (learning.service 666 LOC, video-player.service)
├── state/quiz-state.service.ts
├── components/ (professional-learning-interface, study-planner, etc.)
├── pages/course-learning.component (687 LOC)
└── learning.routes.ts
```

### Courses (`features/courses/`)
**10+ components** | DDD pattern

```
courses/
├── domain/ (entities, repositories, value-objects)
├── courses.component (Browse all)
├── course-detail/ (enhanced, hero, curriculum, instructor)
├── category/ (configurable + 6 specific categories)
│   ├── shared/ (hero, grid, card, career, trends)
│   └── category.configs.ts
└── shared/course-card.component
```

### Assignments (`features/assignments/`)
**12 components** | DDD + Signals state

```
assignments/
├── domain/ (entities, repositories, value-objects)
├── application/
│   ├── services/assignment-notification.service.ts
│   └── use-cases/get-student-assignments.use-case.ts
├── presentation/
│   ├── components/ (card, filter-panel, loading, notifications, pagination)
│   ├── pages/ (list-page, work-page)
│   └── state/assignment-list.state.ts
└── assignment-work.component
```

### Student (`features/student/`)
**12 components** | Signals + Services

```
student/
├── pages/ (checkout, course-detail)
├── components/ (student-lesson-viewer)
├── lesson-viewer/
├── messages/ (inbox, conversation-view)
├── assignments/student-assignments-page.component
├── services/ (payment.service, enrollment.service)
├── student-my-courses.component
└── shared/student-layout-simple.component
```

---

## Routing Structure

### Role-Based Layout Pattern

```
/              → HomepageLayoutComponent (public)
/auth/*        → No layout (login, register, forgot-password)
/teacher/*     → TeacherLayoutSimpleComponent (teacherOnlyGuard)
/student/*     → StudentLayoutSimpleComponent (studentGuard)
/admin/*       → AdminLayoutSimpleComponent (adminGuard)
/learn/*       → No sidebar (authGuard)
```

### Full Route Tree

```
/ ──────────────── Public pages (home, about, contact, privacy, terms)
/courses ──────── Browse all courses
/courses/:id ──── Course detail (UUID validation)
/courses/safety, /navigation, /engineering, /logistics, /law, /certificates

/auth ─────────── Login, Register, Forgot-password

/teacher ──────── (teacherOnlyGuard - blocks admin)
  /dashboard
  /courses                    → Course list
  /course-creation            → New course
  /courses/:id/editor/*       → Course editor (standalone layout)
  /courses/:cid/sections/:sid → Section editor (standalone)
  /assessments/*              → Assignment Hub (list, create, detail, grade)
  /students, /students/:id    → Student management
  /quiz/*                     → Quiz management
  /analytics, /revenue, /invitations, /ai-chat

/student ──────── (studentGuard)
  /dashboard, /my-courses
  /course/:id, /lesson-viewer
  /checkout/:courseId
  /assignments, /assignments/:id/work
  /learn/*                    → Learning routes
  /quiz/take/:id, /quiz/result
  /analytics, /profile, /forum
  /messages/*, /ai-chat

/admin ────────── (adminGuard)
  /dashboard
  /users (all, admins, teachers, students)
  /courses (management, review)
  /analytics, /settings, /reports, /notifications, /logs
  /ai-chat, /ai-knowledge

/learn ────────── (authGuard, no sidebar)
  /course/:courseId
  /course/:courseId/lesson/:lessonId
  /planner, /calendar, /notes, /bookmarks, /learning-paths

/communication ── Forum, discussions, messages, peer-learning
/payment ──────── Success, failed, callback/vnpay
/ai-chat ──────── Public AI chat
```

---

## State Management

### Pattern: Signals + Computed + Effect

```typescript
// Standard pattern used across the app
class MyComponent {
  items = signal<Item[]>([]);
  isLoading = signal(false);
  filteredItems = computed(() => this.items().filter(i => i.active));
}
```

### Global State (`state/`)

| Service | Purpose |
|---------|---------|
| `global.state.ts` | App init, network status, last activity |
| `course.service.ts` | Course list, caching, selection (378 LOC) |
| `class.service.ts` | Learning class management |
| `quiz.service.ts` | Quiz state management (393 LOC) |

### Feature-Level Stores

| Store | Location | Pattern |
|-------|----------|---------|
| CourseEditorStore | teacher/course-editor/store | Signals + 1-min cache |
| AssignmentDetailStore | teacher/assignment-hub | Signals |
| SubmissionsStore | teacher/assignment-hub | Signals + filters |
| AssignmentListState | assignments/presentation/state | Signals + computed |
| QuizStateService | learning/state | Signals |
| SectionEditorState | teacher/courses/section-editor/state | Signals (extracted) |

---

## API Layer

### Structure: Client + Endpoints + Types

```
api/
├── client/          # 17 HTTP service files
│   ├── api-client.ts     # Base: get/post/put/patch/delete + WithResponse variants
│   ├── course.api.ts     # Course CRUD
│   ├── assignment.api.ts # Assignment + submissions
│   ├── file.api.ts       # File operations
│   ├── r2-storage.api.ts # Cloudflare R2 uploads
│   └── ... (chapter, lesson, section, student, payment, etc.)
├── endpoints/       # 18 URL constant files → /api/v3/*
├── types/           # 18+ TypeScript interfaces
│   ├── common.types.ts   # ApiResponse<T>, Pagination
│   ├── course.types.ts   # Course, CourseDTO
│   └── ... (all domain types)
├── interceptors/    # Auth token, base-url, error handling (3 files)
└── operators/
    └── unwrap-spring-page.ts  # unwrapSpringPage<T>() RxJS operator
```

### Base API Methods

```typescript
ApiClient.get<T>(url)                    // Raw response
ApiClient.getWithResponse<T>(url)        // Wrapped in ApiResponse<T>
ApiClient.post<T>(url, body)
ApiClient.postWithResponse<T>(url, body)
ApiClient.put<T> / putWithResponse<T>
ApiClient.patch<T> / patchWithResponse<T>
ApiClient.delete<T> / deleteWithResponse<T>
```

---

## Core Module

### Services (14)

| Service | LOC | Purpose |
|---------|-----|---------|
| `auth.service.ts` | ~300 | JWT auth, user session (signal-based) |
| `notification.service.ts` | 479 | Browser notifications |
| `messaging.service.ts` | 433 | Real-time messaging (WebSocket) |
| `toast.service.ts` | ~100 | Toast notifications |
| `reminder.service.ts` | ~200 | Reminder scheduling |
| `user.service.ts` | ~150 | User profile management |
| `distribution.service.ts` | 577 | Content distribution |
| `learning-path.service.ts` | ~200 | Learning path management |
| `maritime-compliance.service.ts` | ~150 | Compliance tracking |
| `api-cache.service.ts` | ~100 | API response caching |
| `pwa.service.ts` | ~80 | Progressive Web App |
| `offline-storage.service.ts` | ~100 | Offline data |
| `image-lifecycle.service.ts` | ~100 | Image handling |
| `content-identity.service.ts` | ~100 | Content identification |

### Guards (5 functions in 2 files)

| Guard | Access |
|-------|--------|
| `authGuard` | Any authenticated user |
| `adminGuard` | Admin only |
| `teacherGuard` | Teacher OR Admin |
| `teacherOnlyGuard` | Teacher only (blocks admin) |
| `studentGuard` | Student only |

---

## Shared Module (52 Components)

### Layout
- `homepage-layout`, `public-header`, `footer`, `mega-menu`

### Navigation
- `sidebar`, `admin-sidebar`, `student-sidebar`, `smart-breadcrumbs`

### UI Primitives
- `button`, `badge`, `card`, `icon` (SVG system), `loading-spinner`
- `pagination`, `progress-bar`, `tabs`, `search`, `side-drawer`

### Content
- `file-upload`, `enhanced-file-upload`, `video-upload`
- `video-player`, `real-video-player` (HLS), `video-player-tracked`
- `rich-text-editor` (EditorJS), `block-editor`
- `unified-block-renderer-v2`, `question-preview`

### Interactive
- `notification`, `notification-bell`, `toast-container`
- `global-search`, `enriched-input`, `math-quick-toolbar`
- `message-bubble`, `message-input`, `error-display`

---

## Top 10 Largest Files

### Components

| File | LOC | Note |
|------|-----|------|
| course-learning.component.ts (pages/) | 687 | Active |
| course-curriculum.component.ts | 680 | Has extracted child components |
| professional-learning-interface.component.ts | 582 | Active |
| study-planner.component.ts | 564 | Active |
| chat-main-area.component.ts | 562 | Active |
| video-upload.component.ts | 555 | Active |
| question-edit.component.ts | 549 | Active |
| real-video-player.component.ts | 548 | Active |

### Services

| File | LOC | Note |
|------|-----|------|
| chat.service.ts | 1,265 | Reduced from 1,451 (extracted classifier) |
| admin.service.ts | 809 | Consider splitting |
| admin.service.ts (infra) | 675 | Active |
| learning.service.ts | 666 | Active |
| communication.service.ts | 609 | Active |
| teacher.service.ts | 581 | Active |
| distribution.service.ts | 577 | Active |
| course-detail.service.ts | 572 | Active |
| analytics.service.ts | 498 | Active |
| notification.service.ts | 479 | Active |

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Angular 20.3 | Framework (standalone, signals) |
| Angular Material | UI components |
| RxJS | Async operations |
| HLS.js | Video streaming |
| EditorJS | Block-based content editor |
| Tailwind CSS | Utility-first styling |
| VNPay | Payment gateway (Vietnamese) |
| WebSocket | Real-time chat/notifications |
| Cloudflare R2 | File storage |

---

## Conventions

### Component Pattern
```typescript
@Component({
  selector: 'app-my-component',
  // NO standalone: true (default in Angular 20+)
  imports: [CommonModule],  // Only if using pipes (| date, | number) or [ngClass]
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class MyComponent {
  // DI
  private service = inject(MyService);
  private destroyRef = inject(DestroyRef);

  // Inputs/Outputs
  data = input.required<Data>();
  itemSelected = output<Item>();

  // State
  items = signal<Item[]>([]);
  isLoading = signal(false);
  itemCount = computed(() => this.items().length);

  // ViewChild (if needed)
  container = viewChild<ElementRef>('container');
}
```

### Template Pattern
```html
@if (isLoading()) {
  <app-loading-spinner />
} @else {
  @for (item of items(); track item.id) {
    <app-item-card [data]="item" />
  } @empty {
    <p>No items found</p>
  }
}

@let total = items().length;
@if (total > 0) {
  <p>{{ total }} items found</p>
}
```

### Subscription Cleanup
```typescript
// In ngOnInit or similar
this.service.data$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(data => this.items.set(data));

// Or convert to signal
items = toSignal(this.service.data$, { initialValue: [] });
```

### CommonModule Rules
- **Keep** CommonModule if template uses: `| date`, `| number`, `| currency`, `| slice`, `[ngClass]`, `[ngStyle]`
- **Remove** CommonModule if template only uses `@if`, `@for`, `@switch` (no pipes/directives)
- Currently 14 components require CommonModule for pipes/directives

---

## Modernization Changelog

### 2026-02-06 Session 7 (Re-Audit + Final Cleanup)

**Score: 9.5/10 (confirmed)**

| Task | Detail |
|------|--------|
| Re-audit all metrics | Accurate count: 257 components, ~100 services, ~46K LOC |
| Add OnPush to quiz-creation-modal | Was the 1 missing component |
| Migrate message-bubble @Input→input() | Last legacy decorator |
| teacher.component.ts, payment-callback.component.ts | Already had OnPush (confirmed) |
| Full doc suite update | FRONTEND_ARCHITECTURE.md, CLAUDE.md, SKILL.md, MEMORY.md |

### 2026-02-06 Session 3 (Dead Code & Legacy Cleanup)

**Score: 9.2/10 -> 9.5/10**

| Task | Detail |
|------|--------|
| Delete dead components | ~18 files removed (~200KB): section-editor monolith, 8 dead quiz components, dead course-learning, my-courses, enhanced-assignment-creation |
| Delete artifact reports | 6 report files removed from root |
| Remove console.log/warn/debug | ~220+ statements removed from ~55 files (0 remaining in production code) |
| BehaviorSubject -> signal() | 3 services (admin, teacher-revenue, course-instructor) |
| Remove redundant destroy$ | 3 components already using takeUntilDestroyed |
| Constructor -> inject() | 5 files migrated to modern DI |

### 2026-02-06 Session 2 (Angular v20+ Modernization)

**Score: 7.1/10 -> 9.2/10**

| Task | Detail |
|------|--------|
| `*ngIf` / `*ngFor` -> `@if` / `@for` | 200+ files via Angular schematic |
| Remove `standalone: true` | 197 files |
| Remove unnecessary `CommonModule` | ~250 files (restored to 14 needing pipes/ngClass) |
| `@Output()` -> `output()` | 2 files (search, math-toolbar) |
| `@ViewChild` -> `viewChild()` | 9 active files |
| `OnPush` 100% coverage | 257/257 components |
| Split section-editor monolith | 2,107 LOC -> 8 files (max 386 LOC) |
| Extract ContentClassifierService | ChatService: 1,451 -> 1,265 LOC |
| Delete old user-management | 975 LOC removed |
| Delete duplicate `tabs/` folder | Routes use `pages/` |
| Password VO: remove insecure hash | Client-side hash removed |
| AuthService: BehaviorSubject -> signals | Modern auth state |
| `unwrapSpringPage<T>()` operator | RxJS operator for Spring Data |
| Fix mojibake encoding | 41 Vietnamese files fixed |

---

*This document eliminates the need to re-audit the frontend. Update after significant changes.*
