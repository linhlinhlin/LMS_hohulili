import type { OfflineCourse } from '../../core/db/lms-offline.db';
import { buildOfflineCoursesListingResponse } from './offline.interceptor';

describe('buildOfflineCoursesListingResponse', () => {
  const cachedCourses: OfflineCourse[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'An toan hang hai co ban',
      description: 'Tong quan ve thao tac an toan tren tau',
      teacherName: 'Tran Hai',
      totalLessons: 6,
      downloadedAt: new Date('2026-04-20T10:00:00.000Z'),
      version: 1,
      sizeBytes: 1024,
      userId: 'student-1',
      deliveryMode: 'SELF_PACED',
      thumbnailUrl: 'https://example.com/cover-1.png',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Dieu khien tau nang cao',
      description: 'Luyen tap radar va dieu huong',
      teacherName: 'Nguyen Lan',
      totalLessons: 8,
      downloadedAt: new Date('2026-04-21T10:00:00.000Z'),
      version: 1,
      sizeBytes: 2048,
      userId: 'student-1',
      deliveryMode: 'INSTRUCTOR_LED',
    },
  ];

  it('returns a Spring-like page envelope for cached course listings', () => {
    const response = buildOfflineCoursesListingResponse(
      cachedCourses,
      '/api/v3/courses?page=0&size=1',
      '2026-04-23T10:00:00.000Z',
    );

    expect(response.success).toBeTrue();
    expect(response.message).toBe('Dữ liệu ngoại tuyến');
    expect(response.data.content.length).toBe(1);
    expect(response.data.totalElements).toBe(2);
    expect(response.data.totalPages).toBe(2);
    expect(response.data.number).toBe(0);
    expect(response.pagination.limit).toBe(1);
    expect(response.pagination.totalItems).toBe(2);
    expect(response._offline).toBeTrue();
    expect(response.timestamp).toBe('2026-04-23T10:00:00.000Z');
  });

  it('filters cached courses by search and teacher params before pagination', () => {
    const response = buildOfflineCoursesListingResponse(
      cachedCourses,
      '/api/v3/courses?search=radar&teacher=nguyen&page=0&size=12',
    );

    expect(response.data.content.length).toBe(1);
    expect(response.data.content[0].id).toBe('22222222-2222-2222-2222-222222222222');
    expect(response.data.totalElements).toBe(1);
    expect(response.data.empty).toBeFalse();
  });

  it('keeps an empty page instead of collapsing to a null response when cached data exists', () => {
    const response = buildOfflineCoursesListingResponse(
      cachedCourses,
      '/api/v3/courses?search=khong-khop&page=0&size=12',
    );

    expect(response.data.content).toEqual([]);
    expect(response.data.totalElements).toBe(0);
    expect(response.data.empty).toBeTrue();
    expect(response.pagination.totalItems).toBe(0);
  });
});
