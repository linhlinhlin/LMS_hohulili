# Student Lesson View Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Student Lesson View UI from 1100+ LOC SCSS to Tailwind inline classes, matching the reference template 1:1 with #0056D2 color adaptation.

**Architecture:** Tailwind-First Rewrite — keep all existing TS logic (signals, video tracking, payment gating, keyboard shortcuts), rewrite only HTML templates and delete SCSS. Add Material Symbols Outlined font, tab navigation signal, and breadcrumb.

**Tech Stack:** Angular 20.3 (Signals, OnPush), Tailwind CSS, Material Symbols Outlined

---

## File Overview

| File | Action | LOC Change |
|------|--------|------------|
| `fe/src/index.html` | Add Material Symbols font link | +1 |
| `fe/src/app/features/learning/pages/course-learning.component.ts` | Add `activeTab` signal, remove `searchQuery`/`sidebarCollapsed` | ~10 lines |
| `fe/src/app/features/learning/pages/course-learning.component.html` | Full rewrite (366 → ~350 LOC Tailwind) | Rewrite |
| `fe/src/app/features/learning/pages/course-learning.component.scss` | Empty (1100 → ~5 LOC) | -1095 |
| `fe/src/app/features/learning/components/lesson-content/lesson-content.component.html` | Full rewrite (243 → ~250 LOC Tailwind) | Rewrite |
| `fe/src/app/features/learning/components/lesson-content/lesson-content.component.scss` | Empty (~300 → ~5 LOC) | -295 |
| `fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts` | Add `activeTab` signal | +5 lines |

---

### Task 1: Add Material Symbols Outlined Font

**Files:**
- Modify: `fe/src/index.html:83`

**Step 1: Add Material Symbols Outlined link**

In `fe/src/index.html`, after line 83 (`Material+Icons` link), add:

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

**Step 2: Verify no build errors**

Run: `cd fe && npx ng build --configuration=development 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add fe/src/index.html
git commit -m "feat(learning): add Material Symbols Outlined font for lesson view redesign"
```

---

### Task 2: Add Tab Signal + Clean Up Unused Signals in TS

**Files:**
- Modify: `fe/src/app/features/learning/pages/course-learning.component.ts:44-50`
- Modify: `fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts`

**Step 1: Add activeTab signal to course-learning.component.ts**

After line 53 (`error = signal<string | null>(null);`), add:

```typescript
// Active content tab (reference template: Tổng quan | Tài liệu | Thảo luận)
activeTab = signal<'overview' | 'materials' | 'discussion'>('overview');
```

Remove these signals that are no longer needed (sidebar collapse and search are removed from new design):

- Line 49: `sidebarCollapsed = signal(false);` → DELETE
- Line 50: `searchQuery = signal('');` → DELETE

Remove methods that reference deleted signals:

- Lines 248-254: `toggleSidebar()` → Simplify to only handle mobile:
```typescript
toggleSidebar(): void {
  this.showMobileSidebar.update(show => !show);
}
```

- Lines 263-269: `onSearchChange()` and `clearSearch()` → DELETE both methods

- Lines 150-164: `filteredSections` computed → Simplify to just return `this.sections()`:
```typescript
filteredSections = computed(() => this.sections());
```

**Step 2: Add activeTab signal to lesson-content.component.ts**

After line 66 (`readonly goToQuiz = output<void>();`), add:

```typescript
// Active tab for content view
readonly activeTab = input<'overview' | 'materials' | 'discussion'>('overview');
```

**Step 3: Build to verify**

Run: `cd fe && npx ng build --configuration=development 2>&1 | tail -10`
Expected: Build succeeds (template references to deleted signals will be fixed in Task 3)

**Note:** This step may produce template errors since HTML still references `searchQuery`, `sidebarCollapsed`, etc. That's expected — Task 3 rewrites the HTML.

**Step 4: Commit**

```bash
git add fe/src/app/features/learning/pages/course-learning.component.ts
git add fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts
git commit -m "feat(learning): add tab signal, remove sidebar collapse and search"
```

---

### Task 3: Rewrite Sidebar — course-learning.component.html

**Files:**
- Rewrite: `fe/src/app/features/learning/pages/course-learning.component.html`

This is the main rewrite. Replace the entire HTML file with Tailwind classes matching the reference template.

**Step 1: Write the new template**

Replace the ENTIRE contents of `course-learning.component.html` with:

```html
<div class="h-screen flex flex-col md:flex-row overflow-hidden bg-white">

  <!-- Mobile Header (md:hidden) -->
  <header class="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white z-20 shrink-0">
    <button class="text-slate-700 p-1" (click)="toggleSidebar()">
      <span class="material-symbols-outlined">menu</span>
    </button>
    <h1 class="text-sm font-bold truncate text-[#0056D2] max-w-[220px]">{{ course()?.title || 'Đang tải...' }}</h1>
    <button class="text-slate-700 p-1">
      <span class="material-symbols-outlined">more_vert</span>
    </button>
  </header>

  <!-- Mobile Sidebar Overlay -->
  @if (isMobileView() && showMobileSidebar()) {
  <div class="fixed inset-0 bg-black/50 z-40" (click)="closeMobileSidebar()"></div>
  }

  <!-- Sidebar -->
  <aside class="hidden md:flex w-[300px] flex-col border-r border-gray-200 bg-white h-full z-10 shrink-0"
    [class.hidden]="isMobileView() && !showMobileSidebar()"
    [class.!flex]="isMobileView() && showMobileSidebar()"
    [class.fixed]="isMobileView()"
    [class.left-0]="isMobileView()"
    [class.top-0]="isMobileView()"
    [class.bottom-0]="isMobileView()"
    [class.w-[85vw]]="isMobileView()"
    [class.max-w-[320px]]="isMobileView()"
    [class.z-50]="isMobileView()"
    [class.shadow-xl]="isMobileView()">

    <!-- Sidebar Header -->
    <div class="px-4 py-4 border-b border-gray-200">
      <div class="flex items-center text-xs font-medium text-slate-500 mb-3 cursor-pointer hover:text-[#0056D2] transition-colors"
        (click)="goBack()">
        <span class="material-symbols-outlined text-sm mr-1">arrow_back</span>
        Danh sách khóa học
      </div>
      <h2 class="font-bold text-[#0056D2] text-base leading-tight mb-3">{{ course()?.title || 'Đang tải...' }}</h2>
      <div class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-green-600 rounded-full transition-all duration-500"
            [style.width.%]="progressPercentage()"></div>
        </div>
        <span class="text-xs font-bold text-slate-700">{{ progressPercentage() }}%</span>
      </div>
    </div>

    <!-- Paywall Banner -->
    @if (coursePaid() && !hasPaid()) {
    <div class="mx-4 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-amber-100 transition-colors text-sm text-amber-800"
      (click)="showPaymentModal.set(true)">
      <span class="material-symbols-outlined text-base">lock</span>
      <span class="flex-1 font-medium">Mở khóa toàn bộ khóa học</span>
      <span class="material-symbols-outlined text-sm">chevron_right</span>
    </div>
    }

    <!-- Course Navigation -->
    <div class="flex-1 overflow-y-auto" style="scrollbar-width: thin;">
      @if (isLoadingCourse()) {
      <div class="flex flex-col items-center justify-center py-12 text-slate-400">
        <div class="w-8 h-8 border-3 border-slate-200 border-t-[#0056D2] rounded-full animate-spin mb-3"></div>
        <p class="text-sm">Đang tải nội dung...</p>
      </div>
      } @else if (courseError()) {
      <div class="flex flex-col items-center justify-center py-12 text-red-500 px-4">
        <span class="material-symbols-outlined text-3xl mb-2">error</span>
        <p class="text-sm text-center">{{ courseError() }}</p>
      </div>
      } @else {
      @for (section of filteredSections(); track section.id) {
      <div>
        <!-- Level 1: Chapter Header -->
        <button class="flex items-center justify-between w-full px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
          [class.bg-slate-100]="isSectionExpanded(section.id)"
          [class.bg-gray-50]="!isSectionExpanded(section.id)"
          (click)="toggleSection(section.id)"
          [attr.aria-expanded]="isSectionExpanded(section.id)">
          <h3 class="text-sm font-bold text-left"
            [class.text-[#0056D2]]="isSectionExpanded(section.id)"
            [class.text-slate-800]="!isSectionExpanded(section.id)">
            {{ section.title }}
          </h3>
          <span class="material-symbols-outlined text-sm transition-transform duration-200"
            [class.text-[#0056D2]]="isSectionExpanded(section.id)"
            [class.text-slate-400]="!isSectionExpanded(section.id)"
            [class.rotate-180]="isSectionExpanded(section.id)">
            expand_more
          </span>
        </button>

        <!-- Level 2 + Level 3: Lessons + Sections -->
        @if (isSectionExpanded(section.id)) {
        <div>
          @for (lesson of section.lessons; track lesson.id) {
          <!-- Level 2: Lesson Item -->
          <button class="flex items-start gap-3 w-full px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 text-left"
            [class.bg-[#E6F0FA]]="currentLesson()?.id === lesson.id"
            [class.border-[#0056D2]]="currentLesson()?.id === lesson.id && !learningService.isLessonCompleted(lesson.id)()"
            [class.border-green-500]="learningService.isLessonCompleted(lesson.id)()"
            [class.border-transparent]="currentLesson()?.id !== lesson.id && !learningService.isLessonCompleted(lesson.id)()"
            [class.opacity-60]="isLessonLocked(lesson)"
            (click)="toggleLesson(lesson)">

            <!-- Status Icon -->
            @if (isLessonLocked(lesson)) {
            <span class="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">lock</span>
            } @else if (learningService.isLessonCompleted(lesson.id)()) {
            <span class="material-symbols-outlined text-green-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
            } @else if (currentLesson()?.id === lesson.id) {
            <span class="material-symbols-outlined text-[#0056D2] text-[18px] shrink-0 mt-0.5">play_circle</span>
            } @else {
            <span class="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">radio_button_unchecked</span>
            }

            <!-- Lesson Info -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate"
                [class.font-bold]="currentLesson()?.id === lesson.id"
                [class.text-[#0056D2]]="currentLesson()?.id === lesson.id"
                [class.text-slate-700]="currentLesson()?.id !== lesson.id">
                {{ lesson.title }}
              </div>
              @if (lesson.duration > 0) {
              <div class="text-xs text-slate-400 mt-0.5">{{ lesson.duration }} phút</div>
              }
            </div>

            <!-- Expand icon for lessons with sections -->
            @if (lesson.sections && lesson.sections.length > 0) {
            <span class="material-symbols-outlined text-slate-400 text-sm transition-transform duration-200 shrink-0"
              [class.rotate-180]="isLessonExpanded(lesson.id)">
              expand_more
            </span>
            }
          </button>

          <!-- Level 3: Sub-sections -->
          @if (lesson.sections && lesson.sections.length > 0 && isLessonExpanded(lesson.id)) {
          @for (sectionItem of lesson.sections; track sectionItem.id; let sectionIndex = $index) {
          <button class="flex items-center gap-2 w-full pl-12 pr-4 py-1.5 text-xs cursor-pointer transition-colors text-left"
            [class.text-green-600]="isSectionCompleted(sectionItem.id)"
            [class.font-semibold]="currentLesson()?.id === lesson.id && currentSectionIndex() === sectionIndex"
            [class.text-[#0056D2]]="currentLesson()?.id === lesson.id && currentSectionIndex() === sectionIndex"
            [class.bg-blue-50/50]="currentLesson()?.id === lesson.id && currentSectionIndex() === sectionIndex"
            [class.text-slate-500]="!isSectionCompleted(sectionItem.id) && !(currentLesson()?.id === lesson.id && currentSectionIndex() === sectionIndex)"
            [class.hover:text-[#0056D2]]="true"
            (click)="selectSectionInSidebar(sectionIndex, $event)">
            <!-- Type Icon -->
            @if (sectionItem.type === 'VIDEO') {
            <span class="material-symbols-outlined text-[14px]">play_circle</span>
            } @else if (sectionItem.type === 'TEXT') {
            <span class="material-symbols-outlined text-[14px]">description</span>
            } @else if (sectionItem.type === 'QUIZ') {
            <span class="material-symbols-outlined text-[14px]">quiz</span>
            } @else {
            <span class="material-symbols-outlined text-[14px]">attach_file</span>
            }
            <span class="truncate">{{ sectionItem.title }}</span>
          </button>
          }
          }

          <!-- Quiz button -->
          @if (hasQuiz(lesson.id)) {
          <button class="flex items-center gap-2 w-full pl-12 pr-4 py-1.5 text-xs text-amber-600 hover:text-amber-700 cursor-pointer transition-colors"
            (click)="goToQuiz(lesson.id, $event)">
            <span class="material-symbols-outlined text-[14px]">assignment</span>
            <span>Làm bài trắc nghiệm</span>
          </button>
          }
          }
        </div>
        }
      </div>
      }
      }
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="flex-1 flex flex-col h-full relative bg-white overflow-hidden">

    <!-- Breadcrumb (desktop only) -->
    <div class="hidden md:flex px-6 py-3 items-center text-xs text-slate-500 gap-2 border-b border-gray-100 bg-white shrink-0">
      <span class="hover:text-[#0056D2] cursor-pointer" (click)="goBack()">Khóa học</span>
      <span class="material-symbols-outlined text-[10px]">chevron_right</span>
      @if (filteredSections()[currentChapterIndex()]; as chapter) {
      <span class="hover:text-[#0056D2] cursor-pointer">{{ chapter.title }}</span>
      <span class="material-symbols-outlined text-[10px]">chevron_right</span>
      }
      @if (currentLesson(); as lesson) {
      <span class="font-semibold text-[#0056D2]">Bài {{ currentChapterIndex() + 1 }}.{{ currentLessonIndex() + 1 }}: {{ lesson.title }}</span>
      }
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto scroll-smooth pb-20">
      @if (error()) {
      <div class="mx-4 mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex justify-between items-center">
        <span>{{ error() }}</span>
        <button (click)="error.set(null)" class="text-red-600 hover:text-red-800 text-lg font-bold">&times;</button>
      </div>
      }

      @if (isLoadingLesson()) {
      <div class="flex flex-col items-center justify-center py-20 text-slate-400">
        <div class="w-10 h-10 border-3 border-slate-200 border-t-[#0056D2] rounded-full animate-spin mb-4"></div>
        <p class="text-sm">Đang tải bài học...</p>
      </div>
      } @else if (lessonError()) {
      <div class="flex flex-col items-center justify-center py-20 px-6 text-center">
        <span class="material-symbols-outlined text-4xl text-red-400 mb-3">error</span>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Lỗi tải bài học</h3>
        <p class="text-sm text-slate-500 mb-4">{{ lessonError() }}</p>
        <button class="px-6 py-2 bg-[#0056D2] text-white rounded-lg text-sm font-medium hover:bg-[#004BB5] transition-colors"
          (click)="loadCourseFromRoute()">
          Thử lại
        </button>
      </div>
      } @else if (currentLesson()) {
      <!-- Lesson Content Component -->
      <app-lesson-content [lesson]="currentLesson()!"
        [isCompleted]="learningService.isLessonCompleted(currentLesson()!.id)()"
        [hasQuiz]="hasQuiz(currentLesson()!.id)"
        [sectionIndex]="currentSectionIndex()"
        [chapterIndex]="currentChapterIndex()"
        [lessonIndex]="currentLessonIndex()"
        [activeTab]="activeTab()"
        (sectionIndexChange)="onSectionIndexChange($event)"
        (markComplete)="onMarkComplete()"
        (videoEnded)="onVideoEnded()"
        (sectionReadComplete)="onSectionReadComplete($event)">
      </app-lesson-content>
      } @else {
      <div class="flex flex-col items-center justify-center py-20 text-slate-400">
        <span class="material-symbols-outlined text-5xl mb-3">menu_book</span>
        <h3 class="text-lg font-semibold text-slate-700 mb-1">Chọn bài học để bắt đầu</h3>
        <p class="text-sm">Chọn một bài học từ danh sách bên trái</p>
      </div>
      }
    </div>

    <!-- Bottom Navigation Bar -->
    @if (currentLesson()) {
    <div class="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <!-- Previous -->
        <button class="flex items-center gap-1 px-3 py-2 rounded text-slate-500 hover:text-[#0056D2] hover:bg-slate-50 transition-colors"
          [class.opacity-40]="!canGoPrevious() && currentSectionIndex() === 0"
          [class.pointer-events-none]="!canGoPrevious() && currentSectionIndex() === 0"
          (click)="previousLesson()">
          <span class="material-symbols-outlined text-xl">arrow_back</span>
          <span class="hidden sm:inline text-sm font-medium">Bài trước</span>
        </button>

        <!-- Mark Complete -->
        <button class="px-6 py-2.5 rounded shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm font-bold tracking-wide"
          [class.bg-green-600]="learningService.isLessonCompleted(currentLesson()!.id)()"
          [class.text-white]="true"
          [class.bg-gradient-to-b]="!learningService.isLessonCompleted(currentLesson()!.id)()"
          [class.from-[#0066E6]]="!learningService.isLessonCompleted(currentLesson()!.id)()"
          [class.to-[#0056D2]]="!learningService.isLessonCompleted(currentLesson()!.id)()"
          [class.hover:brightness-110]="true"
          (click)="onMarkComplete()">
          @if (learningService.isLessonCompleted(currentLesson()!.id)()) {
          <span class="material-symbols-outlined text-base">check</span>
          <span>Đã hoàn thành</span>
          } @else {
          <span>Đánh dấu hoàn thành</span>
          <span class="material-symbols-outlined text-base">check</span>
          }
        </button>

        <!-- Next -->
        <button class="flex items-center gap-1 px-3 py-2 rounded text-slate-500 hover:text-[#0056D2] hover:bg-slate-50 transition-colors"
          [class.opacity-40]="!canGoNext() && (!currentLesson()?.sections || currentSectionIndex() >= (currentLesson()?.sections?.length || 0) - 1)"
          [class.pointer-events-none]="!canGoNext() && (!currentLesson()?.sections || currentSectionIndex() >= (currentLesson()?.sections?.length || 0) - 1)"
          (click)="nextLesson()">
          <span class="hidden sm:inline text-sm font-medium">Bài tiếp theo</span>
          <span class="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </div>
    }
  </main>

  <!-- Payment Modal -->
  @if (showPaymentModal()) {
  <app-payment-modal
    [courseInfo]="getPaymentInfo()"
    (close)="onPaymentModalClose($event)"
    (paymentComplete)="onPaymentComplete()">
  </app-payment-modal>
  }
</div>
```

**Step 2: Verify build compiles**

Run: `cd fe && npx ng build --configuration=development 2>&1 | tail -10`
Expected: Build succeeds (or only warnings for unused TS methods — clean up later)

**Step 3: Commit**

```bash
git add fe/src/app/features/learning/pages/course-learning.component.html
git commit -m "feat(learning): rewrite sidebar + main layout with Tailwind (ref template)"
```

---

### Task 4: Rewrite lesson-content.component.html with Tailwind

**Files:**
- Rewrite: `fe/src/app/features/learning/components/lesson-content/lesson-content.component.html`

**Step 1: Write the new template**

Replace the ENTIRE contents of `lesson-content.component.html` with:

```html
<div class="flex flex-col min-h-full">

  <!-- VIDEO SECTION -->
  @if (currentSection(); as section) {
    @if (section.type === 'VIDEO' && section.videoUrl) {
    <div class="w-full bg-black relative aspect-video md:max-h-[55vh] shadow-sm">
      @if (isYouTubeUrl(section.videoUrl)) {
      <app-youtube-player
        [videoUrl]="section.videoUrl"
        [lessonId]="lesson().id"
        [sectionId]="section.id" />
      } @else {
      <video [src]="getVideoSrc(section.videoUrl)" controls controlsList="nodownload"
        class="w-full h-full object-contain bg-black"
        (ended)="onVideoEnd()"
        (loadedmetadata)="onVideoLoadedMetadata($event)"
        (timeupdate)="onVideoTimeUpdate($event)">
        Trình duyệt của bạn không hỗ trợ video.
      </video>
      }

      <!-- Video Progress Overlay -->
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-2">
        <div class="flex items-center gap-3 text-white text-xs">
          <div class="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div class="h-full bg-[#0056D2] rounded-full transition-all" [style.width.%]="videoProgress()"></div>
          </div>
          <span class="font-medium whitespace-nowrap">{{ videoProgress() | number:'1.0-0' }}%</span>
          @if (videoCompleted()) {
          <span class="text-green-400 font-semibold">Hoàn thành</span>
          }
        </div>
      </div>
    </div>
    }
  }

  <!-- Fallback: Lesson-level video (no sections) -->
  @if (!hasSections() && lesson().videoUrl) {
  <div class="w-full bg-black relative aspect-video md:max-h-[55vh] shadow-sm">
    @if (isYouTubeUrl(lesson().videoUrl)) {
    <app-youtube-player
      [videoUrl]="lesson().videoUrl!"
      [lessonId]="lesson().id"
      [sectionId]="'lesson-' + lesson().id" />
    } @else {
    <video [src]="getVideoSrc(lesson().videoUrl)" [poster]="lesson().thumbnail" controls controlsList="nodownload"
      class="w-full h-full object-contain bg-black"
      (ended)="onVideoEnd()"
      (loadedmetadata)="onVideoLoadedMetadata($event)"
      (timeupdate)="onVideoTimeUpdate($event)">
      Trình duyệt của bạn không hỗ trợ video.
    </video>
    }
  </div>
  }

  <!-- Content Area -->
  <div class="max-w-5xl mx-auto w-full px-4 md:px-8 pt-4">

    <!-- Pill Tabs -->
    <div class="flex justify-center border-b border-gray-200 pb-0 mb-6">
      <div class="flex gap-2 p-1 bg-gray-50/50 rounded-full border border-gray-100">
        <button class="px-6 py-1.5 rounded-full text-sm transition-all"
          [class.bg-[#0056D2]]="activeTab() === 'overview'"
          [class.text-white]="activeTab() === 'overview'"
          [class.font-semibold]="activeTab() === 'overview'"
          [class.shadow-sm]="activeTab() === 'overview'"
          [class.text-slate-600]="activeTab() !== 'overview'"
          [class.font-medium]="activeTab() !== 'overview'"
          [class.hover:bg-gray-100]="activeTab() !== 'overview'"
          (click)="sectionIndex.set(sectionIndex()); activeTab() !== 'overview'">
          Tổng quan
        </button>
        <button class="px-6 py-1.5 rounded-full text-sm transition-all"
          [class.bg-[#0056D2]]="activeTab() === 'materials'"
          [class.text-white]="activeTab() === 'materials'"
          [class.font-semibold]="activeTab() === 'materials'"
          [class.shadow-sm]="activeTab() === 'materials'"
          [class.text-slate-600]="activeTab() !== 'materials'"
          [class.font-medium]="activeTab() !== 'materials'"
          [class.hover:bg-gray-100]="activeTab() !== 'materials'">
          Tài liệu
        </button>
        <button class="px-6 py-1.5 rounded-full text-sm transition-all"
          [class.bg-[#0056D2]]="activeTab() === 'discussion'"
          [class.text-white]="activeTab() === 'discussion'"
          [class.font-semibold]="activeTab() === 'discussion'"
          [class.shadow-sm]="activeTab() === 'discussion'"
          [class.text-slate-600]="activeTab() !== 'discussion'"
          [class.font-medium]="activeTab() !== 'discussion'"
          [class.hover:bg-gray-100]="activeTab() !== 'discussion'">
          Thảo luận
        </button>
      </div>
    </div>

    <!-- Tab: Overview (default) -->
    @if (activeTab() === 'overview') {

    <!-- Section Nav Bar (if lesson has sections) -->
    @if (hasSections() && lesson().sections && currentSection(); as section) {
    <div class="flex items-center justify-between py-2 mb-1 border-b border-gray-200">
      <div class="flex items-center gap-3">
        <span class="text-[11px] font-bold text-[#0056D2] bg-[#0056D2]/5 px-2 py-0.5 rounded-full whitespace-nowrap tracking-wide">
          Phần {{ sectionIndex() + 1 }}/{{ lesson().sections!.length }}
        </span>
        @if (lesson().sections!.length > 1) {
        <div class="flex items-center gap-1.5">
          @for (s of lesson().sections!; track s.id; let i = $index) {
          <button class="w-2 h-2 rounded-full border-[1.5px] transition-all"
            [class.bg-[#0056D2]]="i === sectionIndex()"
            [class.border-[#0056D2]]="i === sectionIndex()"
            [class.scale-115]="i === sectionIndex()"
            [class.shadow-[0_0_0_2px_rgba(0,86,210,0.15)]]="i === sectionIndex()"
            [class.bg-green-500]="i < sectionIndex()"
            [class.border-green-500]="i < sectionIndex()"
            [class.bg-white]="i > sectionIndex()"
            [class.border-gray-300]="i > sectionIndex()"
            [class.hover:border-[#0056D2]]="true"
            [class.hover:scale-125]="true"
            (click)="selectSection(i)"
            [attr.aria-label]="'Phần ' + (i + 1)">
          </button>
          }
        </div>
        }
      </div>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-widest"
        [class.bg-pink-100]="section.type === 'VIDEO'" [class.text-pink-700]="section.type === 'VIDEO'"
        [class.bg-blue-100]="section.type === 'TEXT'" [class.text-blue-800]="section.type === 'TEXT'"
        [class.bg-amber-100]="section.type === 'QUIZ'" [class.text-amber-700]="section.type === 'QUIZ'"
        [class.bg-green-100]="section.type === 'FILE'" [class.text-green-700]="section.type === 'FILE'"
        [class.bg-indigo-100]="section.type === 'ASSIGNMENT'" [class.text-indigo-700]="section.type === 'ASSIGNMENT'">
        {{ getSectionTypeLabel(section.type) }}
      </span>
    </div>
    }

    <!-- Lesson/Section Title + Metadata -->
    <div class="mb-5 border-b border-gray-100 pb-5">
      @if (hasSections() && currentSection(); as section) {
      <h1 class="text-xl md:text-2xl font-bold text-[#0056D2] mb-2 leading-tight">
        {{ lessonNumber() }}: {{ section.title }}
      </h1>
      } @else {
      <h1 class="text-xl md:text-2xl font-bold text-[#0056D2] mb-2 leading-tight">
        {{ lessonNumber() }}: {{ lesson().title }}
      </h1>
      @if (lesson().description) {
      <p class="text-sm text-slate-500 mt-1">{{ lesson().description }}</p>
      }
      }

      <!-- Instructor metadata -->
      <div class="flex items-center gap-4 text-xs text-slate-500 mt-2">
        <div class="flex items-center gap-1.5">
          <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
            <span class="material-symbols-outlined text-slate-400 text-sm">person</span>
          </div>
          <span class="font-medium text-slate-700">{{ lesson().courseTitle || 'Giảng viên' }}</span>
        </div>
        @if (lesson().durationMinutes) {
        <span class="text-slate-300">&bull;</span>
        <span>{{ lesson().durationMinutes }} phút</span>
        }
      </div>
    </div>

    <!-- Content Body -->
    @if (currentSection(); as section) {
    <div class="space-y-5 text-slate-800 text-[15px] leading-relaxed max-w-none pb-8">

      <!-- Text Section -->
      @if (section.type === 'TEXT' && section.content) {
      <div class="prose prose-slate max-w-none" #textContent [innerHTML]="getSanitizedHtml(section.content)"></div>
      <!-- Reading progress -->
      @if (readingProgress() > 0 && readingProgress() < 100) {
      <div class="flex items-center gap-2 text-xs text-slate-400 mt-4">
        <div class="flex-1 h-1 bg-slate-100 rounded-full">
          <div class="h-full bg-green-500 rounded-full transition-all" [style.width.%]="readingProgress()"></div>
        </div>
        <span>{{ readingProgress() | number:'1.0-0' }}% đã đọc</span>
      </div>
      }
      }

      <!-- File Section -->
      @if (section.type === 'FILE' && section.fileUrl) {
      <div class="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white hover:border-[#0056D2] transition-colors">
        <div class="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined">picture_as_pdf</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-slate-700 truncate">{{ section.title }}</h3>
          <p class="text-xs text-slate-500">Nhấn để tải xuống tài liệu</p>
        </div>
        <a [href]="section.fileUrl" download target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-[#0056D2] text-white text-xs font-medium rounded-lg hover:bg-[#004BB5] transition-colors">
          <span class="material-symbols-outlined text-base">download</span>
          Tải xuống
        </a>
      </div>
      }

      <!-- Quiz Section -->
      @if (section.type === 'QUIZ') {
      <div class="p-6 border border-amber-200 bg-amber-50 rounded-xl text-center">
        <span class="material-symbols-outlined text-4xl text-amber-600 mb-2">assignment</span>
        <h3 class="text-lg font-bold text-slate-800 mb-1">{{ section.title }}</h3>
        <p class="text-sm text-slate-500 mb-4">Sẵn sàng kiểm tra kiến thức của bạn?</p>
        <button (click)="onGoToQuiz()"
          class="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0056D2] text-white font-semibold rounded-lg hover:bg-[#004BB5] transition-colors">
          <span>Làm bài trắc nghiệm</span>
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
      }

      <!-- Assignment Section -->
      @if (section.type === 'ASSIGNMENT' && section.content) {
      <div class="p-4 border border-indigo-200 bg-indigo-50 rounded-xl">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-indigo-600">edit_note</span>
          <h3 class="text-base font-bold text-slate-800">Bài tập: {{ section.title }}</h3>
        </div>
        <div class="prose prose-slate max-w-none text-sm" [innerHTML]="getSanitizedHtml(section.content)"></div>
      </div>
      }
    </div>
    } @else {
    <!-- Fallback: Lesson-level content -->
    @if (lesson().content) {
    <div class="prose prose-slate max-w-none text-[15px] leading-relaxed pb-8" [innerHTML]="getSafeHtmlContent()"></div>
    }
    }

    <!-- Quiz Button (for QUIZ type lessons without sections) -->
    @if ((hasQuiz() || lesson().lessonType === LessonType.QUIZ) && !hasSections()) {
    <div class="p-6 border border-amber-200 bg-amber-50 rounded-xl text-center mt-6">
      <span class="material-symbols-outlined text-4xl text-amber-600 mb-2">assignment</span>
      <h3 class="text-lg font-bold text-slate-800 mb-1">Kiểm tra</h3>
      <p class="text-sm text-slate-500 mb-4">Sẵn sàng kiểm tra kiến thức của bạn?</p>
      <button (click)="onGoToQuiz()"
        class="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0056D2] text-white font-semibold rounded-lg hover:bg-[#004BB5] transition-colors">
        <span>Làm bài trắc nghiệm</span>
        <span class="material-symbols-outlined text-base">arrow_forward</span>
      </button>
    </div>
    }

    } <!-- end overview tab -->

    <!-- Tab: Materials -->
    @if (activeTab() === 'materials') {
    <div class="pb-8">
      <h2 class="text-lg font-bold text-slate-800 mb-4">Tài liệu đính kèm</h2>

      @if (lesson().attachments && lesson().attachments.length > 0) {
      <div class="flex flex-wrap gap-3">
        @for (attachment of lesson().attachments; track attachment.id) {
        <a [href]="attachment.fileUrl" download target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-[#0056D2] hover:bg-blue-50/20 transition-all bg-white group min-w-[240px]">
          <div class="w-8 h-8 rounded flex items-center justify-center shrink-0"
            [class.bg-red-50]="attachment.fileType?.includes('pdf')"
            [class.text-red-600]="attachment.fileType?.includes('pdf')"
            [class.bg-blue-50]="!attachment.fileType?.includes('pdf')"
            [class.text-blue-600]="!attachment.fileType?.includes('pdf')">
            <span class="material-symbols-outlined text-lg">
              {{ attachment.fileType?.includes('pdf') ? 'picture_as_pdf' : 'attach_file' }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-slate-700 group-hover:text-[#0056D2] truncate">{{ attachment.originalFileName }}</div>
            @if (attachment.fileSize) {
            <div class="text-[10px] text-slate-500">{{ formatFileSize(attachment.fileSize) }}</div>
            }
          </div>
          <span class="material-symbols-outlined text-slate-400 group-hover:text-[#0056D2] text-lg">download</span>
        </a>
        }
      </div>
      } @else {
      <div class="flex flex-col items-center py-12 text-slate-400">
        <span class="material-symbols-outlined text-4xl mb-2">folder_open</span>
        <p class="text-sm">Chưa có tài liệu đính kèm</p>
      </div>
      }
    </div>
    }

    <!-- Tab: Discussion (placeholder) -->
    @if (activeTab() === 'discussion') {
    <div class="flex flex-col items-center py-16 text-slate-400">
      <span class="material-symbols-outlined text-5xl mb-3">forum</span>
      <h3 class="text-lg font-semibold text-slate-600 mb-1">Thảo luận</h3>
      <p class="text-sm">Tính năng sắp ra mắt</p>
    </div>
    }

    <!-- Attachments (always visible in overview tab) -->
    @if (activeTab() === 'overview' && lesson().attachments && lesson().attachments.length > 0) {
    <div class="mt-8 pt-6 border-t border-gray-100 pb-8">
      <h4 class="text-sm font-bold text-slate-800 mb-3">Tài liệu đính kèm</h4>
      <div class="flex flex-wrap gap-3">
        @for (attachment of lesson().attachments; track attachment.id) {
        <a [href]="attachment.fileUrl" download target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:border-[#0056D2] hover:bg-blue-50/20 transition-all bg-white group min-w-[240px]">
          <div class="w-8 h-8 rounded flex items-center justify-center shrink-0"
            [class.bg-red-50]="attachment.fileType?.includes('pdf')"
            [class.text-red-600]="attachment.fileType?.includes('pdf')"
            [class.bg-blue-50]="!attachment.fileType?.includes('pdf')"
            [class.text-blue-600]="!attachment.fileType?.includes('pdf')">
            <span class="material-symbols-outlined text-lg">
              {{ attachment.fileType?.includes('pdf') ? 'picture_as_pdf' : 'attach_file' }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-slate-700 group-hover:text-[#0056D2] truncate">{{ attachment.originalFileName }}</div>
            @if (attachment.fileSize) {
            <div class="text-[10px] text-slate-500">{{ formatFileSize(attachment.fileSize) }}</div>
            }
          </div>
          <span class="material-symbols-outlined text-slate-400 group-hover:text-[#0056D2] text-lg">download</span>
        </a>
        }
      </div>
    </div>
    }

  </div>
</div>
```

**Step 2: Verify build**

Run: `cd fe && npx ng build --configuration=development 2>&1 | tail -10`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add fe/src/app/features/learning/components/lesson-content/lesson-content.component.html
git commit -m "feat(learning): rewrite lesson-content template with Tailwind (ref template)"
```

---

### Task 5: Empty SCSS Files

**Files:**
- Rewrite: `fe/src/app/features/learning/pages/course-learning.component.scss`
- Rewrite: `fe/src/app/features/learning/components/lesson-content/lesson-content.component.scss`

**Step 1: Replace course-learning.component.scss**

Replace the entire file (~1100 LOC) with:

```scss
// Tailwind classes used directly in template — no SCSS needed.
// Only :host display rule kept for Angular component rendering.
:host {
  display: block;
  height: 100vh;
}

// Spinner animation (Tailwind animate-spin handles this, but fallback)
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}

// Thin scrollbar for sidebar
.sidebar-scroll {
  scrollbar-width: thin;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 2px; }
}
```

**Step 2: Replace lesson-content.component.scss**

Replace the entire file (~300 LOC) with:

```scss
// Tailwind classes used directly in template — no SCSS needed.
:host {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

// Prose styling for HTML content rendered via [innerHTML]
.prose {
  h1, h2, h3, h4, h5, h6 {
    color: #0056D2;
    font-weight: 700;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  h3 { font-size: 1rem; }
  h4 { font-size: 0.875rem; }

  p {
    color: #475569;
    text-align: justify;
    margin-bottom: 1rem;
  }

  ul, ol {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
  }

  li { margin-bottom: 0.25rem; }

  a {
    color: #0056D2;
    text-decoration: underline;
    &:hover { color: #004BB5; }
  }

  img {
    max-width: 100%;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  blockquote {
    border-left: 4px solid #0056D2;
    background: #eff6ff;
    padding: 0.75rem 1rem;
    border-radius: 0 0.375rem 0.375rem 0;
    margin: 1rem 0;
    color: #334155;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;

    th, td {
      border: 1px solid #e2e8f0;
      padding: 0.5rem 0.75rem;
      text-align: left;
    }

    th { background: #f8fafc; font-weight: 600; }
  }

  code {
    background: #f1f5f9;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
    code { background: none; padding: 0; color: inherit; }
  }
}
```

**Step 3: Verify build**

Run: `cd fe && npx ng build --configuration=development 2>&1 | tail -10`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add fe/src/app/features/learning/pages/course-learning.component.scss
git add fe/src/app/features/learning/components/lesson-content/lesson-content.component.scss
git commit -m "refactor(learning): replace SCSS with minimal styles (1400 LOC → ~80 LOC)"
```

---

### Task 6: Fix Tab Click Handlers + Wire activeTab

**Files:**
- Modify: `fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts`
- Modify: `fe/src/app/features/learning/pages/course-learning.component.ts`

**Step 1: Update lesson-content.component.ts — make activeTab a model for two-way binding**

Change the `activeTab` input to a model signal so clicks in child can update parent:

In `lesson-content.component.ts`, change the input added in Task 2:
```typescript
// Replace input with model for two-way binding
readonly activeTab = model<'overview' | 'materials' | 'discussion'>('overview');
```

**Step 2: Fix tab click handlers in lesson-content.component.html**

The tab buttons in Task 4 need proper click handlers. Update the three tab buttons:

```html
<!-- Overview tab button -->
(click)="activeTab.set('overview')"

<!-- Materials tab button -->
(click)="activeTab.set('materials')"

<!-- Discussion tab button -->
(click)="activeTab.set('discussion')"
```

**Step 3: Update course-learning.component.html to use two-way binding**

Change the `[activeTab]` binding to use model syntax:

```html
[(activeTab)]="activeTab"
```

Wait — actually since `activeTab` is on the parent as a signal, and the child uses `model()`, the binding should be:

```html
<app-lesson-content ...
  [(activeTab)]="activeTab"
  ...>
</app-lesson-content>
```

But `activeTab` in parent is `signal()` not `model()`. For two-way binding with `model()`, the parent needs to pass `activeTab` as a model-compatible binding. The cleanest way:

In **course-learning.component.ts**, change:
```typescript
activeTab = signal<'overview' | 'materials' | 'discussion'>('overview');
```
This works with `[(activeTab)]` syntax since Angular 20 supports signal-based two-way binding.

In **course-learning.component.html**, update the app-lesson-content binding:
```html
[(activeTab)]="activeTab"
```

**Step 4: Build and verify**

Run: `cd fe && npx ng build --configuration=development 2>&1 | tail -10`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts
git add fe/src/app/features/learning/components/lesson-content/lesson-content.component.html
git add fe/src/app/features/learning/pages/course-learning.component.ts
git add fe/src/app/features/learning/pages/course-learning.component.html
git commit -m "feat(learning): wire tab navigation with model two-way binding"
```

---

### Task 7: Final Cleanup + CommonModule Check

**Files:**
- Modify: `fe/src/app/features/learning/pages/course-learning.component.ts`
- Modify: `fe/src/app/features/learning/components/lesson-content/lesson-content.component.ts`

**Step 1: Remove CommonModule if no longer needed**

Check if template uses pipes (`| date`, `| number`, `| currency`) or directives (`[ngClass]`, `[ngStyle]`).

- `course-learning.component.html`: No pipes, no NgClass → remove CommonModule from imports if present
- `lesson-content.component.html`: Uses `| number` pipe → KEEP CommonModule

**Step 2: Remove dead methods from course-learning.component.ts**

Methods to remove (referenced by old SCSS-based template):
- `onSearchChange()` (already removed in Task 2)
- `clearSearch()` (already removed in Task 2)

Check for any remaining references to `sidebarCollapsed` in the TS and remove:
- Remove `sidebarCollapsed = signal(false);` if not already done
- Remove the `&.collapsed` reference in `toggleSidebar()` — already simplified in Task 2

**Step 3: Full build**

Run: `cd fe && npx ng build --configuration=production 2>&1 | tail -20`
Expected: Build succeeds with 0 errors

**Step 4: Run fix-ngsw.js (production build)**

The build script already runs this automatically via `npm run build`. Just verify:

Run: `cd fe && npm run build 2>&1 | tail -20`
Expected: Build succeeds, fix-ngsw runs without errors

**Step 5: Commit**

```bash
git add fe/src/app/features/learning/
git commit -m "refactor(learning): final cleanup — remove dead code and unused imports"
```

---

### Task 8: Visual Verification

**No code changes — manual testing only.**

**Step 1: Start dev server**

Run: `cd fe && npm start`

**Step 2: Verify in browser**

Navigate to: `http://localhost:4200/student/learn/course/{courseId}/lesson/{lessonId}`

Login as: `student@maritime.edu` / `student123`

**Checklist:**
- [ ] Sidebar renders with 3-level navigation
- [ ] Back link "← Danh sách khóa học" navigates correctly
- [ ] Progress bar shows green fill
- [ ] Active lesson highlighted with blue border-left
- [ ] Completed lessons show green check + green border
- [ ] Level 3 sections show correct icons
- [ ] Breadcrumb visible on desktop
- [ ] Video player renders correctly
- [ ] Pill tabs switch between Overview / Materials / Discussion
- [ ] Lesson title shows "Bài X.Y: Title" format
- [ ] Attachments show with file icons
- [ ] Bottom nav bar: Previous / Complete / Next
- [ ] Mobile: hamburger menu opens sidebar overlay
- [ ] Mobile: sidebar slides in with overlay
- [ ] Keyboard: ArrowLeft/Right navigates lessons
- [ ] Payment modal opens for locked lessons

**Step 3: Final commit with verification note**

```bash
git add -A
git commit -m "feat(learning): lesson view Tailwind redesign — verified working

Rewrote Student Lesson View from 1400 LOC SCSS to Tailwind inline classes
matching reference template. All existing functionality preserved:
- 3-level sidebar navigation (chapter/lesson/section)
- Video progress tracking (50%/75% rules)
- Payment gating
- Keyboard shortcuts
- Mobile responsive
- PWA offline support"
```

---

## Summary

| Task | Description | Estimated |
|------|-------------|-----------|
| 1 | Add Material Symbols font | 2 min |
| 2 | Add tab signal, clean TS | 5 min |
| 3 | Rewrite sidebar + main layout HTML | 15 min |
| 4 | Rewrite lesson-content HTML | 15 min |
| 5 | Empty SCSS files | 5 min |
| 6 | Wire tab navigation | 5 min |
| 7 | Final cleanup | 5 min |
| 8 | Visual verification | 10 min |

**Total: ~8 tasks, ~60 minutes**

**Key invariants preserved:**
- All video tracking logic (WatchedSegmentsTracker, HeartbeatTracker, ReadingProgressTracker)
- Payment gating (coursePaid, hasPaid, isLessonLocked)
- Section completion tracking
- Quiz validation
- Keyboard shortcuts
- PWA offline video resolution
- URL-based routing
