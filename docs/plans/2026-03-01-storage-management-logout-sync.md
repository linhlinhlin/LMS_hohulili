# P1 Storage Management UI + Logout Sync Check — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give students a dedicated storage management page to view/delete offline downloads, and add a pre-logout sync check to prevent silent data loss.

**Architecture:** FE-only. New `/student/storage` page reads from 4 existing services (StorageManagerService, CourseDownloadService, OfflineVideoService, OfflineSyncService). Logout flow in StudentLayoutSimpleComponent gains a sync check via ConfirmDialogService before calling authService.logout(). One new method `removeAllCourses()` added to CourseDownloadService.

**Tech Stack:** Angular 20.3 (signals, inject(), OnPush, standalone default), Tailwind CSS, Dexie.js 4 (IndexedDB), Cache API, StorageManager API

---

## Task 1: Add `removeAllCourses()` to CourseDownloadService

**Files:**
- Modify: `fe/src/app/core/services/course-download.service.ts`

**Context:** The CourseDownloadService already has `removeCourse(courseId)` which deletes a single course's IndexedDB data. We need a bulk version that also clears videos and sync queue.

**Step 1: Add the `removeAllCourses()` method**

Add after `removeCourse()` (after line 237) in `fe/src/app/core/services/course-download.service.ts`:

```typescript
  /**
   * Remove ALL downloaded courses, videos, and sync queue for current user.
   * Used by Storage Management UI "Delete All" action.
   */
  async removeAllCourses(videoService: OfflineVideoService): Promise<void> {
    const userId = getCurrentUserId();

    // 1. Delete all offline videos from Cache API
    const videos = videoService.downloads();
    for (const video of videos) {
      await videoService.deleteVideo(video.lessonId);
    }

    // 2. Delete all IndexedDB data for this user
    await offlineDb.lessons.where('userId').equals(userId).delete();
    await offlineDb.chapters.where('userId').equals(userId).delete();
    await offlineDb.progress.where('userId').equals(userId).delete();
    await offlineDb.courses.where('userId').equals(userId).delete();
    await offlineDb.downloadCheckpoints.where('userId').equals(userId).delete();
    await offlineDb.syncQueue.where('userId').equals(userId).delete();

    await this.refreshDownloadedCourses();
    await this.storage.refresh();
    this.toast.success('Đã xóa tất cả dữ liệu ngoại tuyến');
  }
```

**Step 2: Add the OfflineVideoService import**

At the top of the file, add to the existing imports:

```typescript
import { OfflineVideoService } from './offline-video.service';
```

Note: `OfflineVideoService` is passed as a parameter (not injected) to avoid circular dependency — both services are `providedIn: 'root'` and injecting one into the other could create a cycle. The caller (StorageManagement component) passes it.

**Step 3: Verify build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: `Application bundle generation complete.` with 0 errors

**Step 4: Commit**

```bash
git add fe/src/app/core/services/course-download.service.ts
git commit -m "feat(pwa): add removeAllCourses() for bulk offline data cleanup"
```

---

## Task 2: Add sidebar nav item + route

**Files:**
- Modify: `fe/src/app/shared/components/navigation/sidebar.config.ts` (lines 45-63)
- Modify: `fe/src/app/features/student/student.routes.ts` (lines 46-51)

**Context:** The student sidebar has 3 groups: "Hoc tap", "Cong cu", "Tai khoan". We add "Luu tru ngoai tuyen" to the "Tai khoan" group. The icon `download` exists in the `IconName` type union.

**Step 1: Add sidebar menu item**

In `fe/src/app/shared/components/navigation/sidebar.config.ts`, add a new menu item BEFORE the "Lich su thanh toan" entry (before line 58). Insert between "Bang diem" and "Lich su thanh toan":

```typescript
    {
      label: 'Lưu trữ ngoại tuyến',
      route: '/student/storage',
      icon: 'download',
      group: 'Tài khoản'
    },
```

The resulting "Tai khoan" group should be: Phan tich, Bang diem, **Luu tru ngoai tuyen**, Lich su thanh toan.

**Step 2: Add route**

In `fe/src/app/features/student/student.routes.ts`, add the storage route AFTER the payments route (after line 51):

```typescript
      // Offline Storage Management - Lưu trữ ngoại tuyến
      {
        path: 'storage',
        loadComponent: () => import('./storage/student-storage-management.component').then(m => m.StudentStorageManagementComponent),
        title: 'Lưu trữ ngoại tuyến'
      },
```

**Step 3: Create placeholder component** (so the build doesn't fail)

Create `fe/src/app/features/student/storage/student-storage-management.component.ts` with a minimal placeholder:

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-student-storage-management',
  template: `<div class="p-6"><h1 class="text-2xl font-bold text-gray-900">Lưu trữ ngoại tuyến</h1></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentStorageManagementComponent {}
```

**Step 4: Verify build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: `Application bundle generation complete.` with 0 errors

**Step 5: Commit**

```bash
git add fe/src/app/shared/components/navigation/sidebar.config.ts fe/src/app/features/student/student.routes.ts fe/src/app/features/student/storage/student-storage-management.component.ts
git commit -m "feat(pwa): add storage management route and sidebar nav item"
```

---

## Task 3: Build StudentStorageManagementComponent

**Files:**
- Modify: `fe/src/app/features/student/storage/student-storage-management.component.ts` (replace placeholder)

**Context:** This is the main storage management page. It reads from 4 services via signals:
- `StorageManagerService.estimate()` → storage bar
- `CourseDownloadService.downloadedCourses()` → course cards
- `OfflineVideoService.downloads()` → video cards
- `OfflineSyncService.pendingCount()` + `failedCount()` → sync section

All delete actions go through `ConfirmDialogService` before execution.

**Step 1: Replace placeholder with full component**

Replace the entire content of `fe/src/app/features/student/storage/student-storage-management.component.ts` with:

```typescript
import { Component, ChangeDetectionStrategy, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageManagerService } from '../../../core/services/storage-manager.service';
import { CourseDownloadService } from '../../../core/services/course-download.service';
import { OfflineVideoService } from '../../../core/services/offline-video.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-student-storage-management',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <!-- Page Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Lưu trữ ngoại tuyến</h1>
        <p class="mt-1 text-sm text-gray-500">Quản lý dữ liệu đã tải xuống cho truy cập ngoại tuyến</p>
      </div>

      <!-- Storage Bar -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-700">Dung lượng bộ nhớ</span>
          <span class="text-sm text-gray-500">
            {{ storageService.formatBytes(estimate().usedBytes) }} / {{ storageService.formatBytes(estimate().quotaBytes) }}
          </span>
        </div>

        <!-- Segmented Bar -->
        <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
          @if (coursePercent() > 0) {
            <div class="h-full bg-[#0056D2] transition-all duration-500"
                 [style.width.%]="coursePercent()"></div>
          }
          @if (videoPercent() > 0) {
            <div class="h-full bg-emerald-500 transition-all duration-500"
                 [style.width.%]="videoPercent()"></div>
          }
          @if (syncPercent() > 0) {
            <div class="h-full bg-amber-500 transition-all duration-500"
                 [style.width.%]="syncPercent()"></div>
          }
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#0056D2]"></span>
            Khóa học ({{ storageService.formatBytes(totalCourseBytes()) }})
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Video ({{ storageService.formatBytes(totalVideoBytes()) }})
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Đồng bộ ({{ syncService.pendingCount() + syncService.failedCount() }} mục)
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-gray-200"></span>
            Trống
          </div>
        </div>
      </div>

      <!-- Warning Banners -->
      @if (estimate().percentUsed >= 95) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <div>
            <p class="text-sm font-medium text-red-800">Bộ nhớ rất thấp!</p>
            <p class="text-sm text-red-600">Xóa bớt dữ liệu ngoại tuyến để tránh lỗi khi tải thêm.</p>
          </div>
        </div>
      } @else if (estimate().percentUsed >= 80) {
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <div>
            <p class="text-sm font-medium text-amber-800">Bộ nhớ gần đầy</p>
            <p class="text-sm text-amber-600">Dung lượng sử dụng đã vượt 80%. Cân nhắc xóa bớt dữ liệu cũ.</p>
          </div>
        </div>
      }

      <!-- Downloaded Courses Section -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">
          Khóa học đã tải ({{ downloadService.downloadedCount() }})
        </h2>
        @if (downloadService.downloadedCourses().length === 0) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <p class="text-sm text-gray-500">Chưa có khóa học nào được tải xuống</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (course of downloadService.downloadedCourses(); track course.id) {
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-medium text-gray-900 truncate">{{ course.title }}</h3>
                  <p class="text-xs text-gray-500 mt-0.5">
                    {{ course.totalLessons }} bài học ·
                    {{ storageService.formatBytes(course.sizeBytes) }} ·
                    Tải {{ course.downloadedAt | date:'dd/MM/yyyy' }}
                  </p>
                </div>
                <button (click)="deleteCourse(course.id, course.title)"
                  class="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white bg-red-50 hover:bg-red-500 rounded-lg transition-colors duration-200 flex-shrink-0">
                  Xóa
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Downloaded Videos Section -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">
          Video đã tải ({{ videoService.downloads().length }})
        </h2>
        @if (videoService.downloads().length === 0) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            <svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            <p class="text-sm text-gray-500">Chưa có video nào được tải xuống</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (video of videoService.downloads(); track video.lessonId) {
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
                <div class="min-w-0 flex-1">
                  <h3 class="text-sm font-medium text-gray-900 truncate">{{ video.title }}</h3>
                  <p class="text-xs text-gray-500 mt-0.5">
                    {{ storageService.formatBytes(video.sizeBytes) }} ·
                    Tải {{ video.downloadedAt | date:'dd/MM/yyyy' }}
                  </p>
                </div>
                <button (click)="deleteVideo(video.lessonId, video.title)"
                  class="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white bg-red-50 hover:bg-red-500 rounded-lg transition-colors duration-200 flex-shrink-0">
                  Xóa
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Sync Queue Section -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Hàng đợi đồng bộ</h2>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-600">
              <span class="font-medium">{{ syncService.pendingCount() }}</span> mục chờ đồng bộ ·
              <span class="font-medium" [class.text-red-600]="syncService.failedCount() > 0">{{ syncService.failedCount() }}</span> mục lỗi
            </div>
            @if (syncService.hasFailedItems()) {
              <button (click)="retrySync()"
                class="px-3 py-1.5 text-xs font-medium text-[#0056D2] hover:text-white bg-[#0056D2]/5 hover:bg-[#0056D2] rounded-lg transition-colors duration-200">
                Thử lại
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Delete All Button -->
      @if (hasAnyData()) {
        <div class="pt-4 border-t border-gray-200">
          <button (click)="deleteAll()"
            class="w-full px-4 py-3 text-sm font-medium text-red-600 hover:text-white bg-red-50 hover:bg-red-500 rounded-xl border border-red-200 hover:border-red-500 transition-all duration-200">
            Xóa tất cả dữ liệu ngoại tuyến
          </button>
        </div>
      }
    </div>
  `
})
export class StudentStorageManagementComponent implements OnInit {
  protected readonly storageService = inject(StorageManagerService);
  protected readonly downloadService = inject(CourseDownloadService);
  protected readonly videoService = inject(OfflineVideoService);
  protected readonly syncService = inject(OfflineSyncService);
  private readonly dialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly estimate = this.storageService.estimate;

  // Computed: total bytes per category
  protected readonly totalCourseBytes = computed(() =>
    this.downloadService.downloadedCourses().reduce((sum, c) => sum + c.sizeBytes, 0)
  );
  protected readonly totalVideoBytes = computed(() =>
    this.videoService.downloads().reduce((sum, v) => sum + v.sizeBytes, 0)
  );

  // Computed: bar segment percentages (relative to quota)
  protected readonly coursePercent = computed(() => {
    const quota = this.estimate().quotaBytes;
    return quota > 0 ? (this.totalCourseBytes() / quota) * 100 : 0;
  });
  protected readonly videoPercent = computed(() => {
    const quota = this.estimate().quotaBytes;
    return quota > 0 ? (this.totalVideoBytes() / quota) * 100 : 0;
  });
  protected readonly syncPercent = computed(() => {
    // Sync queue is tiny — show a minimum 0.5% sliver if items exist
    const hasItems = this.syncService.pendingCount() + this.syncService.failedCount() > 0;
    return hasItems ? 0.5 : 0;
  });

  protected readonly hasAnyData = computed(() =>
    this.downloadService.downloadedCount() > 0 ||
    this.videoService.downloads().length > 0 ||
    this.syncService.pendingCount() > 0 ||
    this.syncService.failedCount() > 0
  );

  ngOnInit(): void {
    this.storageService.refresh();
    this.videoService.refreshList();
  }

  async deleteCourse(courseId: string, title: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'Xóa khóa học ngoại tuyến?',
      message: `Xóa "${title}" sẽ xóa toàn bộ bài học đã tải. Bạn có thể tải lại sau.`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (confirmed) {
      await this.downloadService.removeCourse(courseId);
      await this.storageService.refresh();
    }
  }

  async deleteVideo(lessonId: string, title: string): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'Xóa video ngoại tuyến?',
      message: `Xóa video "${title}"? Bạn có thể tải lại sau.`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });
    if (confirmed) {
      await this.videoService.deleteVideo(lessonId);
      await this.storageService.refresh();
    }
  }

  async retrySync(): Promise<void> {
    await this.syncService.retryFailed();
  }

  async deleteAll(): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'Xóa TẤT CẢ dữ liệu ngoại tuyến?',
      message: 'Xóa toàn bộ khóa học, video, và hàng đợi đồng bộ đã lưu. Hành động này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Xóa tất cả',
      cancelText: 'Hủy'
    });
    if (confirmed) {
      await this.downloadService.removeAllCourses(this.videoService);
      await this.storageService.refresh();
    }
  }
}
```

**Step 2: Verify build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: `Application bundle generation complete.` with 0 errors

**Step 3: Commit**

```bash
git add fe/src/app/features/student/storage/student-storage-management.component.ts
git commit -m "feat(pwa): storage management page with segmented bar and per-item delete"
```

---

## Task 4: Pre-logout sync check

**Files:**
- Modify: `fe/src/app/features/student/shared/student-layout-simple.component.ts`

**Context:** Currently `logout()` at line 444 just calls `this.authService.logout()` directly. We need to inject `OfflineSyncService`, `ConfirmDialogService`, and `NetworkStatusService` and add a sync check before logout.

**Step 1: Add imports**

At the top of `student-layout-simple.component.ts`, add these imports alongside the existing ones:

```typescript
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
```

**Step 2: Inject services**

Add after the existing injections (after line 297, alongside other private/protected injections):

```typescript
  private syncService = inject(OfflineSyncService);
  private network = inject(NetworkStatusService);
  private dialog = inject(ConfirmDialogService);
```

**Step 3: Replace `logout()` method**

Replace the `logout()` method at lines 444-446 with:

```typescript
  async logout(): Promise<void> {
    const pending = this.syncService.pendingCount();
    const failed = this.syncService.failedCount();

    if (pending > 0 || failed > 0) {
      if (this.network.online()) {
        // Online with pending items — try to sync first
        const confirmed = await this.dialog.confirm({
          title: 'Đồng bộ trước khi đăng xuất?',
          message: `Bạn có ${pending} mục chờ đồng bộ và ${failed} mục lỗi. Đồng bộ trước khi đăng xuất?`,
          variant: 'warning',
          confirmText: 'Đồng bộ & Đăng xuất',
          cancelText: 'Đăng xuất ngay'
        });

        if (confirmed) {
          try {
            await this.syncService.syncAll();
          } catch {
            // Sync failed — proceed with logout anyway
          }
        }
      } else {
        // Offline with pending items — warn user
        const confirmed = await this.dialog.confirm({
          title: 'Dữ liệu chưa đồng bộ',
          message: `Bạn có ${pending + failed} mục chưa đồng bộ. Dữ liệu ngoại tuyến sẽ được giữ lại và đồng bộ khi đăng nhập lại.`,
          variant: 'info',
          confirmText: 'Đăng xuất',
          cancelText: 'Hủy'
        });

        if (!confirmed) return;
      }
    }

    this.authService.logout();
  }
```

**Step 4: Verify build**

Run: `cd fe && npx ng build 2>&1 | tail -5`
Expected: `Application bundle generation complete.` with 0 errors

**Step 5: Commit**

```bash
git add fe/src/app/features/student/shared/student-layout-simple.component.ts
git commit -m "feat(pwa): pre-logout sync check with ConfirmDialog warning"
```

---

## Task 5: Documentation updates

**Files:**
- Modify: `fe/FRONTEND_ARCHITECTURE.md`
- Modify: `STREAMING_PWA_ROADMAP.md`

**Step 1: Update FRONTEND_ARCHITECTURE.md**

Find the PWA Known Issues section and mark P1 Storage Management and P1 Logout as fixed:
- P1 "No storage management UI" → "Fixed S113: `/student/storage` page with segmented bar, per-item delete"
- P1 "Full logout doesn't clean offline data" → "Fixed S113: Pre-logout sync check + explicit cleanup via Storage Management"

**Step 2: Update STREAMING_PWA_ROADMAP.md**

Check Phase 7 or Known Issues section and mark these P1 items as completed (S113).

**Step 3: Commit**

```bash
git add fe/FRONTEND_ARCHITECTURE.md STREAMING_PWA_ROADMAP.md
git commit -m "docs: mark P1 storage management and logout sync as complete (S113)"
```

---

## Verification Checklist

After all tasks complete:

1. `cd fe && npx ng build` → 0 errors
2. Navigate to `/student/storage` → Storage page renders with segmented bar
3. Download a course → appears in Storage Management with size
4. Delete course from Storage page → ConfirmDialog → removed
5. Click "Xóa tất cả" → ConfirmDialog (danger) → all data cleared
6. With pending sync items → click logout → ConfirmDialog warns about unsynced data
7. Without pending items → click logout → proceeds normally (no dialog)
8. Offline with pending items → click logout → info dialog about keeping data
