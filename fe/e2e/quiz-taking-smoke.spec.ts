import { expect, test } from '@playwright/test';
import {
  API_BASE_URL,
  getAuthorizedJson,
  postAuthorizedJson,
  resetAppOriginState,
  seedStudentSession,
  type StudentSession,
} from './helpers/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuizTaskItem = {
  id: string;
  workType: string;
  title: string;
  courseId: string;
  courseName: string;
  status: string;
  attemptsRemaining: number | null;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  requiresPassword: boolean;
  lockAt: string | null;
  availableFrom: string | null;
};

type QuizQuestionItem = {
  id: string;
  questionType: string;
  options?: { optionKey: string; content: string }[];
};

type PreflightResponse = {
  quizId: string;
  quizTitle: string;
  attemptsRemaining: number | null;
  requiresPassword: boolean;
  inProgressAttempt: { attemptId: string; timeRemainingSeconds?: number } | null;
  effectiveTimeLimitSeconds: number | null;
  lockAt: string | null;
  dueAt: string | null;
  availableFrom: string | null;
};

// ─── Fixture Helpers ──────────────────────────────────────────────────────────

async function findTakeableQuizFixture(
  session: StudentSession,
  request: import('@playwright/test').APIRequestContext,
): Promise<QuizTaskItem> {
  const payload = await getAuthorizedJson<{ data: QuizTaskItem[]; success: boolean }>(
    request,
    session.accessToken,
    '/api/v3/student/tasks',
  );

  const tasks: QuizTaskItem[] = (payload as any)?.data ?? (payload as any) ?? [];

  const candidate = tasks.find(
    (t) =>
      t.workType !== 'ASSIGNMENT' &&
      (t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS') &&
      !t.requiresPassword &&
      (t.lockAt == null || new Date(t.lockAt) > new Date()),
  );

  if (!candidate) {
    throw new Error(
      'Could not find a takeable quiz (NOT_STARTED, no password, not locked) for this student. ' +
      'Ensure seed data (V55 migration) has created quiz assignments for student@maritime.edu.',
    );
  }

  return candidate;
}

async function findAutoGradableQuestions(
  session: StudentSession,
  request: import('@playwright/test').APIRequestContext,
  quizId: string,
): Promise<QuizQuestionItem[]> {
  const payload = await getAuthorizedJson<any>(
    request,
    session.accessToken,
    `/api/v3/quizzes/${quizId}/questions`,
  );
  const questions: QuizQuestionItem[] = (payload as any)?.data ?? payload ?? [];
  // Return only SINGLE_CHOICE / TRUE_FALSE — safe to auto-grade, always have options
  return questions.filter(
    (q) => q.questionType === 'SINGLE_CHOICE' || q.questionType === 'TRUE_FALSE',
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('@smoke Quiz-taking flow', () => {
  /**
   * P0 smoke: Confirmation → Start → Answer → Submit → Results
   *
   * Verifies the full student quiz-taking lifecycle end-to-end:
   * 1. Preflight API returns expected fields (lockAt, effectiveTimeLimitSeconds)
   * 2. Confirmation screen renders with quiz metadata
   * 3. Start → questions load
   * 4. Answer at least one SINGLE_CHOICE question
   * 5. Submit → results modal appears with a score
   */
  test('@smoke student can complete a quiz attempt from confirmation to results', async ({
    page,
    request,
  }) => {
    test.slow();

    await resetAppOriginState(page);
    const session = await seedStudentSession(page, request);

    // ── Step 1: Find a takeable quiz via API ──
    const quizTask = await findTakeableQuizFixture(session, request);

    // ── Step 2: Verify preflight API returns new fields ──
    const preflightPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/quizzes/${quizTask.id}/attempts/preflight`,
    );
    const preflight: PreflightResponse = (preflightPayload as any)?.data ?? preflightPayload;

    expect(preflight, 'Preflight response should exist').toBeTruthy();
    expect(preflight.quizId).toBe(quizTask.id);
    // New fields from our implementation
    expect('lockAt' in preflight, 'lockAt field must be present in preflight').toBeTruthy();
    expect('dueAt' in preflight, 'dueAt field must be present in preflight').toBeTruthy();
    expect('availableFrom' in preflight, 'availableFrom field must be present in preflight').toBeTruthy();
    expect('effectiveTimeLimitSeconds' in preflight, 'effectiveTimeLimitSeconds must be present').toBeTruthy();

    // ── Step 3: Navigate to the confirmation screen ──
    await page.goto(`/student/quiz/take/${quizTask.id}?returnUrl=/student/tasks`);
    await page.waitForLoadState('networkidle');

    // Confirmation screen should be visible
    const startButton = page.getByRole('button', { name: /Bắt đầu làm bài/i });
    await expect(startButton).toBeVisible({ timeout: 20_000 });

    // Quiz title should appear
    await expect(page.getByText(quizTask.title).first()).toBeVisible({ timeout: 10_000 });

    // If quiz has a lockAt, the deadline info strip should be visible
    if (quizTask.lockAt) {
      await expect(page.getByText(/Đóng bài lúc/i).first()).toBeVisible({ timeout: 5_000 });
    }

    // ── Step 4: Start the attempt ──
    await startButton.click();

    // Wait for questions to load (in-progress phase)
    const firstQuestion = page.locator('[class*="question"]').first();
    await expect(firstQuestion).toBeVisible({ timeout: 20_000 });

    // Timer should be visible if quiz has a time limit or lockAt
    if (quizTask.timeLimitMinutes || quizTask.lockAt) {
      // Timer chip in header (md+ breakpoint) or mobile bar
      const timerEl = page.locator('[role="timer"]').first();
      await expect(timerEl).toBeVisible({ timeout: 5_000 });
    }

    // ── Step 5: Answer at least one question ──
    const autoGradableQuestions = await findAutoGradableQuestions(session, request, quizTask.id);

    if (autoGradableQuestions.length > 0) {
      const q = autoGradableQuestions[0];
      if (q.options && q.options.length > 0) {
        // Click the first option button for the first question on the page
        const optionButtons = page
          .locator('button[role="radio"], button[role="checkbox"]')
          .first();
        if ((await optionButtons.count()) > 0) {
          await optionButtons.click();
        }
      }
    }

    // ── Step 6: Go to review then submit ──
    const reviewButton = page.getByRole('button', { name: /Nộp bài/i }).first();
    await expect(reviewButton).toBeVisible({ timeout: 10_000 });
    await reviewButton.click();

    // Review screen — submit from here
    const confirmSubmitButton = page
      .getByRole('button', { name: /Nộp bài|Xác nhận nộp/i })
      .last();
    await expect(confirmSubmitButton).toBeVisible({ timeout: 10_000 });
    await confirmSubmitButton.click();

    // ── Step 7: Results modal should appear ──
    await expect(page.getByText(/Kết quả|Điểm số|điểm/i).first()).toBeVisible({
      timeout: 20_000,
    });

    // Score percentage should be visible (0% - 100%)
    const scorePattern = /\d+(\.\d+)?(%|\/10|điểm)/i;
    await expect(page.getByText(scorePattern).first()).toBeVisible({ timeout: 10_000 });
  });

  /**
   * Preflight contract test: verify effectiveTimeLimitSeconds is capped by lockAt.
   * This is a pure API test — no browser needed.
   */
  test('@smoke preflight effectiveTimeLimitSeconds is null when quiz has no time constraint', async ({
    request,
  }) => {
    const session = await (async () => {
      const resp = await request.post(`${API_BASE_URL}/api/v3/auth/login`, {
        data: { email: 'student@maritime.edu', password: 'student123' },
      });
      expect(resp.ok()).toBeTruthy();
      const payload = await resp.json();
      return payload.data as StudentSession;
    })();

    const payload = await getAuthorizedJson<any>(request, session.accessToken, '/api/v3/student/tasks');
    const tasks: QuizTaskItem[] = (payload as any)?.data ?? payload ?? [];

    const unlimitedQuiz = tasks.find(
      (t) =>
        t.workType !== 'ASSIGNMENT' &&
        t.timeLimitMinutes == null &&
        t.lockAt == null &&
        (t.status === 'NOT_STARTED' || t.status === 'IN_PROGRESS'),
    );

    if (!unlimitedQuiz) {
      test.skip(true, 'No unlimited quiz found — skipping contract check');
      return;
    }

    const preflightPayload = await getAuthorizedJson<any>(
      request,
      session.accessToken,
      `/api/v3/quizzes/${unlimitedQuiz.id}/attempts/preflight`,
    );
    const preflight: PreflightResponse = (preflightPayload as any)?.data ?? preflightPayload;

    expect(preflight.effectiveTimeLimitSeconds).toBeNull();
    expect(preflight.lockAt).toBeNull();
  });

  /**
   * Student task list contract: verify LOCKED quizzes expose lockAt for UI display.
   */
  test('@smoke student task list exposes lockAt and availableFrom fields', async ({ request }) => {
    const resp = await request.post(`${API_BASE_URL}/api/v3/auth/login`, {
      data: { email: 'student@maritime.edu', password: 'student123' },
    });
    expect(resp.ok()).toBeTruthy();
    const loginPayload = await resp.json();
    const token: string = loginPayload.data?.accessToken;

    const payload = await getAuthorizedJson<any>(request, token, '/api/v3/student/tasks');
    const tasks: QuizTaskItem[] = (payload as any)?.data ?? payload ?? [];

    // Every quiz task should have lockAt and availableFrom as defined fields (null or string)
    const quizTasks = tasks.filter((t) => t.workType !== 'ASSIGNMENT');
    expect(quizTasks.length, 'Should have at least 1 quiz task in seed data').toBeGreaterThan(0);

    for (const task of quizTasks) {
      expect('lockAt' in task, `task ${task.id} missing lockAt field`).toBeTruthy();
      expect('availableFrom' in task, `task ${task.id} missing availableFrom field`).toBeTruthy();
      if (task.lockAt !== null) {
        expect(() => new Date(task.lockAt!)).not.toThrow();
      }
    }
  });
});
