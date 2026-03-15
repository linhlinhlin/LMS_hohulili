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
  lessonType?: string;
  isFree?: boolean;
  sections?: OfflineLessonSection[];
  videoManifestUrl?: string;
  videoOfflineUri?: string;
  streamVideoUid?: string;
  sortOrder: number;
  downloadedAt: Date;
  userId: string;
}

export interface OfflineLessonSection {
  id: string;
  lessonId: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'FILE' | 'ASSIGNMENT';
  content?: string;
  contentBlocks?: any[];
  videoUrl?: string;
  videoType?: 'YOUTUBE' | 'CLOUDFLARE';
  streamVideoUid?: string;
  videoOfflineUri?: string;
  fileUrl?: string;
  fileOfflineUri?: string;
  fileName?: string;
  sortOrder?: number;
  quizData?: OfflineSectionQuizData;
}

export interface OfflineSectionQuizQuestionSummary {
  id: string;
  content: string;
  contentBlocks?: any[];
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'ESSAY';
  options: Array<{
    optionKey: string;
    content: string;
    contentBlocks?: any[];
    displayOrder: number;
  }>;
}

export interface OfflineSectionQuizData {
  quizType?: string;
  timeLimitMinutes?: number | null;
  passingScore?: number | null;
  maxAttempts?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  showCorrectAnswers?: boolean;
  questions?: OfflineSectionQuizQuestionSummary[];
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
  lessonId?: string;
  sectionId?: string;
  mode?: 'lesson' | 'section';
  userId: string;
  answers: Record<string, number | string | string[]>;
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
  contentBlocks?: any[];
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'ESSAY';
  options: Array<{ optionKey: string; content: string; contentBlocks?: any[]; displayOrder: number }>;
}

export interface OfflineQuizData {
  quizId: string;
  lessonId: string;
  sectionId?: string;
  mode?: 'lesson' | 'section';
  courseId: string;
  userId: string;
  title: string;
  passingScore: number;
  timeLimit?: number;       // minutes; null = no limit
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResultsImmediately?: boolean;
  showCorrectAnswers?: boolean;
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

export function isOfflinePersistenceSupported(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

export class OfflineDbUnavailableError extends Error {
  readonly originalError: unknown;

  constructor(originalError: unknown) {
    super('Offline persistence is unavailable in this browser session.');
    this.name = 'OfflineDbUnavailableError';
    this.originalError = originalError;
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

function isRecoverableBackingStoreError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return err.name === 'UnknownError' ||
    err.name === 'InvalidStateError' ||
    message.includes('backing store') ||
    message.includes('indexeddb.open') ||
    message.includes('internal error opening backing store');
}

function isRecoverableOpenError(err: unknown): boolean {
  return isRecoverableUpgradeError(err) || isRecoverableBackingStoreError(err);
}

export function isOfflineDbUnavailableError(err: unknown): err is OfflineDbUnavailableError {
  return err instanceof OfflineDbUnavailableError;
}

let offlineDbDisabledReason: OfflineDbUnavailableError | null = null;
let offlineDbDisableLogged = false;
let offlineDbRecoveryAttempted = false;

function disableOfflineDb(err: unknown): OfflineDbUnavailableError {
  const unavailableError = isOfflineDbUnavailableError(err)
    ? err
    : new OfflineDbUnavailableError(err);

  offlineDbDisabledReason = unavailableError;
  offlineDbOpenStarted = false;

  if (!offlineDbDisableLogged) {
    offlineDbDisableLogged = true;
    console.warn(
      '[LMS-Offline] Offline cache unavailable for this browser session. Falling back to online-only mode.',
      unavailableError.originalError,
    );
  }

  return unavailableError;
}

async function recreateOfflineDb(db: LmsOfflineDatabase): Promise<LmsOfflineDatabase> {
  db.close();
  await Dexie.delete(OFFLINE_DB_NAME);

  const recreatedDb = new LmsOfflineDatabase();
  await recreatedDb.open();
  offlineDb = recreatedDb;

  console.info('[LMS-Offline] Offline cache database recreated successfully.');
  return recreatedDb;
}

async function openOfflineDbWithRecovery(db: LmsOfflineDatabase): Promise<LmsOfflineDatabase> {
  if (!isOfflinePersistenceSupported()) {
    return db;
  }

  if (offlineDbDisabledReason) {
    throw offlineDbDisabledReason;
  }

  try {
    await db.open();
    return db;
  } catch (err) {
    if (!isRecoverableOpenError(err)) {
      throw disableOfflineDb(err);
    }

    if (!offlineDbRecoveryAttempted) {
      offlineDbRecoveryAttempted = true;
      console.warn('[LMS-Offline] IndexedDB open failed. Resetting offline cache database.', err);

      try {
        return await recreateOfflineDb(db);
      } catch (recoveryError) {
        throw disableOfflineDb(recoveryError);
      }
    }

    throw disableOfflineDb(err);
  }
}

export let offlineDb = new LmsOfflineDatabase();
let offlineDbOpenStarted = false;

/**
 * Shared readiness promise for every IndexedDB consumer.
 * Consumers should await this before touching tables so first-load recovery
 * from legacy primary-key migrations completes deterministically.
 */
export let offlineDbReady: Promise<LmsOfflineDatabase> = Promise.resolve(offlineDb);

export function ensureOfflineDbReady(): Promise<LmsOfflineDatabase> {
  if (!isOfflinePersistenceSupported()) {
    return Promise.resolve(offlineDb);
  }

  if (offlineDbDisabledReason) {
    return Promise.reject(offlineDbDisabledReason);
  }

  if (!offlineDbOpenStarted) {
    offlineDbOpenStarted = true;
    offlineDbReady = openOfflineDbWithRecovery(offlineDb).catch((error) => {
      offlineDbOpenStarted = false;
      throw isOfflineDbUnavailableError(error) ? error : disableOfflineDb(error);
    });
  }

  return offlineDbReady;
}
