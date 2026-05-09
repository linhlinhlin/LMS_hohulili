import { computed, Injectable, signal } from '@angular/core';

export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'deferred'
  | 'applying'
  | 'failed'
  | 'unrecoverable';

export type AppUpdateSeverity = 'normal' | 'important' | 'critical';

export type AppUpdateBlockerKind =
  | 'learning'
  | 'assessment'
  | 'authoring'
  | 'transaction'
  | 'offline'
  | 'background';

export interface AppUpdateBlocker {
  kind: AppUpdateBlockerKind;
  label: string;
  reason: string;
  safePoint: string;
}

export interface AppUpdateVersionInfo {
  currentHash: string | null;
  latestHash: string | null;
  detectedAt: number;
  severity: AppUpdateSeverity;
  releaseNote: string | null;
}

export interface AppUpdateState {
  status: AppUpdateStatus;
  version: AppUpdateVersionInfo | null;
  blocker: AppUpdateBlocker | null;
  reason: string | null;
  dismissedUntil: number;
}

export interface AppUpdatePromptCopy {
  title: string;
  message: string;
  primaryText: string;
  secondaryText: string | null;
  tone: 'info' | 'warning' | 'danger';
  compactLabel: string;
}

export interface AppUpdateContextOptions {
  online?: boolean;
  visibilityState?: DocumentVisibilityState | 'visible' | 'hidden';
}

const INITIAL_STATE: AppUpdateState = {
  status: 'idle',
  version: null,
  blocker: null,
  reason: null,
  dismissedUntil: 0,
};

const DEFAULT_DISMISS_MS = 30 * 60 * 1000;

export function classifyAppUpdateContext(
  url: string,
  options: AppUpdateContextOptions = {},
): AppUpdateBlocker | null {
  if (options.online === false) {
    return {
      kind: 'offline',
      label: 'Ngoại tuyến',
      reason: 'Thiết bị đang ngoại tuyến.',
      safePoint: 'Bản mới sẽ cập nhật khi có mạng ổn định.',
    };
  }

  if (options.visibilityState === 'hidden') {
    return {
      kind: 'background',
      label: 'Đang chạy nền',
      reason: 'Trang đang chạy nền.',
      safePoint: 'Bản mới sẽ hiện khi bạn quay lại ứng dụng.',
    };
  }

  const pathname = getPathname(url);

  if (pathname.startsWith('/student/learn/course/') && pathname.includes('/lesson/')) {
    return {
      kind: 'learning',
      label: 'Đang học',
      reason: 'Bạn đang xem bài học.',
      safePoint: 'Nên cập nhật khi video tạm dừng hoặc sau khi chuyển bài.',
    };
  }

  if (pathname.startsWith('/student/quiz/take') || pathname.includes('/quiz/take/')) {
    return {
      kind: 'assessment',
      label: 'Đang làm bài',
      reason: 'Bạn đang làm bài kiểm tra.',
      safePoint: 'Nên cập nhật sau khi nộp bài để tránh mất nhịp làm bài.',
    };
  }

  if (
    (pathname.startsWith('/teacher/courses/') && pathname.includes('/editor')) ||
    pathname.startsWith('/teacher/quiz') ||
    pathname.startsWith('/teacher/assessments') ||
    pathname.startsWith('/teacher/assignments')
  ) {
    return {
      kind: 'authoring',
      label: 'Đang soạn',
      reason: 'Bạn đang chỉnh sửa nội dung.',
      safePoint: 'Hãy lưu bản nháp rồi cập nhật.',
    };
  }

  if (pathname.startsWith('/payment')) {
    return {
      kind: 'transaction',
      label: 'Thanh toán',
      reason: 'Bạn đang ở bước thanh toán.',
      safePoint: 'Nên hoàn tất hoặc rời khỏi bước này rồi cập nhật.',
    };
  }

  return null;
}

export function buildAppUpdatePromptCopy(state: AppUpdateState): AppUpdatePromptCopy | null {
  if (state.status === 'idle' || state.status === 'checking' || state.status === 'failed') {
    return null;
  }

  if (state.status === 'applying') {
    return {
      title: 'Đang cập nhật',
      message: 'Ứng dụng sẽ tải lại trong giây lát.',
      primaryText: 'Đang cập nhật',
      secondaryText: null,
      tone: 'info',
      compactLabel: 'Đang cập nhật',
    };
  }

  if (state.status === 'unrecoverable') {
    return {
      title: 'Cần tải lại ứng dụng',
      message: 'Một phần ứng dụng đã cũ hoặc bị mất khi tải. Tải lại sẽ khôi phục phiên học.',
      primaryText: 'Tải lại',
      secondaryText: null,
      tone: 'danger',
      compactLabel: 'Cần tải lại',
    };
  }

  const isImportant = state.version?.severity === 'important' || state.version?.severity === 'critical';
  const title = state.blocker ? 'Bản cập nhật đã sẵn sàng' : 'Có bản cập nhật mới';
  const releaseNote = state.version?.releaseNote ? ` ${state.version.releaseNote}` : '';
  const message = state.blocker
    ? `${state.blocker.reason} ${state.blocker.safePoint}${releaseNote}`
    : `Mất vài giây để làm mới giao diện và dữ liệu.${releaseNote}`;

  return {
    title,
    message,
    primaryText: 'Cập nhật',
    secondaryText: 'Để sau',
    tone: isImportant ? 'warning' : 'info',
    compactLabel: state.blocker?.label ?? 'Bản mới',
  };
}

@Injectable({ providedIn: 'root' })
export class AppUpdateStateService {
  private readonly status = signal<AppUpdateStatus>('idle');
  private readonly version = signal<AppUpdateVersionInfo | null>(null);
  private readonly blocker = signal<AppUpdateBlocker | null>(null);
  private readonly reason = signal<string | null>(null);
  private readonly dismissedUntil = signal(0);
  private readonly clock = signal(Date.now());

  readonly state = computed<AppUpdateState>(() => ({
    status: this.status(),
    version: this.version(),
    blocker: this.blocker(),
    reason: this.reason(),
    dismissedUntil: this.dismissedUntil(),
  }));

  readonly promptCopy = computed(() => buildAppUpdatePromptCopy(this.state()));

  readonly shouldShowPrompt = computed(() => {
    const state = this.state();
    if (!['ready', 'deferred', 'applying', 'unrecoverable'].includes(state.status)) {
      return false;
    }

    if (state.status === 'unrecoverable' || state.status === 'applying') {
      return true;
    }

    return state.dismissedUntil <= this.clock();
  });

  markChecking(): void {
    if (this.status() === 'ready' || this.status() === 'deferred') {
      return;
    }

    this.status.set('checking');
    this.reason.set(null);
    this.tick();
  }

  markReady(version: AppUpdateVersionInfo, blocker: AppUpdateBlocker | null): void {
    this.version.set(version);
    this.blocker.set(blocker);
    this.status.set(blocker ? 'deferred' : 'ready');
    this.reason.set(null);
    this.tick();
  }

  updateBlocker(blocker: AppUpdateBlocker | null): void {
    if (this.status() !== 'ready' && this.status() !== 'deferred') {
      return;
    }

    this.blocker.set(blocker);
    this.status.set(blocker ? 'deferred' : 'ready');
    this.tick();
  }

  markApplying(): void {
    this.status.set('applying');
    this.reason.set(null);
    this.dismissedUntil.set(0);
    this.tick();
  }

  markFailed(reason: string): void {
    if (this.status() === 'ready' || this.status() === 'deferred') {
      return;
    }

    this.status.set('failed');
    this.reason.set(reason);
    this.tick();
  }

  markUnrecoverable(reason: string, blocker: AppUpdateBlocker | null = null): void {
    this.status.set('unrecoverable');
    this.reason.set(reason);
    this.blocker.set(blocker);
    this.dismissedUntil.set(0);
    this.tick();
  }

  dismissFor(durationMs = DEFAULT_DISMISS_MS): void {
    if (this.status() === 'unrecoverable' || this.status() === 'applying') {
      return;
    }

    this.dismissedUntil.set(Date.now() + durationMs);
    this.tick();
    setTimeout(() => this.tick(), durationMs + 250);
  }

  clear(): void {
    this.status.set(INITIAL_STATE.status);
    this.version.set(INITIAL_STATE.version);
    this.blocker.set(INITIAL_STATE.blocker);
    this.reason.set(INITIAL_STATE.reason);
    this.dismissedUntil.set(INITIAL_STATE.dismissedUntil);
    this.tick();
  }

  private tick(): void {
    this.clock.set(Date.now());
  }
}

function getPathname(url: string): string {
  try {
    return new URL(url, 'https://holilihu.local').pathname.toLowerCase();
  } catch {
    return url.split('?')[0]?.split('#')[0]?.toLowerCase() ?? '';
  }
}
