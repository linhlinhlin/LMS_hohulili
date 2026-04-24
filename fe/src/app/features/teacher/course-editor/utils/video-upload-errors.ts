/**
 * Categorized upload/processing error copy for the video pipeline.
 *
 * Maps HTTP status + message patterns into a stable taxonomy so the UI can
 * render a consistent error card with a specific recovery hint, instead of
 * piping raw exception strings to end users.
 */

export type UploadErrorCategory =
  | 'auth'
  | 'size'
  | 'format'
  | 'network'
  | 'canceled'
  | 'transcode'
  | 'server'
  | 'unknown';

export interface UploadErrorInfo {
  category: UploadErrorCategory;
  title: string;
  hint: string;
  canRetry: boolean;
}

export function classifyUploadError(err: any): UploadErrorInfo {
  const status: number | undefined = err?.status ?? err?.error?.status;
  const message: string = (err?.message || err?.error?.message || '').toString();

  if (err?.name === 'AbortError' || /cancel/i.test(message)) {
    return {
      category: 'canceled',
      title: 'Đã hủy tải lên',
      hint: 'Bạn có thể chọn lại video để bắt đầu.',
      canRetry: true,
    };
  }

  if (status === 401 || status === 403) {
    return {
      category: 'auth',
      title: 'Không có quyền tải video',
      hint: 'Phiên đăng nhập có thể đã hết hạn. Hãy đăng nhập lại rồi thử tiếp.',
      canRetry: true,
    };
  }

  if (status === 413 || /too\s*large|file\s*size/i.test(message)) {
    return {
      category: 'size',
      title: 'File video quá lớn',
      hint: 'Giới hạn tối đa 5 GB. Hãy nén video (H.264, 1080p, 8 Mbps) rồi thử lại.',
      canRetry: true,
    };
  }

  if (status === 415 || /codec|format|unsupported/i.test(message)) {
    return {
      category: 'format',
      title: 'Định dạng không được hỗ trợ',
      hint: 'Chuyển sang MP4 (H.264 + AAC) để đảm bảo tương thích tốt nhất.',
      canRetry: true,
    };
  }

  if (status === 0 || err?.name === 'NetworkError' || /network|offline|timeout|fetch/i.test(message)) {
    return {
      category: 'network',
      title: 'Mất kết nối trong lúc tải',
      hint: 'Kiểm tra kết nối mạng và thử lại. Upload sẽ tiếp tục từ đầu.',
      canRetry: true,
    };
  }

  if (status && status >= 500) {
    return {
      category: 'server',
      title: 'Lỗi máy chủ',
      hint: 'Máy chủ tạm thời không xử lý được. Vui lòng thử lại sau vài phút.',
      canRetry: true,
    };
  }

  return {
    category: 'unknown',
    title: 'Tải video thất bại',
    hint: message || 'Đã xảy ra lỗi không xác định. Hãy thử lại.',
    canRetry: true,
  };
}

export function classifyTranscodeError(assetErrorMessage: string | null | undefined): UploadErrorInfo {
  const msg = (assetErrorMessage || '').toLowerCase();
  if (/codec|container|format|unsupported/.test(msg)) {
    return {
      category: 'format',
      title: 'Xử lý video thất bại — định dạng không tương thích',
      hint: 'Video có codec không được hỗ trợ. Hãy chuyển sang MP4 (H.264 + AAC) và thử lại.',
      canRetry: true,
    };
  }
  if (/timeout|network|fetch/.test(msg)) {
    return {
      category: 'network',
      title: 'Xử lý video bị gián đoạn',
      hint: 'Kết nối tới dịch vụ streaming tạm thời không ổn định. Nhấn "Thử lại" để tiếp tục.',
      canRetry: true,
    };
  }
  return {
    category: 'transcode',
    title: 'Xử lý video thất bại',
    hint: assetErrorMessage || 'Máy chủ không hoàn tất được việc tối ưu video. Bạn có thể thử lại hoặc chọn video khác.',
    canRetry: true,
  };
}
