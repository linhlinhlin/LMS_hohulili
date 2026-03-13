# Frontend Architecture Reference

> **Last Updated**: 2026-03-13 | **Angular**: 20.3 | **Score**: 10/10

This document is the **single source of truth** for the LMS frontend architecture.
Read this instead of re-auditing the codebase.

---

## Quick Facts

| Metric | Value |
|--------|-------|
| Framework | Angular 20.3+ (standalone, signals) |
| TypeScript Files | ~525 |
| Components | 237 |
| Services (@Injectable) | ~62 |
| Total TypeScript LOC | ~48,000+ |
| OnPush Coverage | **237/237 (100%)** |
| Legacy Patterns | **0** (*ngIf, *ngFor, standalone:true, @Input, @Output, @ViewChild) |
| console.log/warn/debug | **0** in production code |
| English text in UI | **0** (all Vietnamese) |
| User-facing emojis | **0** (SVG icons via app-icon) |
| alert/confirm/prompt | **0** (Toast + ConfirmDialog) |
| API Clients | 18 |
| API Endpoints | 23 |
| API Types | 19 |
| Shared Components | 49 |
| Core Services | 17 |
| State Services | 3 (global, course, class) |
| Guards | 5 (in 3 files) |
| Routes | 70+ |
| Port | 4200 (dev) / 4000 (SSR prod) |
| Build | `npm start` / `npm run build` |
| SSR | `outputMode: "server"` — Node.js:4000 + nginx:80 |
| SEO | robots.txt, sitemap.xml, SeoService, JSON-LD |
| WebMCP | 4 AI-agent tools via `navigator.modelContext` |

---

## Architecture Overview

```
fe/src/app/
├── api/                    # HTTP layer (18 clients, 23 endpoints, 19 types)
│   ├── client/             # ApiClient + domain-specific clients (18 files)
│   ├── endpoints/          # URL constant definitions (23 files)
│   ├── types/              # TypeScript interfaces for all DTOs (19 files)
│   ├── interceptors/       # Auth, base-url (SSR: isPlatformServer→backend:8080), error, offline (4 files)
│   └── operators/          # RxJS operators (unwrapSpringPage)
├── core/                   # Singleton services & guards
│   ├── services/           # Auth, messaging, notification, PWA offline, presigned upload, SEO, WebMCP, etc. (25 services)
│   ├── utils/              # server-upload-adapter.ts (CKEditor upload plugin)
│   ├── db/                 # lms-offline.db.ts (Dexie.js 4 - 7 tables)
│   └── guards/             # auth.guard, role.guard, enrollment.guard (5 guard fns in 3 files)
├── features/               # Feature modules (lazy-loaded)
│   ├── admin/              # 22 components - Admin dashboard
│   ├── teacher/            # 68 components - Course editor, assignments, grading
│   ├── student/            # 12 components - Learning, enrollments
│   ├── ai-chat/            # 15 components - AI assistant (full DDD)
│   ├── learning/           # 12 components - Course learning interface
│   ├── courses/            # 10+ components - Course browsing, categories
│   ├── assignments/        # 12 components - Student assignment work
│   ├── auth/               # 4 components - Login, register, forgot-password, reset-password
│   ├── communication/      # 2 components - Notifications
│   ├── payment/            # 4 components - VNPay integration
│   ├── profile/            # 2 components - User profile
│   ├── home/               # 1 component - Landing page
│   └── (about, contact, privacy, terms, settings, analytics)
├── shared/                 # Reusable components (49) & services (8)
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
| `effect()` | 29 (21 files) | Where needed |
| `@if` / `@for` / `@switch` | 234 files (2,117 instances) | Standard |
| `ChangeDetectionStrategy.OnPush` | 237/237 (100%) | Enforced |
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

| Module | Components | Architecture |
|--------|------------|-------------|
| Teacher | 68 | Partial DDD (course-editor has store) |
| AI-Chat | 15 | Full DDD |
| Learning | 13 | Full DDD |
| Courses | 10+ | DDD |
| Admin | 23 | Feature-based |
| Assignments | 12 | Full DDD |
| Student | 12 | Feature-based |
| Auth | 4 | Flat |
| Communication | 2 | Flat (forum removed S38) |
| Payment | 4 | Flat |

### Admin (`features/admin/`)
**23 components** | Store + Signals pattern

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
│   ├── course-management.component
│   ├── course-review.component (542 LOC)
│   ├── course-content-preview.component (NEW S93)
│   ├── student-management.component
│   ├── teacher-management.component
│   ├── system-settings.component
│   └── user-management/ (Refactored version)
└── services/admin.service.ts (809 LOC)
```

### Teacher (`features/teacher/`)
**68 components** | Stores + Signals | Most complex feature

```
teacher/
├── course-editor/          # SOTA layout: collapsible sidebar, two-column pages
│   ├── layouts/course-editor-layout/  # Collapsible sidebar, underline tabs, auto-select
│   ├── components/ (header, sidebar)
│   ├── pages/
│   │   ├── course-info/   # 5-card sidebar (Shopify pattern) + sticky save bar + drag-drop thumbnail
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
│   ├── section-editor/legacy-section-editor-redirect.component.ts
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
**13 components** | Services + Signals

```
learning/
├── domain/ (entities, repositories, value-objects)
├── quiz/
│   └── presentation/components/ (quiz-list, quiz-attempt, quiz-result)
├── services/ (learning.service 666 LOC, video-player.service)
├── state/quiz-state.service.ts
├── components/ (lesson-content, youtube-player, study-planner, etc.)
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
├── grades/
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

/auth ─────────── Login, Register, Forgot-password, Reset-password

/teacher ──────── (teacherOnlyGuard - blocks admin)
  /dashboard
  /courses                    → Course list
  /course-creation            → New course
  /courses/:id/editor/*       → Course editor (standalone layout)
  /courses/:cid/sections/:sid → Legacy redirect to curriculum editor
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
| ~~`quiz.service.ts`~~ | **Deleted** (S26: replaced by learning/quiz infrastructure) |

### Feature-Level Stores

| Store | Location | Pattern |
|-------|----------|---------|
| CourseEditorStore | teacher/course-editor/store | Signals + 1-min cache + optimistic reorder |
| AssignmentDetailStore | teacher/assignment-hub | Signals |
| SubmissionsStore | teacher/assignment-hub | Signals + filters |
| AssignmentListState | assignments/presentation/state | Signals + computed |
| QuizStateService | learning/state | Signals |

---

## API Layer

### Structure: Client + Endpoints + Types

```
api/
├── client/          # 18 HTTP service files
│   ├── api-client.ts     # Base: get/post/put/patch/delete + WithResponse variants
│   ├── course.api.ts     # Course CRUD
│   ├── assignment.api.ts # Assignment + submissions
│   ├── file.api.ts       # File operations
│   ├── r2-storage.api.ts # Cloudflare R2 uploads
│   └── ... (chapter, lesson, section, student, payment, etc.)
├── endpoints/       # 23 URL constant files → /api/v3/*
├── types/           # 19 TypeScript interfaces
│   ├── common.types.ts   # ApiResponse<T>, Pagination
│   ├── course.types.ts   # Course, CourseDTO
│   └── ... (all domain types)
├── interceptors/    # Auth token (network-aware soft logout), base-url, error handling, offline fallback (4 files)
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

### Services (22)

| Service | LOC | Purpose |
|---------|-----|---------|
| `auth.service.ts` | ~300 | JWT auth, user session (signal-based) |
| `notification.service.ts` | 479 | Browser notifications |
| `messaging.service.ts` | 433 | Real-time messaging (WebSocket) |
| `toast.service.ts` | ~100 | Toast notifications |
| `confirm-dialog.service.ts` | ~100 | Confirm dialog (replaces native confirm) |
| `user.service.ts` | ~150 | User profile management |
| `distribution.service.ts` | 577 | Content distribution |
| `learning-path.service.ts` | ~200 | Learning path management |
| `api-cache.service.ts` | ~100 | API response caching |
| `pwa.service.ts` | ~80 | Progressive Web App |
| `image-lifecycle.service.ts` | ~100 | Image handling |
| `content-identity.service.ts` | ~100 | Content identification |
| **`network-status.service.ts`** | ~120 | **3-tier network detection (none/slow/fast), /favicon.ico probe (2min interval)** |
| **`session-expired.service.ts`** | ~90 | **4-state auth machine (ONLINE_AUTHENTICATED, OFFLINE_AUTHENTICATED, OFFLINE_DEGRADED, UNAUTHENTICATED), soft logout when offline** |
| **`storage-manager.service.ts`** | ~100 | **Storage quota, formatBytes, persistent storage** |
| **`offline-sync.service.ts`** | ~250 | **Sync queue, batch push, failedCount, retryFailed** |
| **`course-download.service.ts`** | ~200 | **Full course download to IndexedDB** |
| **`sw-update.service.ts`** | ~150 | **SW update (6h check, user confirm, iOS eviction recovery, ChunkLoadError, cache cleanup)** |
| **`screen-wake-lock.service.ts`** | ~80 | **Screen Wake Lock API (video playback)** |
| **`qoe-tracker.service.ts`** | ~100 | **QoE metrics (startup, rebuffer, bitrate)** |
| **`offline-video.service.ts`** | ~150 | **Video download via Cache API** |
| **`presigned-upload.service.ts`** | ~140 | **3-step presigned URL upload: init → XHR PUT to R2 → confirm. Cancellable, progress tracking, dev fallback** |
| **`seo.service.ts`** | ~60 | **Centralized SEO: setPageMeta(), setCanonical(), setJsonLd(), setKeywords(). Used by courses, course-detail, categories** |
| **`webmcp.service.ts`** | ~190 | **WebMCP (W3C Draft Feb 2026): 4 AI-agent tools via `navigator.modelContext.registerTool()`. Feature-detects — zero impact on unsupported browsers** |

### Guards (5 functions in 3 files)

| Guard | Access |
|-------|--------|
| `authGuard` | Any authenticated user |
| `adminGuard` | ADMIN or ORG_ADMIN |
| `teacherGuard` | TEACHER, ADMIN, or ORG_ADMIN |
| `teacherOnlyGuard` | TEACHER only (blocks admin) |
| `studentGuard` | STUDENT only |
| `enrollmentGuard` | Must be enrolled in course (learning routes) |

---

## Shared Module (49 Components)

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
- `session-expired-banner` (amber banner for OFFLINE_DEGRADED state, "Dang nhap lai" button)

---

## Top 10 Largest Files

### Components

| File | LOC | Note |
|------|-----|------|
| sidebar.component.ts (course-editor) | ~1400 | Active - 3-level DnD tree, keyboard reorder, Move To modal |
| course-learning.component.ts (pages/) | 687 | Active |
| course-curriculum.component.ts | 680 | Has extracted child components |
| lesson-content.component.ts | ~400 | Active (replaced professional-learning-interface) |
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
| learning.service.ts | ~850 | Active (Download-First refactor S61d) |
| communication.service.ts | 609 | Active |
| teacher.service.ts | 581 | Active |
| distribution.service.ts | 577 | Active |
| course-detail.service.ts | 572 | Active |
| ~~analytics.service.ts~~ | - | **Deleted** (S26: 0 imports, mock data only) |
| notification.service.ts | 479 | Active |

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Angular 20.3 | Framework (standalone, signals) |
| Angular Material | UI components |
| Angular CDK DragDrop | Drag-and-drop (3-level tree reorder, handles, placeholders) |
| Angular CDK Scrolling | Auto-scroll during drag (`cdkScrollable`) |
| RxJS | Async operations |
| HLS.js | Video streaming |
| EditorJS | Block-based content editor |
| Tailwind CSS | Utility-first styling |
| VNPay | Payment gateway (Vietnamese) |
| WebSocket | Real-time chat/notifications |
| Cloudflare R2 | File storage (presigned URL upload) |
| Dexie.js 4 | IndexedDB offline storage (7 tables) |
| Shaka Player 5.x | Adaptive video (maritime ABR) |
| Angular Service Worker | PWA caching (ngsw-config.json) |

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

## PWA Offline-First Architecture

> **Deep research**: [`docs/PWA_OFFLINE_RESEARCH.md`](../docs/PWA_OFFLINE_RESEARCH.md) — Full technical analysis, SOTA comparison, security audit

### Storage Layers

| Layer | Technology | Size | Content |
|-------|-----------|------|---------|
| IndexedDB | Dexie.js 4 (`lms-maritime-offline`) | ~50-500MB | 8 tables: courses, chapters, lessons, progress, submissions, quizAttempts, syncQueue, checkpoints |
| Cache API | Service Worker (`offline-videos`) | ~50-500MB | Video blobs (zero-RAM streaming) |
| NGSW Cache | Angular SW | ~20-50MB | App shell, lazy chunks, API responses (9 dataGroups) |
| LocalStorage | Browser | ~5-10KB | JWT tokens, user data, session state |

### Offline Flow

```
Download: CourseDownloadService → API → IndexedDB (per-chapter atomic) + Cache API (video)
Access:   offlineInterceptor → IndexedDB fallback (GET) / syncQueue (POST/PUT/DELETE)
Sync:     NetworkStatus online → 2s delay → POST /api/v3/sync/push → conflict resolution
```

### Conflict Resolution

| Entity | Strategy | Rationale |
|--------|----------|-----------|
| Video progress | Additive merge | Segments accumulate |
| Lesson completion | Forward-only | COMPLETED never reverts |
| Quiz attempts | Server-wins | Grading authoritative |
| Submissions | Deferred | Replay to endpoint |

### Known Issues (from deep research S110)

| Priority | Issue | Status |
|----------|-------|--------|
| ~~P0~~ | ~~Multi-account no data isolation (courses/chapters/lessons missing userId)~~ | **Fixed S112** |
| ~~P1~~ | ~~No storage management UI for end users~~ | **Fixed S113**: `/student/storage` page with segmented bar, per-item delete |
| ~~P1~~ | ~~Full logout doesn't clean offline data~~ | **Fixed S113**: Pre-logout sync check + explicit cleanup via Storage Management |

---

## SSR & SEO Architecture

### Server-Side Rendering (Angular SSR)

```
Production flow:
  Caddy → nginx:80 ─┬─ static files (*.js, *.css, images) → nginx serves directly
                     ├─ /api/* → proxy to backend:8080
                     └─ page requests → proxy to Node.js:4000 (SSR)
                                        └─ fallback: 502 → serve index.csr.html (CSR)
```

| Config | Value |
|--------|-------|
| `angular.json` | `"outputMode": "server"` |
| SSR server | `dist/lms-angular/server/server.mjs` on port 4000 |
| SSRF protection | `NG_ALLOWED_HOSTS=holilihu.online,localhost` |
| SSR API routing | `base-url.interceptor.ts` → `isPlatformServer()` → `http://backend:8080` |
| CSR fallback | `error_page 502 503 504 = /index.csr.html` in nginx |
| Docker | `node:20-alpine` + `apk add nginx`, entrypoint starts both |

### SEO

| Asset | Purpose |
|-------|---------|
| `robots.txt` | Blocks /api/, /admin/, /teacher/, /student/, /auth/, /payment/ |
| `sitemap.xml` | 13 public URLs with priority + changefreq |
| `SeoService` | `setPageMeta()`, `setCanonical()`, `setJsonLd()`, `setKeywords()` |
| JSON-LD | Organization + WebSite (SearchAction) in index.html; ItemList/CollectionPage per page |
| Open Graph | og:title, og:description, og:image (1200x630), og:locale vi_VN |
| Twitter | summary_large_image card |

### WebMCP (AI Agent Integration)

W3C Draft (Feb 2026), Chrome 146+ Canary behind flag. `WebMcpService` registers 4 public tools:

| Tool | Description |
|------|-------------|
| `search_courses` | Search by query, category, level, page |
| `get_course_detail` | Full course info by UUID |
| `get_course_curriculum` | Chapters + lessons for a course |
| `list_categories` | All 6 maritime categories |

---

## Modernization Changelog

### 2026-03-01 Session 108 (Maritime PWA Token Management + Soft Logout)

**Score: 10/10 (maintained)**

| Task | Detail |
|------|--------|
| SessionExpiredService | 4-state auth machine: ONLINE_AUTHENTICATED, OFFLINE_AUTHENTICATED, OFFLINE_DEGRADED, UNAUTHENTICATED. Evaluates refresh token expiry + network status for state transitions |
| SessionExpiredBannerComponent | Amber banner (z-101) shown in OFFLINE_DEGRADED state: "Phien dang nhap het han" with "Dang nhap lai" button preserving returnUrl |
| auth.interceptor.ts network-aware | On 401 when offline: transitions to OFFLINE_DEGRADED instead of hard logout. Online refresh failure still hard-logouts. Successful refresh transitions to ONLINE_AUTHENTICATED |
| Component count | 236 → 237 (shared +1: session-expired-banner) |

### 2026-02-26 Session 93 (Student Lesson Viewer UX + PWA iOS Hardening)

**Score: 10/10 (maintained)**

| Task | Detail |
|------|--------|
| Admin course preview | New `CourseContentPreviewComponent` for admin course review (admin: 22→23) |
| Student lesson viewer polish | Sidebar: structure header, folder icons, colored type icons, numbered "Bài 1.1" titles |
| Micro-progress indicators | Green checkmark (completed), blue dot (active), muted text (done) — Coursera/LinkedIn pattern |
| Video styling | Rounded-xl container with shadow, bg-slate-50 wrapper (no more full-width black) |
| Text content card | White card with border + prose styling for HTML content |
| Design token alignment | All `#3b82f6` → `#0056D2` in learning pages (6 files) |
| PWA iOS crash fix | `SwUpdateService` rewritten: no auto-reload offline, visibility handler, cache cleanup, ChunkLoadError |
| Network probe fix | `NetworkStatusService`: `/actuator/health` → `/favicon.ico`, 30s → 120s, no `cache:'no-cache'` |
| NGSW cache hardening | All dataGroup maxAge extended to 7d (was 6h/1d) for iOS ITP resilience |
| Component count | 235 → 236 (admin +1) |

### 2026-02-23 Session 63 (VNPay + Email + Password Reset)

**Score: 10/10 (maintained)**

| Task | Detail |
|------|--------|
| Reset Password page | New `ResetPasswordComponent` with password+confirm form, token from URL query param, auto-redirect to login |
| Auth routes update | Added `/auth/reset-password` lazy-loaded route |
| VNPay payment flow | `PaymentApi.createVnPayUrl()` + `PaymentService` VNPay redirect (`window.location.href`) |
| Component count | 236 → 237 (auth: 3→4) |

### 2026-02-23 Session 62 (PWA Download-First Hardening)

**Score: 10/10 (maintained)**

| Task | Detail |
|------|--------|
| 12 fixes | NetworkStatusService maritime default, offline interceptor auth whitelist, sync dedup+backoff, download resume, speed-grader responsive, beforeunload warning |

### 2026-02-23 Session 61 (PWA Download-First + Data Sync)

**Score: 10/10 (maintained) | PWA: 9.7/10 (NEW)**

| Task | Detail |
|------|--------|
| PWA Foundation | NGSW config (6 data groups), Dexie.js 4 (7 tables), NetworkStatusService (3-tier) |
| Adaptive Video | Shaka Player 5.x (maritime ABR: 60s buffer, 10 retries), QoETrackerService, OfflineVideoService |
| Offline Sync | OfflineSyncService (batch sync, failedCount, retryFailed), offline HTTP interceptor (GET→IndexedDB, mutations→queue) |
| Course Download | CourseDownloadService (metadata+chapters+lessons), 90% quota pre-check, unsynced progress warning |
| SW Update safety | User confirmation dialog instead of auto-reload (prevents data loss during quiz/assignment) |
| Dual SW fix | Removed custom sw.js fetch handlers + registration from main.ts → NGSW sole cache owner |
| BE SyncUseCase | Implemented routing (was 100% stubbed): additive merge (video), server-wins (grades/quiz) |
| Offline Fallback | OfflineFallbackComponent: downloaded courses list, pending/failed sync UI, retry button |
| New shared components | OfflineIndicatorComponent, StorageBudgetComponent, VideoPlayerAdaptiveComponent |
| New interceptor | offline.interceptor.ts (4th interceptor, after auth/baseUrl/error) |
| **Download-First** | LearningService.loadCourse()/loadLesson() reads IndexedDB first for downloaded courses (stale-while-revalidate) |
| **Background refresh** | Silent server refresh in background, no loading spinner, updates only if content changed |
| **Auto-redirect /offline** | app.ts effect monitors network status → redirects to /offline → restores URL on reconnect |
| **SyncUseCase tests** | 23 unit tests (7 nested classes), NetworkStatusService spec (10 tests) |

### 2026-02-12 Sessions 48-56 (System Audits + Final Polish)

**Score: 9.8/10 → 10/10**

| Task | Detail |
|------|--------|
| S48: setTimeout→effect() | Replaced setTimeout in course-learning auto-expand with reactive `effect()` |
| S48: Dead route cleanup | Deleted empty `communication.routes.ts` (forum removed S38) |
| S50: 7 duplicate components deleted | notification-bell, ui/pagination, ui/search x2, ui/side-drawer, shared/search, auth.interceptor |
| S50: GlobalState dead code | Removed 4 unused computed signals, 3 unused methods |
| S51: Rubric mock→real API | 3 components (creator, editor, manager) → `rubric.api.ts` |
| S52: Design token unification | `bg-blue-600` → `bg-[#0056D2]` across 130+ files |
| S52: Gradient elimination | ~25 locations simplified to flat colors |
| S52: Non-semantic red fix | `focus:ring-red-500` → `focus:ring-[#0056D2]` in 5 files |
| S53: Course status simplification | Removed PUBLISHED/ARCHIVED, clean DRAFT→PENDING→APPROVED flow |
| S55: Engagement mock→real | Bookmarks, notes, study planner → local signal-based (no mock API) |
| S55: Teacher revenue/invitation | Real endpoints + honest stubs for payment features |
| S56: English→Vietnamese | 13 remaining English strings fixed (route titles, upload messages) |
| S56: TeacherStudent stubs→real DB | 3 endpoints now query real data (assignments, analytics, status) |

### 2026-02-11 Session 47 (Teacher Courses Table + Course Editor Audit)

**Score: 9.8/10 (maintained)**

| Task | Detail |
|------|--------|
| Teacher courses table redesign | Plain 5-col table → Shopify-style 6-col: thumbnail, delivery mode badge, status badge w/ dot, category chip, chapter/lesson counts, 3-slot actions |
| Delivery mode filter | New `modeFilter` signal + filter pills: `Tất cả \| Khóa học \| Lớp học` |
| CourseSummary type extended | Added `deliveryMode`, `sectionCount`, `lessonCount`, `maxStudents`, `updatedAt` + API mapping |
| Course info save flow fixed | `form.markAsPristine()` after save, `loadCourse(id, true)` for force refresh, error format `err?.error?.message` |
| Hidden form fields exposed | `welcomeMessage` + `benefits` rendered in "Lợi ích & Chào mừng" card |

### 2026-02-09 Session 32 (DnD SOTA + 3-Level Tree)

**Score: 9.7/10 (maintained)**

| Task | Detail |
|------|--------|
| 3-level tree hierarchy | Sidebar: Chapter → Lesson → Section expand/collapse (`expandedLessons` signal) |
| Drag placeholders | Blue insertion line at all 3 levels (CDK `*cdkDragPlaceholder`) |
| 6-dot drag handle | Coursera/Teachable pattern, hover-only (CDK `cdkDragHandle`) |
| Custom drag preview | Blue-bordered card (`*cdkDragPreview`) |
| Optimistic reorder | `reorderLessonsOptimistic()` + `reorderSectionsOptimistic()` in store |
| Keyboard reorder | Move up/down for chapters, lessons, sections (WCAG 2.5.7) |
| Move To Chapter modal | Canvas LMS "Move To" pattern for cross-container lesson move |
| Touch optimization | `cdkDragStartDelay=150ms`, `cdkScrollable` auto-scroll |

### 2026-02-09 Sessions 29-31 (Security + ConfirmDialog + Encoding)

**Score: 9.5/10 -> 9.7/10**

| Task | Detail |
|------|--------|
| ConfirmDialog + Toast | 98 `alert()`/`confirm()` → 0 in 26+ teacher files |
| Vietnamese encoding fix | 60+ strings fixed across 10 files |
| Dashboard v3 | Editorial/flat design, blue accent (#0056D2), no emoji |
| 3-step course wizard | mode + title + category → description + price → summary + create |
| Readiness checklist | 8 items, canPublish computed |

### 2026-02-08 Sessions 25-28 (Mock Elimination + MVP Completion)

**Score: 9.5/10 -> 9.7/10**

| Task | Detail |
|------|--------|
| Mock data elimination | 0 `simulateApiCall()`, 0 `loadMockData()` remaining |
| Security fixes | Enrollment guard, quiz ownership validation, teacher-id from AuthService |
| Dead code cleanup | 11 files deleted (lesson-viewer, professional-learning, video-player, mock-courses, quiz.service, analytics.service, types/) |
| Silent error handlers | 18 critical handlers now provide user feedback |
| TODO cleanup | 13 → 2 (both are documented future work) |
| Enrollment service | Real API calls (removed dev mode + mock data) |
| Quiz result component | Real `QuizApi.getQuizResult()` (was 40-line mock) |
| Learning quiz DDD | 400+ lines mock `QuizRepository` → real `QuizApi` calls |
| Course detail service | 3 mock repositories → real API (reviews, modules, enrollment) |
| State services | 4 → 3 (`quiz.service.ts` in `state/` deleted) |

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
