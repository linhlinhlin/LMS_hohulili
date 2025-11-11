/**
 * Lesson Types Enum
 * 
 * Defines the different types of lessons available in the learning system.
 */

/**
 * Lesson Type
 * Represents the type of content in a lesson
 */
export enum LessonType {
  /** Video lecture with instructor teaching */
  LECTURE = 'LECTURE',
  
  /** Reading material (text, PDF, articles) */
  READING = 'READING',
  
  /** Quiz or assessment */
  QUIZ = 'QUIZ',
  
  /** Assignment or homework */
  ASSIGNMENT = 'ASSIGNMENT',
  
  /** Hands-on lab or practice exercise */
  LAB = 'LAB'
}

/**
 * File Type
 * Represents the type of file attachment
 */
export enum FileType {
  /** PDF document */
  PDF = 'PDF',
  
  /** Microsoft Word document */
  WORD = 'WORD',
  
  /** Microsoft Excel spreadsheet */
  EXCEL = 'EXCEL',
  
  /** Microsoft PowerPoint presentation */
  POWERPOINT = 'POWERPOINT',
  
  /** Image file (JPG, PNG, GIF, etc.) */
  IMAGE = 'IMAGE',
  
  /** Video file (MP4, AVI, MOV, etc.) */
  VIDEO = 'VIDEO',
  
  /** Audio file (MP3, WAV, OGG, etc.) */
  AUDIO = 'AUDIO',
  
  /** Compressed archive (ZIP, RAR, etc.) */
  ZIP = 'ZIP',
  
  /** Other file types */
  OTHER = 'OTHER'
}

/**
 * Lesson Type Icons
 * Maps lesson types to icon names for UI display
 */
export const LESSON_TYPE_ICONS: Record<LessonType, string> = {
  [LessonType.LECTURE]: 'play-circle',
  [LessonType.READING]: 'book-open',
  [LessonType.QUIZ]: 'clipboard-check',
  [LessonType.ASSIGNMENT]: 'file-text',
  [LessonType.LAB]: 'code'
};

/**
 * Lesson Type Labels
 * Maps lesson types to human-readable labels
 */
export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  [LessonType.LECTURE]: 'Video Lecture',
  [LessonType.READING]: 'Reading',
  [LessonType.QUIZ]: 'Quiz',
  [LessonType.ASSIGNMENT]: 'Assignment',
  [LessonType.LAB]: 'Lab'
};

/**
 * File Type Icons
 * Maps file types to icon names for UI display
 */
export const FILE_TYPE_ICONS: Record<FileType, string> = {
  [FileType.PDF]: 'file-pdf',
  [FileType.WORD]: 'file-word',
  [FileType.EXCEL]: 'file-excel',
  [FileType.POWERPOINT]: 'file-powerpoint',
  [FileType.IMAGE]: 'file-image',
  [FileType.VIDEO]: 'file-video',
  [FileType.AUDIO]: 'file-audio',
  [FileType.ZIP]: 'file-archive',
  [FileType.OTHER]: 'file'
};

/**
 * File Type Colors
 * Maps file types to Tailwind CSS color classes
 */
export const FILE_TYPE_COLORS: Record<FileType, string> = {
  [FileType.PDF]: 'bg-red-100 text-red-800',
  [FileType.WORD]: 'bg-blue-100 text-blue-800',
  [FileType.EXCEL]: 'bg-green-100 text-green-800',
  [FileType.POWERPOINT]: 'bg-orange-100 text-orange-800',
  [FileType.IMAGE]: 'bg-yellow-100 text-yellow-800',
  [FileType.VIDEO]: 'bg-purple-100 text-purple-800',
  [FileType.AUDIO]: 'bg-pink-100 text-pink-800',
  [FileType.ZIP]: 'bg-gray-100 text-gray-800',
  [FileType.OTHER]: 'bg-gray-100 text-gray-800'
};

/**
 * Helper function to determine file type from filename
 */
export function getFileTypeFromFilename(filename: string): FileType {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  // PDF
  if (ext === 'pdf') return FileType.PDF;
  
  // Word
  if (['doc', 'docx'].includes(ext)) return FileType.WORD;
  
  // Excel
  if (['xls', 'xlsx'].includes(ext)) return FileType.EXCEL;
  
  // PowerPoint
  if (['ppt', 'pptx'].includes(ext)) return FileType.POWERPOINT;
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return FileType.IMAGE;
  }
  
  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
    return FileType.VIDEO;
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma', 'm4a'].includes(ext)) {
    return FileType.AUDIO;
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return FileType.ZIP;
  }
  
  return FileType.OTHER;
}

/**
 * Helper function to determine lesson type from title
 */
export function getLessonTypeFromTitle(title: string): LessonType {
  const lower = title.toLowerCase();
  
  if (lower.includes('quiz') || lower.includes('test') || lower.includes('exam')) {
    return LessonType.QUIZ;
  }
  
  if (lower.includes('assignment') || lower.includes('homework') || lower.includes('bài tập')) {
    return LessonType.ASSIGNMENT;
  }
  
  if (lower.includes('lab') || lower.includes('practice') || lower.includes('thực hành')) {
    return LessonType.LAB;
  }
  
  if (lower.includes('reading') || lower.includes('đọc')) {
    return LessonType.READING;
  }
  
  return LessonType.LECTURE;
}
