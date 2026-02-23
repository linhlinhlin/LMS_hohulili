import Dexie, { type Table } from 'dexie';

// ─── Offline Course Data ─────────────────────────────────────────────

export interface OfflineCourse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  totalLessons: number;
  downloadedAt: Date;
  version: number;
  sizeBytes: number;
}

export interface OfflineChapter {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
}

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
}

// ─── Download Checkpoint ─────────────────────────────────────────────

export interface DownloadCheckpoint {
  courseId: string;
  completedChapterIds: string[];
  totalChapters: number;
  startedAt: Date;
  updatedAt: Date;
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

  constructor() {
    super('lms-maritime-offline');

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
  }
}

export const offlineDb = new LmsOfflineDatabase();
