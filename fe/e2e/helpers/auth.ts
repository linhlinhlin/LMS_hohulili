import { APIRequestContext, APIResponse, expect, Page } from '@playwright/test';

export const API_BASE_URL = 'http://localhost:8088';
const OFFLINE_DB_NAME = 'lms-maritime-offline';
const SAFE_COMPLETION_SECTION_TYPES = new Set(['TEXT', 'FILE']);
const sessionCache = new Map<string, StudentSession>();

export type StudentSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    username?: string;
    organizationId?: string;
  };
};

export type AdaptiveVideoFixture = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonIndex: number;
  sectionId: string;
  sectionTitle: string;
  sectionIndex: number;
  videoAssetId: string;
};

export type LearningProgressFixture = {
  courseId: string;
  courseTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterIndex: number;
  lessonId: string;
  lessonTitle: string;
  lessonIndex: number;
  sectionIds: string[];
  sectionTitles: string[];
  nextLessonId: string | null;
  nextLessonTitle: string | null;
};

export type OfflineLearningFixture = LearningProgressFixture & {
  videoLessonId: string;
  videoLessonTitle: string;
  videoLessonIndex: number;
  videoSectionId: string;
  videoSectionTitle: string;
  videoSectionIndex: number;
  videoSectionNavLabel: string;
};

export type PaymentCourseFixture = {
  freeCourseId: string;
  freeCourseTitle: string;
  paidCourseId: string;
  paidCourseTitle: string;
  manualActivationCourseId: string | null;
  manualActivationCourseTitle: string | null;
};

type PaymentFixtureOptions = {
  requireFreeCourse?: boolean;
  requirePaidCourse?: boolean;
  requireDirectAccessCourse?: boolean;
  requireManualActivationCourse?: boolean;
};

const PAYMENT_SMOKE_STUDENT_CREDENTIALS = [
  { email: 'tranthibinh@sv.maritime.edu', password: 'Student@2026' },
  { email: 'nguyenvanan@sv.maritime.edu', password: 'Student@2026' },
  { email: 'lehoangcuong@sv.maritime.edu', password: 'Student@2026' },
  { email: 'phamthidung@sv.maritime.edu', password: 'Student@2026' },
  { email: 'vovanem@sv.maritime.edu', password: 'Student@2026' },
  { email: 'dangthiphuong@sv.maritime.edu', password: 'Student@2026' },
  { email: 'hoangvangiang@sv.maritime.edu', password: 'Student@2026' },
  { email: 'ngothihue@sv.maritime.edu', password: 'Student@2026' },
  { email: 'buivankhoi@sv.maritime.edu', password: 'Student@2026' },
  { email: 'lythilan@sv.maritime.edu', password: 'Student@2026' },
  { email: 'student@maritime.edu', password: 'student123' },
] as const;

type CourseSummaryLike = {
  id: string;
  title: string;
  allowOfflineDownload?: boolean;
  deliveryMode?: string;
  priceType?: string;
  price?: number;
};

type CourseContentChapterLike = {
  id: string;
  title: string;
  lessons?: LessonSummaryLike[];
};

type LessonSummaryLike = {
  id: string;
  title: string;
  locked?: boolean;
  sections?: SectionSummaryLike[];
};

type SectionSummaryLike = {
  id: string;
  title: string;
  type?: string;
  videoAssetId?: string | null;
  videoSourceKind?: string | null;
};

async function loginUserViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<StudentSession> {
  const cacheKey = `${email}:${password}`;
  const cached = sessionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await request.post(`${API_BASE_URL}/api/v3/auth/login`, {
      data: {
        email,
        password,
      },
    });

    if (response.ok()) {
      const payload = await response.json();
      expect(payload?.success).toBeTruthy();
      const session = payload.data as StudentSession;
      sessionCache.set(cacheKey, session);
      return session;
    }

    const rawBody = await response.text();
    if (await waitForRateLimitRetry(response, rawBody, attempt, maxAttempts)) {
      continue;
    }

    expect(response.ok(), `Login failed for ${email}: ${rawBody || response.statusText()}`).toBeTruthy();
  }

  throw new Error(`Login failed for ${email} after ${maxAttempts} attempts.`);
}

async function waitForRateLimitRetry(
  response: APIResponse,
  rawBody: string,
  attempt: number,
  maxAttempts: number,
): Promise<boolean> {
  const isRateLimited =
    response.status() === 429
    || /too many|rate limit|quá nhiều|thử lại sau/i.test(rawBody);

  if (!isRateLimited || attempt >= maxAttempts - 1) {
    return false;
  }

  const retryAfterHeader = response.headers()['retry-after'];
  const retryAfterSeconds = Number(retryAfterHeader);
  const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds * 1000
    : 5000;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return true;
}

export async function loginStudentViaApi(request: APIRequestContext): Promise<StudentSession> {
  return loginUserViaApi(request, 'student@maritime.edu', 'student123');
}

export async function seedStudentSession(page: Page, request: APIRequestContext): Promise<StudentSession> {
  const session = await loginStudentViaApi(request);
  await applyStudentSession(page, session);
  return {
    ...session,
    user: {
      ...session.user,
      role: session.user.role?.toLowerCase() ?? '',
    },
  };
}

export async function seedPaymentSmokeSession(
  page: Page,
  request: APIRequestContext,
  options?: PaymentFixtureOptions,
): Promise<{ session: StudentSession; fixture: PaymentCourseFixture }> {
  let lastError: Error | null = null;

  for (const credentials of PAYMENT_SMOKE_STUDENT_CREDENTIALS) {
    try {
      const session = await loginUserViaApi(request, credentials.email, credentials.password);
      const fixture = await findPaymentCourseFixture(request, session.accessToken, options);
      const seededSession = await applyStudentSession(page, session);
      return { session: seededSession, fixture };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Could not find a seeded student account with payment smoke fixtures.');
}

export async function seedOfflineLearningSession(
  page: Page,
  request: APIRequestContext,
): Promise<{ session: StudentSession; fixture: OfflineLearningFixture }> {
  let lastError: Error | null = null;

  for (const credentials of PAYMENT_SMOKE_STUDENT_CREDENTIALS) {
    try {
      const session = await loginUserViaApi(request, credentials.email, credentials.password);
      const fixture = await findOfflineLearningFixture(request, session.accessToken);
      const seededSession = await applyStudentSession(page, session);
      return { session: seededSession, fixture };
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Could not find a seeded student account with offline learning fixtures.');
}

async function applyStudentSession(page: Page, session: StudentSession): Promise<StudentSession> {
  const normalizedUser = {
    ...session.user,
    role: session.user.role?.toLowerCase() ?? '',
  };

  await page.addInitScript(({ accessToken, refreshToken, user }) => {
    window.localStorage.setItem('lms_access_token', accessToken);
    window.localStorage.setItem('lms_refresh_token', refreshToken);
    window.localStorage.setItem('lms_user', JSON.stringify(user));
  }, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: normalizedUser,
  });

  return {
    ...session,
    user: normalizedUser,
  };
}

export async function resetAppOriginState(page: Page): Promise<void> {
  await page.goto('/');

  await page.evaluate(async (dbName) => {
    localStorage.clear();
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    const names = new Set<string>([dbName]);
    const idbWithDatabases = indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>;
    };

    if (typeof idbWithDatabases.databases === 'function') {
      const databases = await idbWithDatabases.databases();
      for (const database of databases) {
        if (database?.name) {
          names.add(database.name);
        }
      }
    }

    await Promise.all(
      [...names].filter(Boolean).map((name) => new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => window.setTimeout(resolve, 1_000);
      })),
    );

    localStorage.clear();
    sessionStorage.clear();
  }, OFFLINE_DB_NAME);

  await page.goto('about:blank');
}

export async function readOfflineSyncQueue(page: Page): Promise<any[]> {
  return readIndexedDbStore(page, 'syncQueue');
}

export async function readOfflineProgressRecord(page: Page, lessonId: string): Promise<any | null> {
  const records = await readIndexedDbStore(page, 'progress');
  return records.find((record) => record?.lessonId === lessonId) ?? null;
}

export async function readOfflineCourseRecord(page: Page, courseId: string): Promise<any | null> {
  const records = await readIndexedDbStore(page, 'courses');
  return records.find((record) => record?.id === courseId) ?? null;
}

export async function readLocalStorageJson<T>(page: Page, key: string): Promise<T | null> {
  await ensureAppOrigin(page);
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, key);
}

export async function findAdaptiveVideoFixture(
  request: APIRequestContext,
  accessToken: string,
): Promise<AdaptiveVideoFixture> {
  const courses = await fetchEnrolledCourses(request, accessToken);

  for (const course of courses) {
    const chapters = await fetchCourseContent(request, accessToken, course.id);

    for (const chapter of chapters) {
      const lessons = chapter?.lessons ?? [];

      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
        const lesson = lessons[lessonIndex];
        const sections = lesson?.sections ?? [];

        for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
          const section = sections[sectionIndex];
          if (!section?.videoAssetId || section?.videoSourceKind !== 'ADAPTIVE_R2') {
            continue;
          }

          return {
            courseId: course.id,
            courseTitle: course.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonIndex,
            sectionId: section.id,
            sectionTitle: section.title,
            sectionIndex,
            videoAssetId: section.videoAssetId,
          };
        }
      }
    }
  }

  throw new Error('Could not find an enrolled lesson section backed by ADAPTIVE_R2.');
}

export async function findLearningProgressFixture(
  request: APIRequestContext,
  accessToken: string,
): Promise<LearningProgressFixture> {
  const courses = await fetchEnrolledCourses(request, accessToken);

  for (const course of courses) {
    const chapters = await fetchCourseContent(request, accessToken, course.id);
    const completedLessonIds = await fetchCompletedLessonIds(request, accessToken, course.id);
    const flattenedLessons = chapters.flatMap((chapter, chapterIndex) =>
      (chapter?.lessons ?? []).map((lesson, lessonIndex) => ({
        chapter,
        chapterIndex,
        lesson,
        lessonIndex,
      })),
    );
    let bestCandidate: LearningProgressFixture | null = null;
    let bestScore = -1;

    for (let lessonCursor = 0; lessonCursor < flattenedLessons.length; lessonCursor += 1) {
      const entry = flattenedLessons[lessonCursor];
      const chapter = entry.chapter;
      const lesson = entry.lesson;
      const sections = lesson?.sections ?? [];

      if (!chapter || completedLessonIds.has(lesson.id) || lesson.locked === true || sections.length === 0) {
        continue;
      }

      const safeSections = sections.filter((section) =>
        SAFE_COMPLETION_SECTION_TYPES.has(normalizeSectionType(section.type)),
      );

      if (safeSections.length !== sections.length || safeSections.length === 0) {
        continue;
      }

      const nextLessonEntry = flattenedLessons[lessonCursor + 1] ?? null;
      const nextLesson = nextLessonEntry?.lesson ?? null;
      const hasCleanNextLesson = !!nextLesson
        && nextLesson.locked !== true
        && !completedLessonIds.has(nextLesson.id);

      const candidate: LearningProgressFixture = {
        courseId: course.id,
        courseTitle: course.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterIndex: entry.chapterIndex,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonIndex: entry.lessonIndex,
        sectionIds: safeSections.map((section) => section.id),
        sectionTitles: safeSections.map((section) => section.title),
        nextLessonId: hasCleanNextLesson ? nextLesson!.id : null,
        nextLessonTitle: hasCleanNextLesson ? nextLesson!.title : null,
      };
      const candidateScore = (safeSections.length >= 2 ? 2 : 1) + (hasCleanNextLesson ? 10 : 0);

      if (candidateScore > bestScore) {
        bestCandidate = candidate;
        bestScore = candidateScore;
      }
    }

    if (bestCandidate) {
      return bestCandidate;
    }
  }

  throw new Error('Could not find an incomplete enrolled lesson with safe TEXT/FILE sections.');
}

export async function findOfflineLearningFixture(
  request: APIRequestContext,
  accessToken: string,
): Promise<OfflineLearningFixture> {
  const courses = await fetchEnrolledCourses(request, accessToken);

  for (const course of courses) {
    if (course.allowOfflineDownload === false) {
      continue;
    }

    const chapters = await fetchCourseContent(request, accessToken, course.id);
    const completedLessonIds = await fetchCompletedLessonIds(request, accessToken, course.id);
    const flattenedLessons = chapters.flatMap((chapter, chapterIndex) =>
      (chapter?.lessons ?? []).map((lesson, lessonIndex) => ({
        chapter,
        chapterIndex,
        lesson,
        lessonIndex,
      })),
    );
    let videoCandidate: Omit<OfflineLearningFixture, keyof LearningProgressFixture> | null = null;
    let progressCandidate: LearningProgressFixture | null = null;
    let progressScore = -1;

    for (let lessonCursor = 0; lessonCursor < flattenedLessons.length; lessonCursor += 1) {
      const entry = flattenedLessons[lessonCursor];
      const chapter = entry.chapter;
      const lesson = entry.lesson;
      const sections = lesson?.sections ?? [];

      if (!chapter) {
        continue;
      }

      if (!videoCandidate) {
        const prioritizedSectionIndex = sections.findIndex((section, sectionIndex) =>
          sectionIndex === 0
          && !!section.videoAssetId
          && section.videoSourceKind === 'ADAPTIVE_R2',
        );
        const fallbackSectionIndex = sections.findIndex((section) =>
          !!section.videoAssetId && section.videoSourceKind === 'ADAPTIVE_R2',
        );
        const sectionIndex = prioritizedSectionIndex >= 0
          ? prioritizedSectionIndex
          : fallbackSectionIndex;

        if (sectionIndex >= 0) {
          videoCandidate = {
            videoLessonId: lesson.id,
            videoLessonTitle: lesson.title,
            videoLessonIndex: entry.lessonIndex,
            videoSectionId: sections[sectionIndex].id,
            videoSectionTitle: sections[sectionIndex].title,
            videoSectionIndex: sectionIndex,
            videoSectionNavLabel: `${entry.lessonIndex + 1}.${sectionIndex + 1}`,
          };
        }
      }

      if (completedLessonIds.has(lesson.id) || lesson.locked === true || sections.length === 0) {
        continue;
      }

      const safeSections = sections.filter((section) =>
        SAFE_COMPLETION_SECTION_TYPES.has(normalizeSectionType(section.type)),
      );

      if (safeSections.length !== sections.length || safeSections.length === 0) {
        continue;
      }

      const nextLessonEntry = flattenedLessons[lessonCursor + 1] ?? null;
      const nextLesson = nextLessonEntry?.lesson ?? null;
      const hasCleanNextLesson = !!nextLesson
        && nextLesson.locked !== true
        && !completedLessonIds.has(nextLesson.id);

      const candidate: LearningProgressFixture = {
        courseId: course.id,
        courseTitle: course.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterIndex: entry.chapterIndex,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonIndex: entry.lessonIndex,
        sectionIds: safeSections.map((section) => section.id),
        sectionTitles: safeSections.map((section) => section.title),
        nextLessonId: hasCleanNextLesson ? nextLesson!.id : null,
        nextLessonTitle: hasCleanNextLesson ? nextLesson!.title : null,
      };
      const candidateScore = (safeSections.length >= 2 ? 2 : 1) + (hasCleanNextLesson ? 10 : 0);

      if (candidateScore > progressScore) {
        progressCandidate = candidate;
        progressScore = candidateScore;
      }
    }

    if (videoCandidate && progressCandidate) {
      return {
        ...progressCandidate,
        ...videoCandidate,
      };
    }
  }

  throw new Error(
    'Could not find a downloadable enrolled course with both adaptive video and safe offline lesson sections.',
  );
}

export async function findPaymentCourseFixture(
  request: APIRequestContext,
  accessToken: string,
  options: PaymentFixtureOptions = {},
): Promise<PaymentCourseFixture> {
  const requireFreeCourse = options.requireFreeCourse ?? true;
  const requirePaidCourse = options.requirePaidCourse ?? true;
  const requireDirectAccessCourse = options.requireDirectAccessCourse ?? false;
  const requireManualActivationCourse = options.requireManualActivationCourse ?? false;
  const enrolledCourses = await fetchEnrolledCourses(request, accessToken);
  const enrolledIds = new Set(enrolledCourses.map((course) => course.id));
  const publicCourses = await fetchPublicCourses(request, accessToken);

  const freeCourse = publicCourses.find((course) =>
    !enrolledIds.has(course.id) && isFreeCourse(course),
  ) ?? publicCourses.find(isFreeCourse);

  const candidatePaidCourses = publicCourses.filter((course) =>
    !enrolledIds.has(course.id) && !isFreeCourse(course),
  );
  const instructorLedCourses = candidatePaidCourses.filter((course) => course.deliveryMode === 'INSTRUCTOR_LED');
  let paidCourse: CourseSummaryLike | undefined;
  let manualActivationCourse: CourseSummaryLike | undefined;
  const unpaidInstructorLedCourses: CourseSummaryLike[] = [];
  const directAccessCourses = candidatePaidCourses.filter((course) => course.deliveryMode === 'SELF_PACED');
  const prioritizedPaidCourses = requireDirectAccessCourse
    ? directAccessCourses
    : requireManualActivationCourse && !requirePaidCourse
      ? instructorLedCourses
      : [
          ...directAccessCourses,
          ...candidatePaidCourses.filter((course) => course.deliveryMode !== 'SELF_PACED'),
        ];

  for (const course of prioritizedPaidCourses) {
    try {
      const paymentStatus = await fetchPaymentStatus(request, accessToken, course.id);
      if (course.deliveryMode === 'INSTRUCTOR_LED' && !paymentStatus.hasPaid) {
        unpaidInstructorLedCourses.push(course);
      }
      if (!paymentStatus.hasPaid && !paidCourse) {
        paidCourse = course;
      }
    } catch {
      continue;
    }
  }

  if (requireFreeCourse && !freeCourse) {
    throw new Error(
      'Could not find a free public course for payment smoke.',
    );
  }

  if (requirePaidCourse && !paidCourse) {
    throw new Error(
      requireDirectAccessCourse
        ? 'Could not find an unpaid self-paced paid course for payment smoke.'
        : 'Could not find an unpaid public paid course for payment smoke.',
    );
  }

  manualActivationCourse = unpaidInstructorLedCourses.find((course) =>
    course.id !== paidCourse?.id,
  ) ?? unpaidInstructorLedCourses[0];

  if (requireManualActivationCourse && !manualActivationCourse) {
    throw new Error('Could not find an unpaid instructor-led paid course for payment smoke.');
  }

  const resolvedFreeCourse = freeCourse ?? publicCourses.find(isFreeCourse);
  const resolvedPaidCourse = paidCourse ?? manualActivationCourse ?? candidatePaidCourses[0];

  if (!resolvedFreeCourse || !resolvedPaidCourse) {
    throw new Error(
      'Could not resolve payment smoke fixtures from the current public course dataset.',
    );
  }

  return {
    freeCourseId: resolvedFreeCourse.id,
    freeCourseTitle: resolvedFreeCourse.title,
    paidCourseId: resolvedPaidCourse.id,
    paidCourseTitle: resolvedPaidCourse.title,
    manualActivationCourseId: manualActivationCourse?.id ?? null,
    manualActivationCourseTitle: manualActivationCourse?.title ?? null,
  };
}

export async function getAuthorizedJson<T = any>(
  request: APIRequestContext,
  accessToken: string,
  path: string,
): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await request.get(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok()) {
      return response.json() as Promise<T>;
    }

    const rawBody = await response.text();
    if (await waitForRateLimitRetry(response, rawBody, attempt, maxAttempts)) {
      continue;
    }

    expect(response.ok(), `GET ${path} failed: ${rawBody || response.statusText()}`).toBeTruthy();
  }

  throw new Error(`GET ${path} failed after ${maxAttempts} attempts.`);
}

export async function postAuthorizedJson<T = any>(
  request: APIRequestContext,
  accessToken: string,
  path: string,
  data: unknown,
): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await request.post(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data,
    });
    if (response.ok()) {
      return response.json() as Promise<T>;
    }

    const rawBody = await response.text();
    if (await waitForRateLimitRetry(response, rawBody, attempt, maxAttempts)) {
      continue;
    }

    expect(response.ok(), `POST ${path} failed: ${rawBody || response.statusText()}`).toBeTruthy();
  }

  throw new Error(`POST ${path} failed after ${maxAttempts} attempts.`);
}

async function fetchEnrolledCourses(
  request: APIRequestContext,
  accessToken: string,
): Promise<CourseSummaryLike[]> {
  const payload = await getAuthorizedJson<any>(
    request,
    accessToken,
    '/api/v3/student/courses/enrolled?page=0&size=100',
  );
  return payload?.data?.content ?? [];
}

async function fetchPublicCourses(
  request: APIRequestContext,
  accessToken: string,
): Promise<CourseSummaryLike[]> {
  const payload = await getAuthorizedJson<any>(
    request,
    accessToken,
    '/api/v3/courses?page=0&size=100',
  );
  return payload?.data?.content ?? [];
}

async function fetchCourseContent(
  request: APIRequestContext,
  accessToken: string,
  courseId: string,
): Promise<CourseContentChapterLike[]> {
  const payload = await getAuthorizedJson<any>(
    request,
    accessToken,
    `/api/v3/courses/${courseId}/content`,
  );
  return payload?.data ?? [];
}

async function fetchCompletedLessonIds(
  request: APIRequestContext,
  accessToken: string,
  courseId: string,
): Promise<Set<string>> {
  const payload = await getAuthorizedJson<any>(
    request,
    accessToken,
    `/api/v3/student/progress/courses/${courseId}/completed-ids`,
  );
  const completedIds = payload?.data ?? [];
  return new Set(Array.isArray(completedIds) ? completedIds : []);
}

async function fetchPaymentStatus(
  request: APIRequestContext,
  accessToken: string,
  courseId: string,
): Promise<{ hasPaid: boolean; status: string | null }> {
  const payload = await getAuthorizedJson<any>(
    request,
    accessToken,
    `/api/v3/payments/status/${courseId}`,
  );
  return {
    hasPaid: !!payload?.data?.hasPaid,
    status: payload?.data?.status ?? null,
  };
}

function normalizeSectionType(sectionType: string | null | undefined): string {
  return String(sectionType ?? '').toUpperCase();
}

function isFreeCourse(course: CourseSummaryLike): boolean {
  return course.priceType === 'FREE' || Number(course.price ?? 0) <= 0;
}

async function readIndexedDbStore(page: Page, storeName: string): Promise<any[]> {
  await ensureAppOrigin(page);

  return page.evaluate(async ({ dbName, objectStoreName }) => {
    const openDb = () => new Promise<IDBDatabase | null>((resolve) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onupgradeneeded = () => resolve(request.result);
    });

    const db = await openDb();
    if (!db || !db.objectStoreNames.contains(objectStoreName)) {
      return [];
    }

    return new Promise<any[]>((resolve) => {
      const transaction = db.transaction(objectStoreName, 'readonly');
      const store = transaction.objectStore(objectStoreName);
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result as any[]);
      getAll.onerror = () => resolve([]);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  }, { dbName: OFFLINE_DB_NAME, objectStoreName: storeName });
}

async function ensureAppOrigin(page: Page): Promise<void> {
  const currentUrl = page.url();
  if (
    currentUrl.startsWith('http://127.0.0.1:4300/')
    || currentUrl === 'http://127.0.0.1:4300'
    || currentUrl.startsWith('http://localhost:4300/')
    || currentUrl === 'http://localhost:4300'
  ) {
    return;
  }

  await page.goto('/');
}
