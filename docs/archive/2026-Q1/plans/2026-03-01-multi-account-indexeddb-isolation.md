# Multi-Account IndexedDB Data Isolation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Isolate offline IndexedDB data per user so two accounts on the same browser cannot see each other's downloaded courses.

**Architecture:** Add `userId` field to 4 content tables (courses, chapters, lessons, downloadCheckpoints) + syncQueue. Bump Dexie schema version with migration that clears old data. Filter all reads/writes by current userId via a shared `getCurrentUserId()` helper. Progress/submissions/quizAttempts already have userId — no changes needed.

**Tech Stack:** Angular 20.3, Dexie.js 4, TypeScript, IndexedDB

---

## Task 1: Dexie Schema Migration + `getCurrentUserId()` Helper

**Files:**
- Modify: `fe/src/app/core/db/lms-offline.db.ts`

**Step 1: Add `userId` to interfaces**

Add `userId: string` to these 4 interfaces (before the closing brace of each):

```typescript
// OfflineCourse — add after sizeBytes
export interface OfflineCourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  totalLessons: number;
  downloadedAt: Date;
  version: number;
  sizeBytes: number;
  userId: string;  // NEW
}

// OfflineChapter — add after sortOrder
export interface OfflineChapter {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  userId: string;  // NEW
}

// OfflineLesson — add after downloadedAt
export interface OfflineLesson {
  id: string;
  courseId: string;
  chapterId: string;
  title: string;
  contentHtml: string;
  videoManifestUrl?: string;
  videoOfflineUri?: string;
  sortOrder: number;
  downloadedAt: Date;
  userId: string;  // NEW
}

// DownloadCheckpoint — add after updatedAt
export interface DownloadCheckpoint {
  courseId: string;
  completedChapterIds: string[];
  totalChapters: number;
  startedAt: Date;
  updatedAt: Date;
  userId: string;  // NEW
}

// SyncQueueItem — add after nextRetryAt
export interface SyncQueueItem {
  id?: number;
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  endpoint: string;
  payload: unknown;
  createdAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
  nextRetryAt?: Date;
  userId: string;  // NEW
}
```

**Step 2: Add `getCurrentUserId()` helper function**

Add this exported function BEFORE the `LmsOfflineDatabase` class:

```typescript
/**
 * Get current user ID from localStorage.
 * Used by all services to scope IndexedDB operations per user.
 * Falls back to '__anonymous__' if no user is logged in (should not happen in practice).
 */
export function getCurrentUserId(): string {
  if (typeof localStorage === 'undefined') return '__anonymous__';
  const userStr = localStorage.getItem('lms_user');
  if (!userStr) return '__anonymous__';
  try {
    const user = JSON.parse(userStr);
    return user?.id || '__anonymous__';
  } catch {
    return '__anonymous__';
  }
}
```

Note: The key `'lms_user'` matches `AuthService.userKey`. Verify by checking `auth.service.ts` line ~19 for the exact key name. If it's different (e.g., `'user'`), use that instead.

**Step 3: Add Dexie version 4 with new indexes + migration**

Add this AFTER the existing `this.version(3)` block, inside the constructor:

```typescript
this.version(4).stores({
  courses: 'id, [userId+id], userId, downloadedAt',
  chapters: 'id, [userId+courseId], [userId+courseId+sortOrder]',
  lessons: 'id, [userId+courseId], [userId+chapterId], [userId+courseId+sortOrder]',
  progress: '++id, lessonId, courseId, userId, syncStatus, updatedAt',
  submissions: '++id, assignmentId, userId, syncStatus, submittedAt',
  quizAttempts: '++id, quizId, userId, syncStatus, submittedAt',
  syncQueue: '++id, entityType, userId, [syncStatus+createdAt], createdAt',
  downloadCheckpoints: '[userId+courseId]',
}).upgrade(tx => {
  // Clear old data without userId — users must re-download
  tx.table('courses').clear();
  tx.table('chapters').clear();
  tx.table('lessons').clear();
  tx.table('downloadCheckpoints').clear();
  tx.table('syncQueue').clear();
  console.log('[LMS-Offline] v4 migration: cleared old data for multi-account isolation');
});
```

**Step 4: Verify build**

Run: `cd fe && npx ng build 2>&1 | head -20`
Expected: Build succeeds (0 errors). No runtime test needed yet — schema change is backward compatible.

**Step 5: Commit**

```bash
git add fe/src/app/core/db/lms-offline.db.ts
git commit -m "feat(pwa): add userId to IndexedDB schema for multi-account isolation

Dexie v4 migration adds userId to courses/chapters/lessons/downloadCheckpoints/syncQueue.
Old data cleared on upgrade — users must re-download courses.
getCurrentUserId() helper reads from localStorage for consistent user scoping."
```

---

## Task 2: CourseDownloadService — Scope All Operations by userId

**Files:**
- Modify: `fe/src/app/core/services/course-download.service.ts`

**Step 1: Add import for `getCurrentUserId`**

Update line 4 import to include `getCurrentUserId`:

```typescript
import { offlineDb, getCurrentUserId, type OfflineCourse, type OfflineChapter, type OfflineLesson, type DownloadCheckpoint } from '../db/lms-offline.db';
```

**Step 2: Update `downloadCourse()` — write operations**

In `downloadCourse()`, add `userId` to every `.put()` call:

a) Line ~91 — checkpoint read: change `offlineDb.downloadCheckpoints.get(courseId)` to:
```typescript
const userId = getCurrentUserId();
const checkpoint = await offlineDb.downloadCheckpoints.get([userId, courseId]);
```

b) Lines ~108-114 — chapter write: add `userId` to the chapter record:
```typescript
const chapterRecord: OfflineChapter = {
  id: chapter.id,
  courseId,
  title: chapter.title || chapter.name,
  sortOrder: chapter.sortOrder ?? chapter.orderIndex ?? chapter.order ?? 0,
  userId,
};
```

c) Lines ~126-136 — lesson write: add `userId` to the lesson record:
```typescript
const lesson: OfflineLesson = {
  id: l.id,
  courseId,
  chapterId: l.chapterId,
  title: l.title || l.name,
  contentHtml,
  videoManifestUrl: l.sections?.[0]?.videoUrl || l.videoUrl,
  sortOrder: l.sortOrder ?? l.orderIndex ?? l.order ?? 0,
  downloadedAt: new Date(),
  userId,
};
```

d) Lines ~142-148 — checkpoint write: add `userId` to the checkpoint:
```typescript
await offlineDb.downloadCheckpoints.put({
  courseId,
  completedChapterIds: [...completedChapterIds],
  totalChapters: chaptersData.length,
  startedAt: checkpoint?.startedAt || new Date(),
  updatedAt: new Date(),
  userId,
});
```

e) Line ~159 — lesson count query: scope by userId:
```typescript
const dbLessons = await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).toArray();
```

f) Lines ~166-176 — course metadata write: add `userId`:
```typescript
const course: OfflineCourse = {
  id: courseId,
  title: courseData.title || courseData.name,
  description: courseData.description || '',
  thumbnailUrl: courseData.thumbnailUrl,
  totalLessons: dbLessons.length,
  downloadedAt: new Date(),
  version: 1,
  sizeBytes: totalSize,
  userId,
};
```

g) Line ~179 — checkpoint delete: use compound key:
```typescript
await offlineDb.downloadCheckpoints.delete([userId, courseId]);
```

**Step 3: Update `removeCourse()` — delete operations**

Add `const userId = getCurrentUserId();` at the start of `removeCourse()`.

Replace lines ~200-213 (the delete block):
```typescript
// Sync any pending progress before deleting (prevent data loss)
const pendingProgress = await offlineDb.progress
  .where('courseId').equals(courseId)
  .filter(p => p.userId === userId && p.syncStatus === 'pending')
  .count();
if (pendingProgress > 0) {
  this.toast.warning(`${pendingProgress} mục tiến trình chưa đồng bộ. Đang đồng bộ trước khi xóa...`);
}

await offlineDb.lessons.where('[userId+courseId]').equals([userId, courseId]).delete();
await offlineDb.chapters.where('[userId+courseId]').equals([userId, courseId]).delete();
await offlineDb.progress.where('courseId').equals(courseId).filter(p => p.userId === userId).delete();
await offlineDb.courses.delete(courseId);
await offlineDb.downloadCheckpoints.delete([userId, courseId]);
```

For syncQueue cleanup (lines ~216-226), add userId filter:
```typescript
const allQueueItems = await offlineDb.syncQueue
  .where('userId').equals(userId)
  .toArray();
const relatedIds = allQueueItems
  .filter(item =>
    item.endpoint.includes(courseId) ||
    (item.payload as any)?.courseId === courseId
  )
  .map(item => item.id!)
  .filter(id => id != null);
if (relatedIds.length > 0) {
  await offlineDb.syncQueue.bulkDelete(relatedIds);
}
```

**Step 4: Update read methods**

a) `isDownloaded()` — line ~246:
```typescript
async isDownloaded(courseId: string): Promise<boolean> {
  const userId = getCurrentUserId();
  const course = await offlineDb.courses.get(courseId);
  return course !== undefined && course.userId === userId;
}
```

b) `getOfflineCourse()` — line ~253:
```typescript
async getOfflineCourse(courseId: string): Promise<OfflineCourse | undefined> {
  const course = await offlineDb.courses.get(courseId);
  if (course && course.userId === getCurrentUserId()) return course;
  return undefined;
}
```

c) `getOfflineChapters()` — line ~260:
```typescript
async getOfflineChapters(courseId: string): Promise<OfflineChapter[]> {
  const userId = getCurrentUserId();
  return offlineDb.chapters
    .where('[userId+courseId]')
    .equals([userId, courseId])
    .sortBy('sortOrder');
}
```

d) `getOfflineLesson()` — line ~270:
```typescript
async getOfflineLesson(lessonId: string): Promise<OfflineLesson | undefined> {
  const lesson = await offlineDb.lessons.get(lessonId);
  if (lesson && lesson.userId === getCurrentUserId()) return lesson;
  return undefined;
}
```

e) `getOfflineLessons()` — line ~277:
```typescript
async getOfflineLessons(courseId: string): Promise<OfflineLesson[]> {
  const userId = getCurrentUserId();
  return offlineDb.lessons
    .where('[userId+courseId]')
    .equals([userId, courseId])
    .sortBy('sortOrder');
}
```

f) `refreshDownloadedCourses()` — line ~284:
```typescript
private async refreshDownloadedCourses(): Promise<void> {
  const userId = getCurrentUserId();
  const courses = await offlineDb.courses.where('userId').equals(userId).toArray();
  this.downloadedCourses.set(
    courses.map(c => ({
      id: c.id,
      title: c.title,
      totalLessons: c.totalLessons,
      isDownloaded: true,
      downloadedAt: c.downloadedAt,
      sizeBytes: c.sizeBytes,
    }))
  );
}
```

**Step 5: Verify build**

Run: `cd fe && npx ng build 2>&1 | head -20`
Expected: 0 errors

**Step 6: Commit**

```bash
git add fe/src/app/core/services/course-download.service.ts
git commit -m "feat(pwa): scope CourseDownloadService operations by userId

All IndexedDB reads/writes now filter by getCurrentUserId().
Downloads, deletes, queries, and course listings are per-user."
```

---

## Task 3: OfflineVideoService — Scope Lesson Reads by userId

**Files:**
- Modify: `fe/src/app/core/services/offline-video.service.ts`

**Step 1: Add import**

```typescript
import { offlineDb, getCurrentUserId } from '../db/lms-offline.db';
```

**Step 2: Update `downloadVideo()` — lesson read + update (lines ~80-86)**

Replace:
```typescript
const existingLesson = await offlineDb.lessons.get(lessonId);
if (existingLesson) {
  await offlineDb.lessons.update(lessonId, {
    videoOfflineUri: `cache:${lessonId}`,
    downloadedAt: new Date(),
  });
}
```
With:
```typescript
const existingLesson = await offlineDb.lessons.get(lessonId);
if (existingLesson && existingLesson.userId === getCurrentUserId()) {
  await offlineDb.lessons.update(lessonId, {
    videoOfflineUri: `cache:${lessonId}`,
    downloadedAt: new Date(),
  });
}
```

**Step 3: Update `deleteVideo()` — lesson read + update (lines ~132-134)**

Replace:
```typescript
const lesson = await offlineDb.lessons.get(lessonId);
if (lesson) {
  await offlineDb.lessons.update(lessonId, { videoOfflineUri: undefined });
}
```
With:
```typescript
const lesson = await offlineDb.lessons.get(lessonId);
if (lesson && lesson.userId === getCurrentUserId()) {
  await offlineDb.lessons.update(lessonId, { videoOfflineUri: undefined });
}
```

**Step 4: Update `refreshList()` — lesson reads (line ~166)**

Replace:
```typescript
const lesson = await offlineDb.lessons.get(lessonId);
```
With:
```typescript
const lesson = await offlineDb.lessons.get(lessonId);
// Skip entries belonging to other users
if (lesson && lesson.userId !== getCurrentUserId()) continue;
```

Note: Add the `continue` check right after the `const lesson` line, before the `entries.push(...)`.

**Step 5: Verify build**

Run: `cd fe && npx ng build 2>&1 | head -20`
Expected: 0 errors

**Step 6: Commit**

```bash
git add fe/src/app/core/services/offline-video.service.ts
git commit -m "feat(pwa): scope OfflineVideoService lesson access by userId

Video download/delete/list only touch lessons owned by current user."
```

---

## Task 4: OfflineSyncService — Scope Queue Operations by userId

**Files:**
- Modify: `fe/src/app/core/services/offline-sync.service.ts`

**Step 1: Add import**

```typescript
import { offlineDb, getCurrentUserId, type SyncQueueItem, type SyncEntityType, type SyncOperationType } from '../db/lms-offline.db';
```

**Step 2: Update `queueOperation()` — write + dedup (lines ~64-83)**

Replace the dedup check + add:
```typescript
async queueOperation(
  entityType: SyncEntityType,
  operationType: SyncOperationType,
  endpoint: string,
  payload: unknown,
): Promise<void> {
  const userId = getCurrentUserId();

  // Deduplicate: check for existing pending item with same entityType + endpoint + userId
  const existing = await offlineDb.syncQueue
    .where('userId').equals(userId)
    .filter(item => item.syncStatus === 'pending' && item.entityType === entityType && item.endpoint === endpoint)
    .first();

  if (existing?.id != null) {
    await offlineDb.syncQueue.update(existing.id, {
      payload,
    });
  } else {
    await offlineDb.syncQueue.add({
      entityType,
      operationType,
      endpoint,
      payload,
      createdAt: new Date(),
      syncStatus: 'pending',
      retryCount: 0,
      userId,
    });
  }

  await this.refreshCounts();
  this.registerBackgroundSync();
}
```

**Step 3: Update `syncAll()` — read pending items (lines ~108-111)**

Replace pending items query:
```typescript
const pendingItems = await offlineDb.syncQueue
  .where('userId').equals(getCurrentUserId())
  .filter(item => item.syncStatus === 'pending')
  .sortBy('createdAt');
```

**Step 4: Update cleanup in `syncAll()` (lines ~143-147)**

Replace:
```typescript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
await offlineDb.syncQueue
  .where('syncStatus')
  .equals('synced')
  .filter(item => item.createdAt < oneDayAgo)
  .delete();
```
With:
```typescript
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
const userId = getCurrentUserId();
await offlineDb.syncQueue
  .where('userId').equals(userId)
  .filter(item => item.syncStatus === 'synced' && item.createdAt < oneDayAgo)
  .delete();
```

**Step 5: Update `retryFailed()` (lines ~172-175)**

Replace:
```typescript
const failedItems = await offlineDb.syncQueue
  .where('syncStatus')
  .equals('failed')
  .toArray();
```
With:
```typescript
const failedItems = await offlineDb.syncQueue
  .where('userId').equals(getCurrentUserId())
  .filter(item => item.syncStatus === 'failed')
  .toArray();
```

**Step 6: Update `getFailedCount()` (lines ~201-204)**

Replace:
```typescript
async getFailedCount(): Promise<number> {
  return offlineDb.syncQueue
    .where('syncStatus')
    .equals('failed')
    .count();
}
```
With:
```typescript
async getFailedCount(): Promise<number> {
  return offlineDb.syncQueue
    .where('userId').equals(getCurrentUserId())
    .filter(item => item.syncStatus === 'failed')
    .count();
}
```

**Step 7: Update `clearFailed()` (lines ~210-214)**

Replace:
```typescript
async clearFailed(): Promise<void> {
  await offlineDb.syncQueue
    .where('syncStatus')
    .equals('failed')
    .delete();
  await this.refreshCounts();
}
```
With:
```typescript
async clearFailed(): Promise<void> {
  await offlineDb.syncQueue
    .where('userId').equals(getCurrentUserId())
    .filter(item => item.syncStatus === 'failed')
    .delete();
  await this.refreshCounts();
}
```

**Step 8: Update `getPendingCount()` (lines ~340-344)**

Replace:
```typescript
private async getPendingCount(): Promise<number> {
  return offlineDb.syncQueue
    .where('syncStatus')
    .equals('pending')
    .count();
}
```
With:
```typescript
private async getPendingCount(): Promise<number> {
  return offlineDb.syncQueue
    .where('userId').equals(getCurrentUserId())
    .filter(item => item.syncStatus === 'pending')
    .count();
}
```

**Step 9: Verify build**

Run: `cd fe && npx ng build 2>&1 | head -20`
Expected: 0 errors

**Step 10: Commit**

```bash
git add fe/src/app/core/services/offline-sync.service.ts
git commit -m "feat(pwa): scope OfflineSyncService queue operations by userId

All sync queue reads, writes, retries, and cleanup filter by current user.
Prevents cross-user sync interference."
```

---

## Task 5: Offline Interceptor — Scope Fallback Reads by userId

**Files:**
- Modify: `fe/src/app/api/interceptors/offline.interceptor.ts`

**Step 1: Add import**

```typescript
import { offlineDb, getCurrentUserId } from '../../core/db/lms-offline.db';
```

(Remove the plain `import { offlineDb } from ...` line.)

**Step 2: Update `getOfflineFallback()` — all 6 read paths**

a) Course by ID (line ~106):
```typescript
if (courseMatch) {
  const course = await offlineDb.courses.get(courseMatch[1]);
  if (course && course.userId === getCurrentUserId()) {
    return { success: true, data: course, _offline: true };
  }
}
```

b) Course list (lines ~113-123):
```typescript
if (path === '/api/v3/courses' || path.startsWith('/api/v3/courses?')) {
  const userId = getCurrentUserId();
  const courses = await offlineDb.courses.where('userId').equals(userId).toArray();
  if (courses.length > 0) {
    return {
      success: true,
      data: courses,
      message: 'Dữ liệu ngoại tuyến',
      _offline: true,
    };
  }
}
```

c) Chapters (lines ~128-133):
```typescript
if (chaptersMatch) {
  const userId = getCurrentUserId();
  const chapters = await offlineDb.chapters
    .where('[userId+courseId]').equals([userId, chaptersMatch[1]])
    .sortBy('sortOrder');
  if (chapters.length > 0) {
    return { success: true, data: chapters, _offline: true };
  }
}
```

d) Lessons by chapter (lines ~141-148):
```typescript
if (lessonsMatch) {
  const userId = getCurrentUserId();
  const lessons = await offlineDb.lessons
    .where('[userId+courseId]').equals([userId, lessonsMatch[1]])
    .filter(l => l.chapterId === lessonsMatch[2])
    .sortBy('sortOrder');
  if (lessons.length > 0) {
    return { success: true, data: lessons, _offline: true };
  }
}
```

e) Lesson by ID (lines ~153-157):
```typescript
if (lessonMatch) {
  const lesson = await offlineDb.lessons.get(lessonMatch[1]);
  if (lesson && lesson.userId === getCurrentUserId()) {
    return { success: true, data: lesson, _offline: true };
  }
}
```

f) Enrollments (lines ~162-191):
```typescript
if (path.includes('/enrollments')) {
  const userId = getCurrentUserId();
  const courses = await offlineDb.courses.where('userId').equals(userId).toArray();
  if (courses.length > 0) {
    const enrollments = await Promise.all(courses.map(async (c) => {
      const progressRecords = await offlineDb.progress
        .where('courseId').equals(c.id)
        .filter(p => p.userId === userId)
        .toArray();
      const completedLessons = progressRecords.filter(p => p.completedAt != null).length;
      const totalLessons = c.totalLessons || 1;
      const progress = totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;
      return {
        courseId: c.id,
        courseTitle: c.title,
        courseThumbnail: c.thumbnailUrl,
        status: progress >= 100 ? 'completed' : 'in-progress',
        progress,
        totalLessons: c.totalLessons,
        completedLessons,
        _offline: true,
      };
    }));
    return {
      success: true,
      data: enrollments,
      _offline: true,
    };
  }
}
```

**Step 3: Verify build**

Run: `cd fe && npx ng build 2>&1 | head -20`
Expected: 0 errors

**Step 4: Commit**

```bash
git add fe/src/app/api/interceptors/offline.interceptor.ts
git commit -m "feat(pwa): scope offline interceptor fallback reads by userId

All IndexedDB fallback responses now filter by current user.
Prevents cross-user data leakage in offline mode."
```

---

## Task 6: Verify localStorage Key + Final Build + Deploy

**Step 1: Verify `lms_user` is the correct localStorage key**

Check `auth.service.ts` for the exact key name used to store user data:

Run: `grep -n 'userKey\|lms_user\|lms-user' fe/src/app/core/services/auth.service.ts`

Expected: Should find something like `private readonly userKey = 'lms_user';`
If the key name is different, update `getCurrentUserId()` in `lms-offline.db.ts` to match.

**Step 2: Full build**

Run: `cd fe && npm run build`
Expected: Build succeeds with 0 errors

**Step 3: Final commit with all changes**

If any files were adjusted in Step 1:
```bash
git add -A
git commit -m "fix(pwa): align getCurrentUserId localStorage key with auth.service"
```

**Step 4: Update documentation**

Update `docs/architecture/STREAMING_PWA_ROADMAP.md` Phase 7 tasks 7.7, 7.8, 7.9 to checked:
```markdown
- [x] 7.7 **P0**: Add `userId` to courses/chapters/lessons/checkpoints (Dexie v4 migration)
- [x] 7.8 **P0**: Filter all IndexedDB reads by current userId
- [x] 7.9 **P0**: CourseDownloadService — scope downloads to current user
```

Update `FRONTEND_ARCHITECTURE.md` PWA Known Issues table — mark P0 as **Fixed**.

Commit docs:
```bash
git add docs/architecture/STREAMING_PWA_ROADMAP.md fe/FRONTEND_ARCHITECTURE.md
git commit -m "docs: mark P0 multi-account isolation as complete"
```

**Step 5: Deploy to production**

```bash
git push origin main
# SSH to GCP and deploy
```
