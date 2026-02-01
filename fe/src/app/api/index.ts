// API Client
export { ApiClient } from './client/api-client';
export { CourseApi } from './client/course.api';
export { SectionApi } from './client/section.api';
export { LessonApi } from './client/lesson.api';
export { UploadApi } from './client/upload.api';

// Endpoints
export { AUTH_ENDPOINTS } from './endpoints/auth.endpoints';
export { QUIZ_ENDPOINTS } from './endpoints/quiz.endpoints';
export { COURSE_ENDPOINTS } from './endpoints/course.endpoints';
export { SECTION_ENDPOINTS } from './endpoints/section.endpoints';
export { LESSON_ENDPOINTS } from './endpoints/lesson.endpoints';
export { UPLOAD_ENDPOINTS } from './endpoints/upload.endpoints';
export { ALLOCATION_ENDPOINTS } from './endpoints/allocation.endpoints';
export { FILE_ENDPOINTS } from './endpoints/file.endpoints';
export { STUDENT_ENDPOINTS } from './endpoints/student.endpoints';
export { VIDEO_PROGRESS_ENDPOINTS } from './endpoints/video-progress.endpoints';

// Types - Primary exports
export * from './types/common.types';
export * from './types/auth.types';
export * from './types/course.types';

// Types - New standardized types (selective exports to avoid conflicts)
export type {
    User,
    UserSummary,
    UserProfile,
    UserRole,
    AccountStatus,
    AuthProvider,
    CreateUserRequest,
    UpdateUserRequest,
    UpdateUserStatusRequest,
    UserSearchResult
} from './types/user.types';

export type {
    QuestionPackage,
    Question,
    QuestionOption,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    QuestionDifficulty,
    QuestionStatus,
    QuizType,
    QuizStatus,
    QuestionType,
    AttemptStatus,
    PackageVisibility,
    CreateQuizRequest,
    CreateQuestionRequest,
    CreateQuestionOptionRequest,
    SubmitQuizRequest,
    QuizSummary,
    QuizAttemptResult,
    QuestionSummary
} from './types/quiz.types';

export type {
    LearningClass,
    ClassCourse,
    Enrollment,
    EnrollmentStatus,
    ClassStatus,
    ClassSummary as LearningClassSummary,
    EnrollmentSummary,
    EnrolledCourse,
    CreateClassRequest,
    EnrollStudentRequest as EnrollStudentToClassRequest,
    BulkEnrollRequest,
    EnrollmentResult
} from './types/enrollment.types';

export type {
    Payment,
    PaymentStatus,
    PriceType,
    PaymentSummary,
    PaymentHistory,
    RevenueSummary,
    RevenueHistory,
    PayoutRequest,
    CreatePaymentRequest,
    ConfirmPaymentRequest,
    RequestPayoutRequest,
    PaymentInitResponse,
    PaymentVerifyResponse
} from './types/payment.types';

// Chapter types - export types that don't conflict with course.types
export type {
    Chapter,
    ChapterWithLessons,
    LessonType,
    Lesson,
    LessonDetail as LessonFullDetail,
    Section,
    SectionType,
    LessonAttachment as LessonFileAttachment,
    CreateChapterRequest as CreateChapterPayload,
    UpdateChapterRequest as UpdateChapterPayload,
    CreateLessonRequest as CreateLessonPayload,
    UpdateLessonRequest as UpdateLessonPayload,
    CreateSectionRequest,
    UpdateSectionRequest,
    ReorderRequest
} from './types/chapter.types';

// Interceptors
export { authInterceptor } from './interceptors/auth.interceptor';
