---
name: angular-v20-frontend-development
description: Modern Angular v20+ frontend development standards covering signals, standalone components, resource APIs, type-safe API layers, and best practices for LMS applications. Use when building new Angular features, refactoring legacy code, or implementing API integrations.
---

# Angular v20+ Frontend Development Standard

> **Last Updated:** January 28, 2026  
> **Angular Version:** v20.x (compatible with v19+)

---

## 🎯 2026 Professional Standards Summary

### Key Decisions (January 2026)

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| **Component Architecture** | Standalone ONLY | NgModules deprecated path |
| **State Management** | Signals-first | Replaces RxJS for UI state |
| **Reactivity** | `input()`, `output()`, `viewChild()` signals | Replaces decorators |
| **Control Flow** | `@if`, `@for`, `@switch` | Native, performant |
| **Inline vs External Template** | **Flexible** - see rules below | IDE support improved |
| **Change Detection** | OnPush + Signals | Zoneless-ready |

### Template Location Rule (2026 Standard)

```
┌─────────────────────────────────────────────────────────────┐
│  INLINE TEMPLATE (`template:`)                              │
│  ✅ Use when: Template < 15 lines AND simple logic          │
│  ✅ Examples: Buttons, badges, icons, simple cards          │
├─────────────────────────────────────────────────────────────┤
│  EXTERNAL TEMPLATE (`templateUrl:`)                         │
│  ✅ Use when: Template > 15 lines OR complex structure      │
│  ✅ Examples: Forms, dashboards, data tables, sidebars      │
└─────────────────────────────────────────────────────────────┘

⚠️ If inline template grows beyond 50 lines → MUST extract or split component
```

### Signals Best Practices 2026

```typescript
// ✅ 2026 CORRECT Pattern
@Component({
  selector: 'app-modern',
  // NO standalone: true (default in Angular 20+, specifying it is redundant)
  imports: [],  // Only add CommonModule if using pipes (| date) or [ngClass]
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class ModernComponent {
  // DI - always inject(), never constructor injection
  private userService = inject(UserService);

  // Signal inputs/outputs (NOT decorators)
  userId = input.required<string>();
  userChange = output<User>();

  // Local state
  isLoading = signal(false);

  // Derived state (computed, NOT methods)
  displayName = computed(() => this.user()?.name ?? 'Unknown');

  // HTTP data (httpResource for simple cases)
  userResource = httpResource<User>({
    url: () => `/api/users/${this.userId()}`
  });

  // Side effects (sparingly)
  private trackEffect = effect(() => {
    const id = this.userId();
    if (id) {
      this.userService.trackView(id);
    }
  });
}
```

### Signals Anti-Patterns

```typescript
// ❌ WRONG: Mutating signals in effects
effect(() => {
  this.counter.set(this.counter() + 1); // Infinite loop risk
});

// ❌ WRONG: Using BehaviorSubject for UI state  
private isOpen$ = new BehaviorSubject(false); // Use signal() instead

// ❌ WRONG: Decorator-based inputs
@Input() userId!: string; // Use input() signal

// ❌ WRONG: ngOnChanges with signal inputs
ngOnChanges() {} // Use effect() instead
```

---

## Overview

This standard defines the architectural approach for building modern Angular v20+ applications with emphasis on:
- **Signals-first reactivity** for fine-grained state management
- **Standalone components** as the default architecture
- **Type-safe API layers** aligned with PostgreSQL schemas
- **SOTA 2026 patterns** including httpResource, linkedSignal, and zoneless readiness

## Core Architecture Principles

### 1. Project Structure (Feature-Based)

```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   ├── services/
│   ├── guards/
│   ├── interceptors/
│   └── models/              # Core domain models
├── shared/                  # Reusable UI components and pipes
│   ├── components/
│   ├── pipes/
│   ├── directives/
│   └── utils/
├── api/                     # API layer (single source of truth)
│   ├── client/              # API client services
│   ├── endpoints/           # Endpoint constants
│   ├── types/               # TypeScript interfaces matching SQL
│   └── mappers/             # DTO transformers
├── features/                # Feature modules (lazy-loaded)
│   ├── {feature}/
│   │   ├── components/      # Presentational components
│   │   ├── containers/      # Smart components
│   │   ├── services/        # Feature-specific services
│   │   ├── store/           # Signal-based state
│   │   └── routes.ts        # Feature routes
└── app.config.ts            # Application configuration
```

### 2. Standalone Components (Default)

All components MUST be standalone (Angular v20+ default). Do NOT specify `standalone: true` as it is redundant:

```typescript
// ✅ CORRECT: Standalone component (standalone is default, don't specify it)
@Component({
  selector: 'app-user-profile',
  // NO standalone: true - it's the default in Angular 20+
  imports: [RouterLink, UserAvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class UserProfileComponent {
  private userService = inject(UserService);

  user = this.userService.currentUser;
}

// ❌ WRONG: Redundant standalone: true
@Component({
  standalone: true,  // Don't specify - it's already the default!
  ...
})

// ❌ WRONG: NgModule-based component
@NgModule({
  declarations: [UserProfileComponent],
  imports: [CommonModule]
})
export class UserModule {}
```

### CommonModule Rules
- **Add** CommonModule to `imports` ONLY if template uses: `| date`, `| number`, `| currency`, `| slice`, `[ngClass]`, `[ngStyle]`
- **Do NOT add** CommonModule if template only uses `@if`, `@for`, `@switch` (built-in control flow doesn't need it)

### 3. Signals-First State Management

#### Tier 1: Local Component State

```typescript
@Component({...})
export class QuizComponent {
  // Writable signals for local state
  currentQuestion = signal(0);
  answers = signal<Map<string, string>>(new Map());
  isSubmitting = signal(false);
  
  // Computed signals for derived state
  progress = computed(() => 
    ((this.currentQuestion() + 1) / this.totalQuestions()) * 100
  );
  
  canSubmit = computed(() => 
    this.answers().size === this.totalQuestions() && !this.isSubmitting()
  );
  
  // Update signals with set() or update()
  nextQuestion() {
    this.currentQuestion.update(q => q + 1);
  }
}
```

#### Tier 2: Feature-Level State (Signal Store)

```typescript
// store/course.store.ts
@Injectable({ providedIn: 'root' })
export class CourseStore {
  // Private writable signals
  private _courses = signal<Course[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  
  // Public readonly signals
  readonly courses = this._courses.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed
  readonly publishedCourses = computed(() => 
    this._courses().filter(c => c.status === 'PUBLISHED')
  );
  
  // Actions
  async loadCourses() {
    this._loading.set(true);
    this._error.set(null);
    try {
      const courses = await firstValueFrom(this.courseApi.list());
      this._courses.set(courses.data);
    } catch (err) {
      this._error.set(err.message);
    } finally {
      this._loading.set(false);
    }
  }
}
```

#### Tier 3: linkedSignal for Derived Writable State (v20+)

```typescript
// When you need a derived signal that can also be written to
selectedCourse = signal<string | null>(null);

// linkedSignal: Resets when parent changes, but can be overridden
selectedLesson = linkedSignal({
  source: this.selectedCourse,
  computation: (courseId) => 
    this.lessons().find(l => l.courseId === courseId)?.id ?? null
});

// Can be written to independently
selectLesson(lessonId: string) {
  this.selectedLesson.set(lessonId);
}
```

### 4. Resource APIs for Data Fetching (v19+)

#### Using resource() for Simple Cases

```typescript
import { resource } from '@angular/core';

@Component({...})
export class CourseDetailComponent {
  courseId = input.required<string>();
  
  // Reactive data fetching
  courseResource = resource({
    request: () => this.courseId(),
    loader: async ({ request: courseId }) => {
      const response = await firstValueFrom(this.courseApi.getById(courseId));
      return response.data;
    }
  });
  
  // Access in template
  // courseResource.value() - the data
  // courseResource.isLoading() - loading state
  // courseResource.error() - error if any
}
```

#### Using httpResource() for HTTP Calls (v19.2+)

```typescript
import { httpResource } from '@angular/common/http';

@Component({...})
export class StudentListComponent {
  courseId = input.required<string>();
  
  // Automatic HTTP resource
  studentsResource = httpResource<Student[]>({
    url: () => `/api/v3/courses/${this.courseId()}/students`,
    defaultValue: []
  });
  
  // With query params
  paginatedResource = httpResource<PagedResponse<Student>>({
    url: () => `/api/v3/courses/${this.courseId()}/students`,
    params: () => ({
      page: this.currentPage().toString(),
      size: '20'
    })
  });
}
```

#### Using rxResource() for RxJS Integration

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

// When you need RxJS operators
questionsResource = rxResource({
  request: () => this.packageId(),
  loader: ({ request: packageId }) =>
    this.questionApi.getByPackage(packageId).pipe(
      map(res => res.data),
      retry(3),
      catchError(() => of([]))
    )
});
```

## Type-Safe API Layer

### 1. Endpoint Constants Pattern

```typescript
// api/endpoints/course.endpoints.ts
export const COURSE_ENDPOINTS = {
  // Base
  BASE: '/api/v3/courses',
  
  // CRUD
  LIST: '/api/v3/courses',
  BY_ID: (id: string) => `/api/v3/courses/${id}`,
  CREATE: '/api/v3/courses',
  UPDATE: (id: string) => `/api/v3/courses/${id}`,
  DELETE: (id: string) => `/api/v3/courses/${id}`,
  
  // Actions
  PUBLISH: (id: string) => `/api/v3/courses/${id}/publish`,
  ARCHIVE: (id: string) => `/api/v3/courses/${id}/archive`,
  
  // Relations
  CHAPTERS: (id: string) => `/api/v3/courses/${id}/chapters`,
  STUDENTS: (id: string) => `/api/v3/courses/${id}/students`,
} as const;
```

### 2. Type Definitions Matching PostgreSQL Schema

```typescript
// api/types/course.types.ts

/**
 * Matches PostgreSQL: courses table
 * Columns: id (UUID), title (VARCHAR 255), slug (VARCHAR 100), 
 * description (TEXT), status (VARCHAR 20), ...
 */
export interface Course {
  id: string;                      // UUID -> string
  title: string;                   // VARCHAR(255) -> string
  slug: string;                    // VARCHAR(100) -> string
  description: string | null;      // TEXT NULLABLE -> string | null
  status: CourseStatus;            // VARCHAR(20) ENUM -> union type
  thumbnailUrl: string | null;     // VARCHAR(500) NULLABLE
  price: number;                   // DECIMAL(10,2) -> number
  teacherId: string;               // UUID FK -> string
  categoryId: string | null;       // UUID FK NULLABLE
  createdAt: string;               // TIMESTAMPTZ -> ISO string
  updatedAt: string;               // TIMESTAMPTZ -> ISO string
}

/**
 * PostgreSQL: ENUM or CHECK constraint
 */
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/**
 * PostgreSQL: Integer types
 */
export type IntegerField = number; // INT, BIGINT -> number
export type DecimalField = number; // DECIMAL, NUMERIC -> number

/**
 * Request DTO for creating (excludes auto-generated fields)
 */
export interface CreateCourseRequest {
  title: string;
  description?: string;
  categoryId?: string;
  price?: number;
}

/**
 * Response wrapper matching backend ApiResponse
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
}

/**
 * Paginated response
 */
export interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}
```

### 3. SQL to TypeScript Type Mapping

| PostgreSQL Type | TypeScript Type | Notes |
|-----------------|-----------------|-------|
| `UUID` | `string` | Always string, not object |
| `VARCHAR(n)` | `string` | |
| `TEXT` | `string` | |
| `INT`, `BIGINT` | `number` | |
| `DECIMAL`, `NUMERIC` | `number` | Monetary values |
| `BOOLEAN` | `boolean` | |
| `TIMESTAMPTZ` | `string` | ISO 8601 format |
| `DATE` | `string` | YYYY-MM-DD format |
| `JSONB` | `Record<string, unknown>` | Or specific interface |
| `ENUM` | Union type | `'A' \| 'B' \| 'C'` |
| `NULLABLE` | `T \| null` | Explicit null |
| `ARRAY` | `T[]` | |

### 4. API Client Pattern

```typescript
// api/client/course.api.ts
@Injectable({ providedIn: 'root' })
export class CourseApi {
  private api = inject(ApiClient);
  
  list(params?: CourseListParams): Observable<ApiResponse<Course[]>> {
    return this.api.getWithResponse<Course[]>(COURSE_ENDPOINTS.LIST, { params });
  }
  
  getById(id: string): Observable<ApiResponse<Course>> {
    return this.api.getWithResponse<Course>(COURSE_ENDPOINTS.BY_ID(id));
  }
  
  create(data: CreateCourseRequest): Observable<ApiResponse<Course>> {
    return this.api.postWithResponse<Course>(COURSE_ENDPOINTS.CREATE, data);
  }
  
  update(id: string, data: UpdateCourseRequest): Observable<ApiResponse<Course>> {
    return this.api.putWithResponse<Course>(COURSE_ENDPOINTS.UPDATE(id), data);
  }
  
  delete(id: string): Observable<ApiResponse<void>> {
    return this.api.deleteWithResponse<void>(COURSE_ENDPOINTS.DELETE(id));
  }
}
```

## Modern Angular Patterns (v19/v20+)

### 1. Input Signals (v17+)

```typescript
// ✅ CORRECT: Input signals
@Component({...})
export class LessonCard {
  // Required input
  lesson = input.required<Lesson>();
  
  // Optional input with default
  showActions = input(true);
  
  // Transformed input
  lessonId = input('', { transform: (v: string) => v.trim() });
  
  // Computed from input
  duration = computed(() => formatDuration(this.lesson().durationMinutes));
}

// ❌ WRONG: Decorator inputs
@Input() lesson!: Lesson;
```

### 2. Output Signals (v17+)

```typescript
// ✅ CORRECT: Output function
@Component({...})
export class LessonCard {
  onEdit = output<Lesson>();
  onDelete = output<string>();
  
  handleEdit() {
    this.onEdit.emit(this.lesson());
  }
}

// Template: <app-lesson-card (onEdit)="editLesson($event)" />
```

### 3. Model Signals for Two-Way Binding (v17+)

```typescript
// ✅ CORRECT: Model signal
@Component({
  selector: 'app-search-input',
  template: `<input [value]="query()" (input)="query.set($event.target.value)" />`
})
export class SearchInput {
  query = model('');  // Two-way bindable
}

// Usage: <app-search-input [(query)]="searchTerm" />
```

### 4. ViewChild/ViewChildren Signals (v17+)

```typescript
// ✅ CORRECT: Query signals
@Component({...})
export class FormComponent {
  // viewChild returns a signal, must call () to get value
  nameInput = viewChild<ElementRef>('nameInput');
  formFields = viewChildren(FormFieldComponent);
  
  // CRITICAL: Access pattern - call signal first, then nativeElement
  focusName() {
    // ✅ CORRECT: this.nameInput() returns Signal value
    this.nameInput()?.nativeElement.focus();
    
    // ❌ WRONG: Signal doesn't have nativeElement directly
    // this.nameInput?.nativeElement.focus();
  }
}
```

### 5. Built-in Control Flow (v17+)

```typescript
// ✅ CORRECT: New control flow
@Component({
  template: `
    @if (isLoading()) {
      <app-spinner />
    } @else if (error()) {
      <app-error [message]="error()" />
    } @else {
      @for (item of items(); track item.id) {
        <app-item [item]="item" />
      } @empty {
        <p>No items found</p>
      }
    }
    
    @switch (status()) {
      @case ('DRAFT') { <span class="badge-draft">Draft</span> }
      @case ('PUBLISHED') { <span class="badge-published">Published</span> }
      @default { <span>Unknown</span> }
    }
    
    @defer (on viewport) {
      <app-heavy-component />
    } @loading {
      <app-skeleton />
    }
  `
})

// ❌ WRONG: Old structural directives
@Component({
  template: `
    <div *ngIf="isLoading">...</div>
    <div *ngFor="let item of items">...</div>
  `
})
```

### 6. Inject Function (Preferred)

```typescript
// ✅ CORRECT: inject function
@Component({...})
export class UserService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private store = inject(UserStore);
}

// ❌ AVOID: Constructor injection (still valid but less preferred)
constructor(
  private http: HttpClient,
  private router: Router
) {}
```

### 7. Effect for Side Effects

```typescript
@Component({...})
export class AnalyticsComponent {
  selectedCourse = signal<string | null>(null);
  
  // ✅ CORRECT: Effect in constructor
  constructor() {
    effect(() => {
      const courseId = this.selectedCourse();
      if (courseId) {
        this.analyticsService.trackCourseView(courseId);
      }
    });
  }
  
  // ✅ CORRECT: Effect replacing ngOnChanges for input signals
  rawData = input<string | ContentBlock[]>([]);
  
  private inputEffect = effect(() => {
    const data = this.rawData();
    if (data) {
      this.processData(data);
    }
  });
}

// ⚠️ CAUTION: Don't modify signals in effects without allowSignalWrites
// This is a smell - prefer computed() for derived state
effect(() => {
  // This will throw error
  this.counter.set(this.counter() + 1); // ❌ WRONG
}, { allowSignalWrites: true }); // Only if absolutely necessary
```

### 8. Template Binding with Signals (CRITICAL)

```typescript
// Parent component
@Component({
  template: `
    <!-- CRITICAL: When parent has internal signal, must call () to pass value -->
    <app-video-player [config]="videoConfig()" />
                                  ^^^^^^^^^^
    <!-- NOT: [config]="videoConfig" → passes Signal object, not value -->
  `
})
export class ParentComponent {
  // Internal signal
  videoConfig = signal<VideoConfig>({ src: 'video.mp4' });
}

// Child component
@Component({...})
export class VideoPlayerComponent {
  // input() signal - receives the unwrapped value
  config = input<VideoConfig>({ src: '' });
  
  // Access in template: config() (already a signal)
  // Access in code: this.config()
}
```

### 9. Template Variables with @let (v18+)

```typescript
@Component({
  template: `
    @let user = currentUser();
    @let fullName = user?.firstName + ' ' + user?.lastName;

    @if (user) {
      <h1>Welcome, {{ fullName }}</h1>
      <p>Role: {{ user.role }}</p>
    }

    @let total = items().length;
    @if (total > 0) {
      <p>{{ total }} items found</p>
    }
  `
})
```

### 10. Signal Interop: toSignal() and toObservable()

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

@Component({...})
export class InteropComponent {
  private route = inject(ActivatedRoute);
  private searchService = inject(SearchService);

  // Observable → Signal (use in templates without async pipe)
  routeParams = toSignal(this.route.params, { initialValue: {} });

  // Signal → Observable (when you need RxJS operators)
  searchTerm = signal('');
  searchResults$ = toObservable(this.searchTerm).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.searchService.search(term))
  );

  // Convert the results back to a signal for template use
  results = toSignal(this.searchResults$, { initialValue: [] });
}
```

### 11. Sass: Use @use Instead of @import

```scss
// ✅ CORRECT: Modern Sass with @use
@use 'variables' as *;
@use '@angular/material' as mat;

// ❌ WRONG: Deprecated @import
@import 'variables';
@import '~@angular/material/theming';
```

## Performance Best Practices

### 1. OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,  // Always use
  ...
})
export class PerformantComponent {}
```

### 2. TrackBy for Lists

```typescript
// ✅ CORRECT: track expression
@for (item of items(); track item.id) {
  <app-item [item]="item" />
}

// ✅ For index tracking
@for (item of items(); track $index) {
  ...
}
```

### 3. Lazy Loading Routes

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'teacher',
    loadChildren: () => import('./features/teacher/routes')
      .then(m => m.TEACHER_ROUTES)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/routes')
      .then(m => m.ADMIN_ROUTES),
    canActivate: [adminGuard]
  }
];
```

### 4. Defer Loading for Heavy Components

```typescript
@Component({
  template: `
    @defer (on viewport; prefetch on idle) {
      <app-video-player [src]="videoUrl()" />
    } @placeholder {
      <div class="video-placeholder">Loading video...</div>
    } @loading (minimum 500ms) {
      <app-spinner />
    } @error {
      <p>Failed to load video player</p>
    }
  `
})
```

## Removing Dead Code & Legacy Patterns

### Patterns to Remove

| Legacy Pattern | Modern Replacement |
|----------------|-------------------|
| `*ngIf` | `@if` |
| `*ngFor` | `@for` |
| `*ngSwitch` | `@switch` |
| `@Input()` decorator | `input()` signal |
| `@Output()` decorator | `output()` function |
| `@ViewChild()` decorator | `viewChild()` signal |
| `subscribe().unsubscribe()` | `toSignal()` or `async` pipe |
| `BehaviorSubject` for UI state | `signal()` |
| NgModule declarations | Standalone imports |
| Constructor injection | `inject()` function |

### Automated Migration

```bash
# Migrate to standalone
ng generate @angular/core:standalone

# Migrate control flow
ng generate @angular/core:control-flow

# Migrate inputs
ng generate @angular/core:signal-input-migration

# Migrate queries
ng generate @angular/core:signal-queries-migration
```

## Coding Standards

### Naming Conventions (Angular v20 Style Guide)

```typescript
// Files (simplified in v20)
user.ts                    // Component (not user.component.ts)
user.service.ts            // Service
user.types.ts              // Types/interfaces
user.store.ts              // Signal store
user.api.ts                // API client
user.spec.ts               // Test

// Classes
export class UserProfileComponent {}  // PascalCase
export class UserService {}

// Signals
currentUser = signal<User | null>(null);  // camelCase
isLoading = signal(false);

// Computed
fullName = computed(() => ...);           // camelCase

// Methods
loadUsers() {}                            // camelCase verb prefix
handleSubmit() {}

// Constants
export const API_BASE_URL = '...';        // SCREAMING_SNAKE_CASE
export const USER_ENDPOINTS = {...};
```

### Access Modifiers

```typescript
@Component({...})
export class UserComponent {
  // Template-only: protected
  protected userName = signal('');
  
  // Angular-initialized: readonly
  readonly route = inject(ActivatedRoute);
  
  // Internal: private
  private userService = inject(UserService);
  
  // Public API: public (or no modifier)
  currentUser = this.userService.currentUser;
}
```

## Testing Standards

### Component Testing with Angular Testing Library

```typescript
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

describe('CourseCard', () => {
  it('should display course title', async () => {
    const course = mockCourse({ title: 'Maritime Safety' });
    
    await render(CourseCardComponent, {
      inputs: { course }
    });
    
    expect(screen.getByText('Maritime Safety')).toBeInTheDocument();
  });
  
  it('should emit onEnroll when button clicked', async () => {
    const user = userEvent.setup();
    const onEnroll = jest.fn();
    
    await render(CourseCardComponent, {
      inputs: { course: mockCourse() },
      on: { onEnroll }
    });
    
    await user.click(screen.getByRole('button', { name: /enroll/i }));
    
    expect(onEnroll).toHaveBeenCalledWith(expect.any(String));
  });
});
```

### Signal Store Testing

```typescript
describe('CourseStore', () => {
  let store: CourseStore;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CourseStore,
        { provide: CourseApi, useValue: mockCourseApi }
      ]
    });
    store = TestBed.inject(CourseStore);
  });
  
  it('should load courses', async () => {
    mockCourseApi.list.mockReturnValue(of({ data: mockCourses }));
    
    await store.loadCourses();
    
    expect(store.courses()).toEqual(mockCourses);
    expect(store.loading()).toBe(false);
  });
});
```

## Refactoring Checklist

When refactoring existing Angular code:

### Phase 1: Control Flow Migration
- [ ] Replace `*ngIf` with `@if`
- [ ] Replace `*ngFor` with `@for` (include `track` expression!)
- [ ] Replace `*ngSwitch/*ngSwitchCase` with `@switch/@case`

### Phase 2: Component Modernization  
- [ ] Convert `@Input()` decorators to `input()` signals
- [ ] Convert `@Output() EventEmitter` to `output()` functions
- [ ] Convert `@ViewChild()` to `viewChild()` signals
- [ ] Convert `@ViewChildren()` to `viewChildren()` signals
- [ ] Use `inject()` instead of constructor injection
- [ ] Add `ChangeDetectionStrategy.OnPush` to all components

### Phase 3: Signal Adoption
- [ ] Replace `BehaviorSubject` with `signal()` for UI state
- [ ] Replace `subscribe/unsubscribe` with `toSignal()` or async pipe
- [ ] Use `effect()` instead of `ngOnChanges` for input reactions
- [ ] Use `computed()` for derived state

### Phase 4: Template Binding Fixes (CRITICAL!)
- [ ] When passing internal signal to child input: `[prop]="mySignal()"`
- [ ] Access `viewChild()` with `()` before `.nativeElement`
- [ ] Ensure `track` expression on every `@for` loop

### Phase 5: Code Cleanup
- [ ] Convert NgModule-based components to standalone
- [ ] Remove unused imports and dead code  
- [ ] Ensure all types match PostgreSQL schema
- [ ] Centralize API endpoints in `*_ENDPOINTS` constants
- [ ] Add proper null handling (`| null` for nullable columns)

### Common Migration Gotchas

| Mistake | Fix |
|---------|-----|
| `[config]="mySignal"` | `[config]="mySignal()"` - unwrap signal value |
| `this.viewChild?.nativeElement` | `this.viewChild()?.nativeElement` - call signal |
| `@for (item of items; track item.id)` | `@for (item of items(); track item.id)` - call signal |
| `ngOnChanges` with input signals | Use `effect()` instead |
| `EventEmitter` still imported | Replace with `output()` |

## References

- [Angular.dev - Official Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular v20 Release Notes](https://blog.angular.dev)
- [Nx Angular Best Practices](https://nx.dev/recipes/angular)
