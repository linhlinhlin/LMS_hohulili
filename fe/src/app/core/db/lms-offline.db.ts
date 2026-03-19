import Dexie, { type Table } from 'dexie';
import type {
  OfflineVideoProfileId,
  VideoQuality,
  VideoSourceKind,
} from '../models/video-quality';

export const OFFLINE_DB_NAME = 'lms-maritime-offline';
const OFFLINE_DB_ACTIVE_NAME_KEY = 'lms_offline_active_db_name';
const OFFLINE_DB_KNOWN_NAMES_KEY = 'lms_offline_known_db_names';
const OFFLINE_STORAGE_HEALTH_KEY = 'lms_offline_storage_health';
const OFFLINE_STORAGE_TELEMETRY_KEY = 'lms_offline_storage_telemetry';
const OFFLINE_STORAGE_TELEMETRY_LIMIT = 20;
const OFFLINE_CACHE_NAMES = ['offline-videos', 'offline-files'] as const;

export type OfflineStorageAvailability = 'ready' | 'recovering' | 'online-only';
export type OfflineStorageRecoveryAction = 'none' | 'recreated-db' | 'rotated-db' | 'manual-reset';

export interface OfflineStorageHealthSnapshot {
  availability: OfflineStorageAvailability;
  dbName: string;
  lastRecoveryAction: OfflineStorageRecoveryAction;
  requiresRedownload: boolean;
  lastErrorName: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
}

export type OfflineStorageTelemetryEventType =
  | 'recovery-started'
  | 'recreate-failed'
  | 'recovered'
  | 'disabled'
  | 'manual-reset'
  | 'telemetry-cleared';

export interface OfflineStorageTelemetryEvent {
  id: string;
  type: OfflineStorageTelemetryEventType;
  availability: OfflineStorageAvailability;
  dbName: string;
  recoveryAction: OfflineStorageRecoveryAction;
  requiresRedownload: boolean;
  errorName: string | null;
  errorMessage: string | null;
  online: boolean | null;
  userAgent: string | null;
  platform: string | null;
  connectionType: string | null;
  timestamp: string;
}

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
  publicationId?: string | null;
  publicationNumber?: number | null;
  versionModeSnapshot?: 'PINNED' | 'FOLLOW_LATEST' | 'LEGACY';
  isStale?: boolean;
  staleReason?: 'UPDATE_AVAILABLE' | 'CLASS_ADOPTED_NEW_PUBLICATION' | 'LEGACY_PACKAGE' | 'UNKNOWN' | null;
  downloadOptions?: OfflineDownloadOptions | null;
}

export interface OfflineDownloadOptions {
  videoQuality?: VideoQuality;
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
  quizType?: string;
  countsTowardCertificate?: boolean;
  quizAllowOffline?: boolean;
  sections?: OfflineLessonSection[];
  videoManifestUrl?: string;
  videoOfflineUri?: string;
  streamVideoUid?: string;
  videoSourceKind?: VideoSourceKind;
  downloadedVideoProfileId?: OfflineVideoProfileId | null;
  downloadedVideoProfileLabel?: string | null;
  downloadedVideoResolution?: string | null;
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
  videoSourceKind?: VideoSourceKind;
  downloadedVideoProfileId?: OfflineVideoProfileId | null;
  downloadedVideoProfileLabel?: string | null;
  downloadedVideoResolution?: string | null;
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
  countsTowardCertificate?: boolean;
  allowOffline?: boolean;
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
  clientOperationId?: string;
  occurredAt?: Date;
  courseId?: string;
  publicationId?: string | null;
  entityId?: string | null;
  baseServerUpdatedAt?: string | null;
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
  quizType?: string;
  countsTowardCertificate?: boolean;
  allowOffline?: boolean;
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

  constructor(dbName = getActiveOfflineDbName()) {
    super(dbName);

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

    this.version(7).stores({
      courses: '[userId+id], userId, downloadedAt, [userId+publicationId]',
      chapters: '[userId+id], [userId+courseId], [userId+courseId+sortOrder]',
      lessons: '[userId+id], [userId+courseId], [userId+chapterId], [userId+courseId+sortOrder]',
      progress: '++id, lessonId, courseId, userId, syncStatus, updatedAt',
      submissions: '++id, assignmentId, userId, syncStatus, submittedAt',
      quizAttempts: '++id, quizId, userId, syncStatus, submittedAt',
      syncQueue: '++id, entityType, userId, [syncStatus+createdAt], [userId+courseId], clientOperationId, createdAt',
      downloadCheckpoints: '[userId+courseId]',
      quizData: '[userId+quizId], [userId+lessonId], [userId+courseId]',
    }).upgrade(tx => {
      return tx.table('courses').toCollection().modify(course => {
        if (course.publicationId === undefined) course.publicationId = null;
        if (course.publicationNumber === undefined) course.publicationNumber = null;
        if (course.versionModeSnapshot == null) course.versionModeSnapshot = 'LEGACY';
        if (course.staleReason === undefined) course.staleReason = null;
      }).then(() =>
        tx.table('syncQueue').toCollection().modify(item => {
          if (item.clientOperationId == null) item.clientOperationId = null;
          if (item.occurredAt == null) item.occurredAt = item.createdAt ?? new Date();
          if (item.courseId === undefined) item.courseId = undefined;
          if (item.publicationId === undefined) item.publicationId = null;
          if (item.entityId === undefined) item.entityId = undefined;
          if (item.baseServerUpdatedAt === undefined) item.baseServerUpdatedAt = null;
        })
      );
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

type OfflineStorageHealthListener = (snapshot: OfflineStorageHealthSnapshot) => void;
type OfflineStorageTelemetryListener = (events: OfflineStorageTelemetryEvent[]) => void;

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function normalizeOfflineDbName(name: unknown): string {
  return typeof name === 'string' && name.startsWith(OFFLINE_DB_NAME)
    ? name
    : OFFLINE_DB_NAME;
}

function rememberOfflineDbName(name: string): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const normalized = normalizeOfflineDbName(name);

  try {
    const raw = localStorage.getItem(OFFLINE_DB_KNOWN_NAMES_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown[] : [];
    const next = Array.from(
      new Set(
        parsed
          .map(item => normalizeOfflineDbName(item))
          .concat(normalized),
      ),
    );
    localStorage.setItem(OFFLINE_DB_KNOWN_NAMES_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(OFFLINE_DB_KNOWN_NAMES_KEY, JSON.stringify([normalized]));
  }
}

function replaceKnownOfflineDbNames(names: string[]): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const normalized = Array.from(new Set(names.map(name => normalizeOfflineDbName(name))));
  localStorage.setItem(OFFLINE_DB_KNOWN_NAMES_KEY, JSON.stringify(normalized));
}

function setActiveOfflineDbName(name: string): void {
  if (!canUseLocalStorage()) {
    return;
  }

  const normalized = normalizeOfflineDbName(name);
  localStorage.setItem(OFFLINE_DB_ACTIVE_NAME_KEY, normalized);
  rememberOfflineDbName(normalized);
}

function getActiveOfflineDbName(): string {
  if (!canUseLocalStorage()) {
    return OFFLINE_DB_NAME;
  }

  const stored = normalizeOfflineDbName(localStorage.getItem(OFFLINE_DB_ACTIVE_NAME_KEY));
  rememberOfflineDbName(stored);
  return stored;
}

function getKnownOfflineDbNames(): string[] {
  if (!canUseLocalStorage()) {
    return [OFFLINE_DB_NAME];
  }

  try {
    const raw = localStorage.getItem(OFFLINE_DB_KNOWN_NAMES_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown[] : [];
    const names = Array.from(
      new Set(parsed.map(item => normalizeOfflineDbName(item)).concat(OFFLINE_DB_NAME, getActiveOfflineDbName())),
    );
    rememberOfflineDbName(getActiveOfflineDbName());
    return names;
  } catch {
    return [OFFLINE_DB_NAME, getActiveOfflineDbName()];
  }
}

function nextRotatedOfflineDbName(): string {
  return `${OFFLINE_DB_NAME}-recovery-${Date.now()}`;
}

function defaultOfflineStorageHealthSnapshot(dbName = getActiveOfflineDbName()): OfflineStorageHealthSnapshot {
  return {
    availability: 'ready',
    dbName,
    lastRecoveryAction: 'none',
    requiresRedownload: false,
    lastErrorName: null,
    lastErrorMessage: null,
    updatedAt: new Date().toISOString(),
  };
}

function readOfflineStorageHealthSnapshot(): OfflineStorageHealthSnapshot {
  if (!canUseLocalStorage()) {
    return defaultOfflineStorageHealthSnapshot();
  }

  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_HEALTH_KEY);
    if (!raw) {
      return defaultOfflineStorageHealthSnapshot();
    }

    const parsed = JSON.parse(raw) as Partial<OfflineStorageHealthSnapshot>;
    return {
      availability: parsed.availability === 'recovering' || parsed.availability === 'online-only'
        ? parsed.availability
        : 'ready',
      dbName: normalizeOfflineDbName(parsed.dbName),
      lastRecoveryAction: parsed.lastRecoveryAction === 'recreated-db'
        || parsed.lastRecoveryAction === 'rotated-db'
        || parsed.lastRecoveryAction === 'manual-reset'
        ? parsed.lastRecoveryAction
        : 'none',
      requiresRedownload: parsed.requiresRedownload === true,
      lastErrorName: typeof parsed.lastErrorName === 'string' ? parsed.lastErrorName : null,
      lastErrorMessage: typeof parsed.lastErrorMessage === 'string' ? parsed.lastErrorMessage : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return defaultOfflineStorageHealthSnapshot();
  }
}

function createOfflineStorageTelemetryEvent(
  type: OfflineStorageTelemetryEventType,
  snapshot: OfflineStorageHealthSnapshot,
): OfflineStorageTelemetryEvent {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const connection = nav && 'connection' in nav
    ? (nav as Navigator & { connection?: { effectiveType?: string } }).connection
    : undefined;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    availability: snapshot.availability,
    dbName: snapshot.dbName,
    recoveryAction: snapshot.lastRecoveryAction,
    requiresRedownload: snapshot.requiresRedownload,
    errorName: snapshot.lastErrorName,
    errorMessage: snapshot.lastErrorMessage,
    online: typeof navigator !== 'undefined' ? navigator.onLine : null,
    userAgent: nav?.userAgent ?? null,
    platform: nav?.platform ?? null,
    connectionType: connection?.effectiveType ?? null,
    timestamp: new Date().toISOString(),
  };
}

function readOfflineStorageTelemetryEvents(): OfflineStorageTelemetryEvent[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_TELEMETRY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Partial<OfflineStorageTelemetryEvent> => !!item && typeof item === 'object')
      .map<OfflineStorageTelemetryEvent>(item => ({
        id: typeof item.id === 'string' ? item.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: item.type === 'recovery-started'
          || item.type === 'recreate-failed'
          || item.type === 'recovered'
          || item.type === 'disabled'
          || item.type === 'manual-reset'
          || item.type === 'telemetry-cleared'
          ? item.type
          : 'recovery-started',
        availability: item.availability === 'recovering' || item.availability === 'online-only'
          ? item.availability
          : 'ready',
        dbName: normalizeOfflineDbName(item.dbName),
        recoveryAction: item.recoveryAction === 'recreated-db'
          || item.recoveryAction === 'rotated-db'
          || item.recoveryAction === 'manual-reset'
          ? item.recoveryAction
          : 'none',
        requiresRedownload: item.requiresRedownload === true,
        errorName: typeof item.errorName === 'string' ? item.errorName : null,
        errorMessage: typeof item.errorMessage === 'string' ? item.errorMessage : null,
        online: typeof item.online === 'boolean' ? item.online : null,
        userAgent: typeof item.userAgent === 'string' ? item.userAgent : null,
        platform: typeof item.platform === 'string' ? item.platform : null,
        connectionType: typeof item.connectionType === 'string' ? item.connectionType : null,
        timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date().toISOString(),
      }))
      .slice(0, OFFLINE_STORAGE_TELEMETRY_LIMIT);
  } catch {
    return [];
  }
}

const offlineStorageHealthListeners = new Set<OfflineStorageHealthListener>();
let offlineStorageHealthSnapshot = readOfflineStorageHealthSnapshot();
const offlineStorageTelemetryListeners = new Set<OfflineStorageTelemetryListener>();
let offlineStorageTelemetryEvents = readOfflineStorageTelemetryEvents();

function persistOfflineStorageHealthSnapshot(): void {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(OFFLINE_STORAGE_HEALTH_KEY, JSON.stringify(offlineStorageHealthSnapshot));
}

function emitOfflineStorageHealthSnapshot(): void {
  persistOfflineStorageHealthSnapshot();
  for (const listener of offlineStorageHealthListeners) {
    listener(offlineStorageHealthSnapshot);
  }
}

function persistOfflineStorageTelemetryEvents(): void {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(OFFLINE_STORAGE_TELEMETRY_KEY, JSON.stringify(offlineStorageTelemetryEvents));
}

function emitOfflineStorageTelemetryEvents(): void {
  persistOfflineStorageTelemetryEvents();
  for (const listener of offlineStorageTelemetryListeners) {
    listener(offlineStorageTelemetryEvents);
  }
}

function appendOfflineStorageTelemetryEvent(
  type: OfflineStorageTelemetryEventType,
  snapshot = offlineStorageHealthSnapshot,
): OfflineStorageTelemetryEvent {
  const event = createOfflineStorageTelemetryEvent(type, snapshot);
  offlineStorageTelemetryEvents = [event, ...offlineStorageTelemetryEvents].slice(0, OFFLINE_STORAGE_TELEMETRY_LIMIT);
  emitOfflineStorageTelemetryEvents();
  return event;
}

function updateOfflineStorageHealthSnapshot(
  patch: Partial<OfflineStorageHealthSnapshot>,
): OfflineStorageHealthSnapshot {
  offlineStorageHealthSnapshot = {
    ...offlineStorageHealthSnapshot,
    ...patch,
    dbName: normalizeOfflineDbName(patch.dbName ?? offlineStorageHealthSnapshot.dbName),
    updatedAt: new Date().toISOString(),
  };
  emitOfflineStorageHealthSnapshot();
  return offlineStorageHealthSnapshot;
}

function getErrorName(err: unknown): string | null {
  return err instanceof Error ? err.name : null;
}

function getErrorMessage(err: unknown): string | null {
  return err instanceof Error ? err.message : null;
}

function markOfflineStorageRecovering(dbName: string, err: unknown): void {
  const snapshot = updateOfflineStorageHealthSnapshot({
    availability: 'recovering',
    dbName,
    lastErrorName: getErrorName(err),
    lastErrorMessage: getErrorMessage(err),
  });
  appendOfflineStorageTelemetryEvent('recovery-started', snapshot);
}

function markOfflineStorageRecovered(
  dbName: string,
  action: OfflineStorageRecoveryAction,
  err: unknown,
): void {
  const snapshot = updateOfflineStorageHealthSnapshot({
    availability: 'ready',
    dbName,
    lastRecoveryAction: action,
    requiresRedownload: true,
    lastErrorName: getErrorName(err),
    lastErrorMessage: getErrorMessage(err),
  });
  appendOfflineStorageTelemetryEvent('recovered', snapshot);
}

function clearOfflineStorageFailureState(): void {
  offlineDbDisabledReason = null;
  offlineDbDisableLogged = false;
  offlineDbOpenStarted = false;
}

async function clearOfflineCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return;
  }

  await Promise.all(OFFLINE_CACHE_NAMES.map(name => caches.delete(name).catch(() => false)));
}

async function deleteOfflineDbByName(dbName: string): Promise<void> {
  try {
    await Dexie.delete(dbName);
  } catch {
    // Ignore delete failures here; recovery will escalate if reopen still fails.
  }
}

async function createAndOpenOfflineDb(dbName: string): Promise<LmsOfflineDatabase> {
  const recreatedDb = new LmsOfflineDatabase(dbName);
  await recreatedDb.open();
  setActiveOfflineDbName(dbName);
  offlineDb = recreatedDb;
  offlineDbReady = Promise.resolve(recreatedDb);
  clearOfflineStorageFailureState();
  return recreatedDb;
}

let offlineDbDisabledReason: OfflineDbUnavailableError | null = null;
let offlineDbDisableLogged = false;

function disableOfflineDb(err: unknown): OfflineDbUnavailableError {
  const unavailableError = isOfflineDbUnavailableError(err)
    ? err
    : new OfflineDbUnavailableError(err);

  offlineDbDisabledReason = unavailableError;
  offlineDbOpenStarted = false;
  const snapshot = updateOfflineStorageHealthSnapshot({
    availability: 'online-only',
    dbName: offlineDb.name,
    lastErrorName: getErrorName(unavailableError.originalError),
    lastErrorMessage: getErrorMessage(unavailableError.originalError),
  });
  appendOfflineStorageTelemetryEvent('disabled', snapshot);

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
  await deleteOfflineDbByName(db.name);
  await clearOfflineCaches();

  const recreatedDb = await createAndOpenOfflineDb(db.name);

  console.info('[LMS-Offline] Offline cache database recreated successfully.');
  return recreatedDb;
}

async function rotateOfflineDb(err: unknown, rotatedDbName = nextRotatedOfflineDbName()): Promise<LmsOfflineDatabase> {
  setActiveOfflineDbName(rotatedDbName);
  await clearOfflineCaches();

  const rotatedDb = await createAndOpenOfflineDb(rotatedDbName);
  markOfflineStorageRecovered(rotatedDbName, 'rotated-db', err);
  console.info('[LMS-Offline] Offline cache database rotated successfully.', rotatedDbName);
  return rotatedDb;
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
    updateOfflineStorageHealthSnapshot({
      availability: 'ready',
      dbName: db.name,
      lastErrorName: null,
      lastErrorMessage: null,
    });
    rememberOfflineDbName(db.name);
    return db;
  } catch (err) {
    if (!isRecoverableOpenError(err)) {
      throw disableOfflineDb(err);
    }

    console.warn('[LMS-Offline] IndexedDB open failed. Resetting offline cache database.', err);
    markOfflineStorageRecovering(db.name, err);

    try {
      const recreatedDb = await recreateOfflineDb(db);
      markOfflineStorageRecovered(recreatedDb.name, 'recreated-db', err);
      return recreatedDb;
    } catch (recoveryError) {
      console.warn('[LMS-Offline] IndexedDB recreate on same name failed. Rotating database name.', recoveryError);
      const rotatedDbName = nextRotatedOfflineDbName();
      const recoverySnapshot = updateOfflineStorageHealthSnapshot({
        availability: 'recovering',
        dbName: rotatedDbName,
        lastErrorName: getErrorName(recoveryError),
        lastErrorMessage: getErrorMessage(recoveryError),
      });
      appendOfflineStorageTelemetryEvent('recreate-failed', recoverySnapshot);

      try {
        return await rotateOfflineDb(recoveryError, rotatedDbName);
      } catch (rotationError) {
        throw disableOfflineDb(rotationError);
      }
    }
  }
}

export function getOfflineStorageHealthSnapshot(): OfflineStorageHealthSnapshot {
  return offlineStorageHealthSnapshot;
}

export function subscribeOfflineStorageHealth(
  listener: OfflineStorageHealthListener,
): () => void {
  offlineStorageHealthListeners.add(listener);
  listener(offlineStorageHealthSnapshot);
  return () => offlineStorageHealthListeners.delete(listener);
}

export function getOfflineStorageTelemetryEvents(): OfflineStorageTelemetryEvent[] {
  return offlineStorageTelemetryEvents;
}

export function subscribeOfflineStorageTelemetry(
  listener: OfflineStorageTelemetryListener,
): () => void {
  offlineStorageTelemetryListeners.add(listener);
  listener(offlineStorageTelemetryEvents);
  return () => offlineStorageTelemetryListeners.delete(listener);
}

export function clearOfflineStorageTelemetryEvents(): void {
  offlineStorageTelemetryEvents = [];
  emitOfflineStorageTelemetryEvents();
}

export async function resetOfflineStorage(): Promise<LmsOfflineDatabase> {
  offlineDb.close();
  await clearOfflineCaches();

  for (const dbName of getKnownOfflineDbNames()) {
    await deleteOfflineDbByName(dbName);
  }

  replaceKnownOfflineDbNames([OFFLINE_DB_NAME]);
  setActiveOfflineDbName(OFFLINE_DB_NAME);
  clearOfflineStorageFailureState();

  try {
    const freshDb = await createAndOpenOfflineDb(OFFLINE_DB_NAME);
    const snapshot = updateOfflineStorageHealthSnapshot({
      availability: 'ready',
      dbName: freshDb.name,
      lastRecoveryAction: 'manual-reset',
      requiresRedownload: true,
      lastErrorName: null,
      lastErrorMessage: null,
    });
    appendOfflineStorageTelemetryEvent('manual-reset', snapshot);
    return freshDb;
  } catch (err) {
    if (!isRecoverableOpenError(err)) {
      throw disableOfflineDb(err);
    }

    console.warn('[LMS-Offline] Manual reset on default DB name failed. Rotating database name.', err);

    try {
      const rotatedDbName = nextRotatedOfflineDbName();
      setActiveOfflineDbName(rotatedDbName);
      const rotatedDb = await createAndOpenOfflineDb(rotatedDbName);
      const snapshot = updateOfflineStorageHealthSnapshot({
        availability: 'ready',
        dbName: rotatedDb.name,
        lastRecoveryAction: 'manual-reset',
        requiresRedownload: true,
        lastErrorName: getErrorName(err),
        lastErrorMessage: getErrorMessage(err),
      });
      appendOfflineStorageTelemetryEvent('manual-reset', snapshot);
      return rotatedDb;
    } catch (rotationError) {
      throw disableOfflineDb(rotationError);
    }
  }
}

export let offlineDb = new LmsOfflineDatabase(getActiveOfflineDbName());
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
