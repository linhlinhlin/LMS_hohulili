/**
 * Types cho batch video upload feature.
 * Tách riêng để dễ test + reuse trong tree component và modal shell.
 */

export type BatchItemStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'ASSET_CREATING'
  | 'SECTION_CREATING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

export type BatchMode = 'IDLE' | 'PICK' | 'PREVIEW' | 'UPLOADING' | 'COMPLETE';

export type DistributionStrategy = 'EVEN' | 'PREFIX' | 'SINGLE_LESSON';

export type BatchScope = 'CURRENT_LESSON' | 'CURRENT_CHAPTER' | 'ENTIRE_COURSE';

export interface BatchVideoItem {
  /** Local UUID, key cho tracking — không phải sectionId hay assetId */
  id: string;
  file: File;
  /** Lesson đích — có thể đổi qua drag-drop trước khi upload */
  lessonId: string;
  /** Tiêu đề section, default = filename không extension, user editable */
  sectionTitle: string;
  status: BatchItemStatus;
  /** 0-100, chỉ valid khi status === 'UPLOADING' */
  uploadProgress: number;
  /** Set sau khi presigned upload confirm xong */
  attachmentId?: string;
  /** Set sau khi POST /video-assets/from-upload */
  videoAssetId?: string;
  /** Set sau khi POST /lessons/{id}/sections — section đã có trong DB */
  sectionId?: string;
  /** Set khi status === 'FAILED' — message để show trong UI */
  errorMessage?: string;
}

export interface BatchTargetLesson {
  id: string;
  chapterId: string;
  title: string;
  /** orderIndex hiện tại trong chapter, dùng cho distribution sort */
  orderIndex: number;
  /** Số section đã có sẵn trong lesson — dùng để hiển thị "thêm vào X mục có sẵn" */
  existingSectionCount: number;
}

export interface BatchUploadConfig {
  scope: BatchScope;
  strategy: DistributionStrategy;
  /** Mặc định = course đang edit */
  courseId: string;
  /** Lesson hiện tại đang focus, dùng cho scope=CURRENT_LESSON hoặc fallback */
  currentLessonId?: string;
  currentChapterId?: string;
}

export interface BatchAggregateProgress {
  totalCount: number;
  pendingCount: number;
  uploadingCount: number;
  processingCount: number;
  readyCount: number;
  failedCount: number;
}
