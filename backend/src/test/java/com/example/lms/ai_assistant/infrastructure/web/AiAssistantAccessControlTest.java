package com.example.lms.ai_assistant.infrastructure.web;

import com.example.lms.ai_assistant.application.dto.SendChatMessageCommand;
import com.example.lms.ai_assistant.application.port.AiChatService;
import com.example.lms.ai_assistant.application.usecase.ChatSessionUseCaseV3;
import com.example.lms.ai_assistant.infrastructure.persistence.ChatMessageJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.JpaCourseRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.learning_delivery.infrastructure.persistence.JpaEnrollmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Access control tests for AiAssistantControllerV3 — verifyCourseAccess checks
 * on askAboutCourse() and explainLesson() endpoints.
 */
@ExtendWith(MockitoExtension.class)
class AiAssistantAccessControlTest {

    @Mock private ChatSessionUseCaseV3 chatSessionUseCase;
    @Mock private ChatMessageJpaRepository chatMessageRepository;
    @Mock private AiChatService aiChatService;
    @Mock private JpaCourseRepository jpaCourseRepository;
    @Mock private JpaEnrollmentRepository jpaEnrollmentRepository;
    @Mock private LessonJpaRepository lessonJpaRepository;
    @Mock private ChapterJpaRepository chapterJpaRepository;

    @InjectMocks
    private AiAssistantControllerV3 controller;

    private UUID courseId;
    private UUID lessonId;
    private UUID chapterId;
    private UUID teacherId;
    private SendChatMessageCommand command;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        chapterId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        command = new SendChatMessageCommand("test question");
    }

    // ==================== askAboutCourse ====================

    @Test
    @DisplayName("askAboutCourse: Từ chối học viên chưa đăng ký khóa học")
    void askAboutCourse_rejectsUnenrolledStudent() {
        UserJpaEntity student = mock(UserJpaEntity.class);
        when(student.getId()).thenReturn(UUID.randomUUID());
        when(student.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);

        CourseJpaEntity course = mock(CourseJpaEntity.class);
        when(course.getTeacherId()).thenReturn(teacherId);
        when(jpaCourseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(jpaEnrollmentRepository.existsByStudentIdAndCourseId(student.getId(), courseId)).thenReturn(false);

        assertThatThrownBy(() -> controller.askAboutCourse(student, courseId, command))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không có quyền truy cập khóa học này");
    }

    @Test
    @DisplayName("askAboutCourse: Cho phép học viên đã đăng ký")
    void askAboutCourse_allowsEnrolledStudent() {
        UserJpaEntity student = mock(UserJpaEntity.class);
        UUID studentId = UUID.randomUUID();
        when(student.getId()).thenReturn(studentId);
        when(student.getRole()).thenReturn(UserJpaEntity.UserRole.STUDENT);
        lenient().when(student.getEmail()).thenReturn("student@test.com");
        lenient().when(student.getDisplayName()).thenReturn("Student");

        CourseJpaEntity course = mock(CourseJpaEntity.class);
        when(course.getTeacherId()).thenReturn(teacherId);
        when(jpaCourseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(jpaEnrollmentRepository.existsByStudentIdAndCourseId(studentId, courseId)).thenReturn(true);

        lenient().when(aiChatService.chat(anyString(), anyString(), anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn(Optional.of("response"));

        assertThatCode(() -> controller.askAboutCourse(student, courseId, command))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("askAboutCourse: Cho phép giảng viên sở hữu khóa học")
    void askAboutCourse_allowsTeacherOwner() {
        UserJpaEntity teacher = mock(UserJpaEntity.class);
        when(teacher.getId()).thenReturn(teacherId);
        when(teacher.getRole()).thenReturn(UserJpaEntity.UserRole.TEACHER);
        lenient().when(teacher.getEmail()).thenReturn("teacher@test.com");
        lenient().when(teacher.getDisplayName()).thenReturn("Teacher");

        CourseJpaEntity course = mock(CourseJpaEntity.class);
        when(course.getTeacherId()).thenReturn(teacherId);
        when(jpaCourseRepository.findById(courseId)).thenReturn(Optional.of(course));

        lenient().when(aiChatService.chat(anyString(), anyString(), anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn(Optional.of("response"));

        assertThatCode(() -> controller.askAboutCourse(teacher, courseId, command))
                .doesNotThrowAnyException();
    }

    // ==================== explainLesson ====================

    @Test
    @DisplayName("explainLesson: Admin bỏ qua tất cả kiểm tra quyền truy cập")
    void explainLesson_allowsAdmin() {
        UserJpaEntity admin = mock(UserJpaEntity.class);
        when(admin.getId()).thenReturn(UUID.randomUUID());
        when(admin.getRole()).thenReturn(UserJpaEntity.UserRole.ADMIN);
        lenient().when(admin.getEmail()).thenReturn("admin@test.com");
        lenient().when(admin.getDisplayName()).thenReturn("Admin");

        LessonJpaEntity lesson = mock(LessonJpaEntity.class);
        when(lesson.getChapterId()).thenReturn(chapterId);
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));

        ChapterJpaEntity chapter = mock(ChapterJpaEntity.class);
        when(chapter.getCourseId()).thenReturn(courseId);
        when(chapterJpaRepository.findById(chapterId)).thenReturn(Optional.of(chapter));

        lenient().when(aiChatService.chat(anyString(), anyString(), anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn(Optional.of("response"));

        assertThatCode(() -> controller.explainLesson(admin, lessonId, command))
                .doesNotThrowAnyException();

        // Verify no course/enrollment lookups were needed (admin bypass)
        verify(jpaCourseRepository, never()).findById(any());
        verify(jpaEnrollmentRepository, never()).existsByStudentIdAndCourseId(any(), any());
    }
}
