import { APIRequestContext, expect, Page } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8088';

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

export async function loginStudentViaApi(request: APIRequestContext): Promise<StudentSession> {
  const response = await request.post(`${API_BASE_URL}/api/v3/auth/login`, {
    data: {
      email: 'student@maritime.edu',
      password: 'student123',
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload?.success).toBeTruthy();

  return payload.data as StudentSession;
}

export async function seedStudentSession(page: Page, request: APIRequestContext): Promise<StudentSession> {
  const session = await loginStudentViaApi(request);
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

export async function findAdaptiveVideoFixture(
  request: APIRequestContext,
  accessToken: string,
): Promise<AdaptiveVideoFixture> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const enrolledResponse = await request.get(`${API_BASE_URL}/api/v3/student/courses/enrolled`, { headers });

  expect(enrolledResponse.ok()).toBeTruthy();
  const enrolledPayload = await enrolledResponse.json();
  const courses = enrolledPayload?.data?.content ?? [];

  for (const course of courses) {
    const courseContentResponse = await request.get(`${API_BASE_URL}/api/v3/courses/${course.id}/content`, { headers });
    expect(courseContentResponse.ok()).toBeTruthy();

    const courseContentPayload = await courseContentResponse.json();
    const chapters = courseContentPayload?.data ?? [];

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
