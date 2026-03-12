import Dexie, { type Table } from 'dexie';

export const OFFLINE_DB_NAME = 'lms-maritime-offline';

// ─── Offline Course Data ─────────────────────────────────────────────

export interface OfflineCourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  teacherName?: string;
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED';
  totalLessons: number;
  downloadedAt: Date;
  version: number;
  sizeBytes: number;
  userId: string;
  contentVersion?: number;
  isStale?: boolean;
}

export interface OfflineChapter {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  userId: string;
}

export interface OfflineLesson {
  id: string;
  courseId: string;
  chapterId: string;
  title: string;
  contentHtml: string;
  videoManifestUrl?: string;
  videoOfflineUri?: string;
  streamVideoUid?: string;
  sortOrder: number;
  downloadedAt: Date;
  userId: string;
}

// ─── Offline Progress ────────────────────────────────────────────────

export interface OfflineProgress {
  id?: number;
  lessonId: string;
  courseId: string;
  userId: string;
  progressPercent: number;
  videoPosition: number;
  completedAt?: Date;
  syncStatus: 'pending' | 'synced' | 'conflict';
  updatedAt: Date;
}

// ─── Offline Submissions ─────────────────────────────────────────────

export interface OfflineSubmission {
  id?: number;
  assignmentId: string;
  userId: string;
  content: string;
  submittedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

export interface OfflineQuizAttempt {
  id?: number;
  quizId: string;
  userId: string;
  answers: Record<string, number | string>;
  score?: number;
  passed?: boolean;
  submittedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

// ─── Sync Queue ──────────────────────────────────────────────────────

export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncEntityType = 'progress' | 'submission' | 'quizAttempt' | 'videoProgress';

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
  userId: string;
}

// ─── Offline Quiz Data (downloaded for offline quiz taking) ──────────

export interface OfflineQuestion {
  id: string;
  content: string;
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'ESSAY';
  options: Array<{ optionKey: string; content: string; displayOrder: number }>;
}

export interface OfflineQuizData {
  quizId: string;
  lessonId: string;
  courseId: string;
  userId: string;
  title: string;
  passingScore: number;
  timeLimit?: number;       // minutes; null = no limit
  questions: OfflineQuestion[];
  downloadedAt: Date;
}

// ─── Download Checkpoint ─────────────────────────────────────────────

export interface DownloadCheckpoint {
  courseId: string;
  completedChapterIds: string[];
  totalChapters: number;
  startedAt: Date;
  updatedAt: Date;
  userId: string;
}

/**
 * Get current user ID from localStorage.
 * Used by all services to scope IndexedDB operations per user.
 * Falls back to '__anonymous__' if no user is logged in.
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

// ─── Database Class ──────────────────────────────────────────────────

export class LmsOfflineDatabase extends Dexie {
  courses!: Table<OfflineCourse>;
  chapters!: Table<OfflineChapter>;
  lessons!: Table<OfflineLesson>;
  progress!: Table<OfflineProgress>;
  submissions!: Table<OfflineSubmission>;
  quizAttempts!: Table<OfflineQuizAttempt>;
  syncQueue!: Table<SyncQueueItem>;
  downloadCheckpoints!: Table<DownloadCheckpoint>;
  quizData!: Table<OfflineQuizData>;

  constructor() {
    super(OFFLINE_DB_NAME);

    this.version(1).stores({
      courses: 'id, downloadedAt',
      chapters: 'id, courseId, [courseId+sortOrder]',
      lessons: 'id, courseId, chapterId, [courseId+sortOrder]',
      progress: '++id, lessonId, courseId, userId, syncStatus, updatedAt',
      submissions: '++id, assignmentId, userId, syncStatus, submittedAt',
      quizAttempts: '++id, quizId, userId, syncStatus, submittedAt',
      syncQueue: '++id, entityType, syncStatus, createdAt',
    });

    this.version(2).stores({
      courses: 'id, downloadedAt',
      chapters: 'id, courseId, [courseId+sortOrder]',
      lessons: 'id, courseId, chapterId, [courseId+sortOrder]',
      progress: '++id, lessonId, courseId, userId, syncStatus, updatedAt',
      submissions: '++id, assignmentId, userId, syncStatus, submittedAt',
      quizAttempts: '++id, quizId, userId, syncStatus, submittedAt',
      syncQueue: '++id, entityType, syncStatus, createdAt',
      downloadCheckpoints: 'courseId',
    });

    this.version(3).stores({
      courses: 'id, downloadedAt',
      chapters: 'id, courseId, [courseId+sortOrder]',
      lessons: 'id, courseId, chapterId, [courseId+sortOrder]',
      progress: '++id, lessonId, courseId, userId, syncStatus, updatedAt',
      submissions: '++id, assignmentId, userId, syncStatus, submittedAt',
      quizAttempts: '++id, quizId, userId, syncStatus, submittedAt',
      syncQueue: '++id, entityType, [syncStatus+createdAt], createdAt',
      downloadCheckpoints: 'courseId',
    });

    this.version(4).stores({
      courses: '[userId+id], userId, downloadedAt',
      chapters: '[userId+id], [userId+courseId], [userId+courseId+sortOrder]',
      lessons: '[userId+id], [userId+courseId], [userId+chapterId], [userId+courseId+sortOrder]',
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

    // v5: Add contentVersion + isStale to courses (no index change, just data upgrade)
    this.version(5).stores({
      courses: '[userId+id], userId, downloadedAt',
      chapters: '[userId+id], [userId+courseId], [userId+courseId+sortOrder]',
      lessons: '[userId+id], [userId+courseId], [userId+chapterId], [userId+courseId+sortOrder]',
      progress: '++id, lessonId, courseId, userId, syncStatus, updatedAt',
      submissions: '++id, assignmentId, userId, syncStatus, submittedAt',
      quizAttempts: '++id, quizId, userId, syncStatus, submittedAt',
      syncQueue: '++id, entityType, userId, [syncStatus+createdAt], createdAt',
      downloadCheckpoints: '[userId+courseId]',
    }).upgrade(tx => {
      return tx.table('courses').toCollection().modify(course => {
        if (course.contentVersion == null) course.contentVersion = 1;
        if (course.isStale == null) course.isStale = false;
      });
    });

    // v6: Add quizData table for offline quiz taking
    this.version(6).stores({
      courses: '[userId+id], userId, downloadedAt',
      chapters: '[userId+id], [userId+courseId], [userId+courseId+sortOrder]',
      lessons: '[userId+id], [userId+courseId], [userId+chapterId], [userId+courseId+sortOrder]',
      progress: '++id, lessonId, courseId, userId, syncStatus, updatedAt',
      submissions: '++id, assignmentId, userId, syncStatus, submittedAt',
      quizAttempts: '++id, quizId, userId, syncStatus, submittedAt',
      syncQueue: '++id, entityType, userId, [syncStatus+createdAt], createdAt',
      downloadCheckpoints: '[userId+courseId]',
      quizData: '[userId+quizId], [userId+lessonId], [userId+courseId]',
    });
  }
}

function isRecoverableUpgradeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return err.name === 'UpgradeError' ||
    message.includes('primary key') ||
    message.includes('not yet support for changing primary key');
}

async function openOfflineDbWithRecovery(db: LmsOfflineDatabase): Promise<LmsOfflineDatabase> {
  try {
    await db.open();
    return db;
  } catch (err) {
    if (!isRecoverableUpgradeError(err)) {
      console.error('[LMS-Offline] Database open failed:', err);
      throw err;
    }

    console.warn('[LMS-Offline] UpgradeError detected. Resetting offline cache database.');
    db.close();
    await Dexie.delete(OFFLINE_DB_NAME);

    const recreatedDb = new LmsOfflineDatabase();
    await recreatedDb.open();
    offlineDb = recreatedDb;

    console.info('[LMS-Offline] Offline cache database recreated successfully.');
    return recreatedDb;
  }
}

export let offlineDb = new LmsOfflineDatabase();

/**
 * Shared readiness promise for every IndexedDB consumer.
 * Consumers should await this before touching tables so first-load recovery
 * from legacy primary-key migrations completes deterministically.
 */
export let offlineDbReady: Promise<LmsOfflineDatabase> = openOfflineDbWithRecovery(offlineDb);

export function ensureOfflineDbReady(): Promise<LmsOfflineDatabase> {
  return offlineDbReady;
}
