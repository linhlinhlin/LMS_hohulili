export type OfflineCourseStaleReason =
  | 'UPDATE_AVAILABLE'
  | 'CLASS_ADOPTED_NEW_PUBLICATION'
  | 'LEGACY_PACKAGE'
  | 'UNKNOWN'
  | string
  | null
  | undefined;

export interface OfflineCourseStaleCopy {
  title: string;
  description: string;
  actionLabel: string;
  assessmentBlockedMessage: string;
}

const DEFAULT_COPY: OfflineCourseStaleCopy = {
  title: 'Có bản cập nhật cho khóa học',
  description:
    'Bạn đang học bằng gói ngoại tuyến cũ. Nội dung đã tải vẫn xem được, nhưng nên cập nhật khi có mạng để lấy phiên bản mới nhất. Bài kiểm tra và bài thi online-only sẽ bị khóa cho tới khi cập nhật.',
  actionLabel: 'Cập nhật lại',
  assessmentBlockedMessage:
    'Khóa học đã có bản cập nhật mới. Hãy vào Lưu trữ ngoại tuyến để cập nhật gói trước khi mở bài kiểm tra hoặc bài thi.',
};

export function getOfflineCourseStaleCopy(
  reason: OfflineCourseStaleReason,
): OfflineCourseStaleCopy {
  switch (reason) {
    case 'CLASS_ADOPTED_NEW_PUBLICATION':
      return {
        title: 'Gói ngoại tuyến đã cũ',
        description:
          'Lớp học này đã chuyển sang phiên bản nội dung mới. Bạn vẫn có thể xem phần đã tải, nhưng nên cập nhật gói trước khi đồng bộ tiếp. Bài kiểm tra và bài thi online-only sẽ bị khóa cho tới khi cập nhật.',
        actionLabel: 'Tải phiên bản mới',
        assessmentBlockedMessage:
          'Lớp học này đã chuyển sang phiên bản nội dung mới. Hãy vào Lưu trữ ngoại tuyến để cập nhật gói trước khi mở bài kiểm tra hoặc bài thi.',
      };
    case 'LEGACY_PACKAGE':
      return {
        title: 'Cần tải lại gói ngoại tuyến',
        description:
          'Gói hiện tại dùng dữ liệu cũ trước khi hệ thống có publication version. Hãy tải lại một lần để đồng bộ ổn định hơn. Bài kiểm tra và bài thi online-only sẽ bị khóa cho tới khi cập nhật.',
        actionLabel: 'Tải lại gói',
        assessmentBlockedMessage:
          'Gói ngoại tuyến của khóa học này dùng dữ liệu cũ trước publication version. Hãy vào Lưu trữ ngoại tuyến để tải lại gói trước khi mở bài kiểm tra hoặc bài thi.',
      };
    case 'UPDATE_AVAILABLE':
    case 'UNKNOWN':
    default:
      return DEFAULT_COPY;
  }
}
