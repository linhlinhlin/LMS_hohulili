export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  level: CourseLevel;
  duration: string;
  students: number;
  rating: number;
  reviews: number;
  price: number;
  originalPrice?: number;
  instructor: {
    name: string;
    title: string;
    avatar: string;
    credentials: string[];
  };
  thumbnail: string;
  category: string;
  tags: string[];
  skills: string[];
  prerequisites: string[];
  certificate: {
    type: 'STCW' | 'IMO' | 'Professional' | 'Completion';
    description: string;
  };
  curriculum: {
    modules: number;
    lessons: number;
    duration: string;
  };
  isPopular?: boolean;
  isNew?: boolean;
  isFree?: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  icon: string;
  color: string;
  heroImage: string;
  stats: {
    courses: number;
    students: number;
    instructors: number;
    certificates: number;
  };
  learningPath: {
    beginner: Course[];
    intermediate: Course[];
    advanced: Course[];
  };
  careerOpportunities: {
    title: string;
    description: string;
    salary: string;
    requirements: string[];
  }[];
  industryTrends: {
    title: string;
    description: string;
    growth: string;
  }[];
}

export interface CourseFilter {
  level: string[];
  duration: string[];
  price: string[];
  certificate: string[];
  instructor: string[];
}

// Course Category as enum for runtime values
export enum CourseCategory {
  MARINE_ENGINEERING = 'engineering',
  PORT_MANAGEMENT = 'logistics', 
  MARITIME_SAFETY = 'safety',
  NAVIGATION = 'navigation',
  CARGO_HANDLING = 'logistics',
  MARITIME_LAW = 'law',
  CERTIFICATES = 'certificates'
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

// Labels for displaying in Vietnamese
export const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao'
};

export interface Lesson {
  id: string;
  courseId: string; // Added for compatibility
  title: string;
  duration: number;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  isCompleted: boolean;
}

export interface CourseProgress {
  id: string;
  courseId: string;
  userId: string; // Added for compatibility
  completedLessons: string[];
  totalLessons: number;
  progressPercentage: number;
  lastAccessed: Date;
}

export type SortOrder = 'asc' | 'desc';

// Updated FilterOptions to match actual usage in components
export interface FilterOptions {
  search?: string;
  category?: CourseCategory;
  level?: CourseLevel;
  priceRange?: { min: number; max: number };
  rating?: number;
  sortBy?: keyof Course;
  sortOrder?: SortOrder;
}

// Extended Course interface for backward compatibility
export interface ExtendedCourse extends Course {
  studentsCount: number;
  lessonsCount: number;
  isPublished: boolean;
  isEnrolled?: boolean; // Whether current user is enrolled in this course
  instructor: {
    id: string;
    name: string;
    title: string;
    avatar: string;
    credentials: string[];
    experience: number;
    rating: number;
    studentsCount: number;
  };
}

// Course Review interface
export interface CourseReview {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string; // e.g., "Thuyền trưởng", "Sinh viên", "Kỹ sư"
  rating: number;
  comment: string;
  createdAt: Date;
  helpful: number;
  isVerified: boolean; // Verified purchase/enrollment
}

// FAQ interface
export interface FAQ {
  id: string;
  courseId: string;
  question: string;
  answer: string;
  order: number;
  category: 'general' | 'enrollment' | 'certificate' | 'technical';
}

// Course Module interface
export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  duration: number; // in minutes
  isCompleted: boolean;
}

// Enhanced Lesson interface
export interface EnhancedLesson extends Lesson {
  moduleId: string;
  description: string;
  videoUrl?: string;
  resources: CourseResource[];
  isPreview: boolean; // Can be viewed without enrollment
}

// Course Resource interface
export interface CourseResource {
  id: string;
  lessonId: string;
  title: string;
  type: 'pdf' | 'video' | 'audio' | 'document' | 'link';
  url: string;
  size?: number; // in bytes
  downloadCount: number;
}

// Course Enrollment interface
export interface CourseEnrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: Date;
  progress: CourseProgress;
  certificate?: CourseCertificate;
  isActive: boolean;
}

// Unified Enrolled Course interface for UI components
export interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  instructor: string | {
    id: string;
    name: string;
    title: string;
    avatar: string;
    credentials: string[];
    experience: number;
    rating: number;
    studentsCount: number;
  };
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  lastAccessed: string | Date;
  status: 'enrolled' | 'in-progress' | 'completed' | 'not-started' | 'paused';
  category?: string;
  rating?: number;
  deadline?: string;
  // Enhanced features
  currentLesson?: string;
  nextLesson?: string;
  studyTime?: number; // in minutes
  averageScore?: number;
  notesCount?: number;
  bookmarksCount?: number;
  isFavorite?: boolean;
  lastLessonCompleted?: string;
  upcomingDeadlines?: Date[];
  certificateAvailable?: boolean;
  certificate?: boolean;
  certificateInfo?: {
    id: string;
    issuedAt: Date;
    certificateUrl: string;
  };
  enrolledAt?: Date;
  studyStreak?: number; // days
  level?: string;
  students?: number;
  reviews?: number;
  price?: number;
  tags?: string[];
  skills?: string[];
  prerequisites?: string[];
  curriculum?: {
    modules: number;
    lessons: number;
    duration: string;
  };
  studentsCount?: number;
  lessonsCount?: number;
  isPublished?: boolean;
}

// Course Certificate interface
export interface CourseCertificate {
  id: string;
  enrollmentId: string;
  issuedAt: Date;
  certificateUrl: string;
  certificateNumber: string;
  isValid: boolean;
  expiryDate?: Date;
}

// Related Course interface
export interface RelatedCourse {
  id: string;
  title: string;
  thumbnail: string;
  level: CourseLevel;
  duration: string;
  rating: number;
  studentsCount: number;
  price: number;
  category: string;
  similarity: number; // 0-1, how similar to current course
}

// Course Detail State interface
export interface CourseDetailState {
  course: ExtendedCourse | null;
  relatedCourses: RelatedCourse[];
  reviews: CourseReview[];
  faq: FAQ[];
  modules: CourseModule[];
  enrollment: CourseEnrollment | null;
  isLoading: boolean;
  error: string | null;
}