import { getOfflineCourseStaleCopy } from './offline-course-staleness';

describe('offline-course-staleness', () => {
  it('returns update copy by default', () => {
    const copy = getOfflineCourseStaleCopy('UPDATE_AVAILABLE');

    expect(copy.title).toContain('cập nhật');
    expect(copy.actionLabel).toBe('Cập nhật lại');
    expect(copy.assessmentBlockedMessage).toContain('Lưu trữ ngoại tuyến');
  });

  it('returns class adopted publication copy', () => {
    const copy = getOfflineCourseStaleCopy('CLASS_ADOPTED_NEW_PUBLICATION');

    expect(copy.title).toContain('Gói ngoại tuyến đã cũ');
    expect(copy.actionLabel).toBe('Tải phiên bản mới');
    expect(copy.assessmentBlockedMessage).toContain('phiên bản nội dung mới');
  });

  it('returns legacy package copy', () => {
    const copy = getOfflineCourseStaleCopy('LEGACY_PACKAGE');

    expect(copy.title).toContain('Cần tải lại');
    expect(copy.actionLabel).toBe('Tải lại gói');
    expect(copy.assessmentBlockedMessage).toContain('publication version');
  });

  it('falls back for unknown reasons', () => {
    const copy = getOfflineCourseStaleCopy('UNKNOWN');

    expect(copy.actionLabel).toBe('Cập nhật lại');
  });
});
