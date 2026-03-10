package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.application.port.CourseStructureCommandPort;
import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.LessonJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseStructureCommandAdapter Tests")
class CourseStructureCommandAdapterTest {

    @Mock
    private ChapterJpaRepository chapterJpaRepository;

    @Mock
    private LessonJpaRepository lessonJpaRepository;

    @InjectMocks
    private CourseStructureCommandAdapter adapter;

    @Test
    @DisplayName("Should move lesson to another chapter without recreating it")
    void shouldMoveLessonToAnotherChapterWithoutRecreatingIt() {
        UUID courseId = UUID.randomUUID();
        UUID sourceChapterId = UUID.randomUUID();
        UUID targetChapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();

        ChapterJpaEntity targetChapter = ChapterJpaEntity.builder()
                .id(targetChapterId)
                .courseId(courseId)
                .title("Target")
                .orderIndex(1)
                .build();

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(sourceChapterId)
                .title("Quiz shell")
                .description("Existing description")
                .type(LessonJpaEntity.LessonType.QUIZ)
                .orderIndex(2)
                .build();

        LessonJpaEntity sourceRemainingLesson = LessonJpaEntity.builder()
                .id(UUID.randomUUID())
                .chapterId(sourceChapterId)
                .title("Source lesson")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .orderIndex(0)
                .build();

        LessonJpaEntity targetExistingLesson = LessonJpaEntity.builder()
                .id(UUID.randomUUID())
                .chapterId(targetChapterId)
                .title("Target lesson")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .orderIndex(0)
                .build();

        when(chapterJpaRepository.findById(targetChapterId)).thenReturn(Optional.of(targetChapter));
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonJpaRepository.countByChapterId(targetChapterId)).thenReturn(1L);
        when(lessonJpaRepository.save(any(LessonJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(lessonJpaRepository.findByChapterIdOrderByOrderIndex(sourceChapterId))
                .thenReturn(List.of(sourceRemainingLesson));
        when(lessonJpaRepository.findByChapterIdOrderByOrderIndex(targetChapterId))
                .thenReturn(List.of(targetExistingLesson, lesson));

        CourseStructureCommandPort.LessonSnapshot snapshot = adapter.updateLesson(
                courseId,
                targetChapterId,
                lessonId,
                new CourseStructureCommandPort.LessonUpdateData(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        );

        assertThat(snapshot.id()).isEqualTo(lessonId);
        assertThat(snapshot.lessonType()).isEqualTo("QUIZ");
        assertThat(lesson.getChapterId()).isEqualTo(targetChapterId);
        assertThat(lesson.getOrderIndex()).isEqualTo(1);
        assertThat(sourceRemainingLesson.getOrderIndex()).isZero();
        assertThat(targetExistingLesson.getOrderIndex()).isZero();

        verify(lessonJpaRepository).save(lesson);
        verify(lessonJpaRepository).saveAll(List.of(sourceRemainingLesson));
        verify(lessonJpaRepository).saveAll(List.of(targetExistingLesson, lesson));
    }

    @Test
    @DisplayName("Should preserve description when request omits it")
    void shouldPreserveDescriptionWhenRequestOmitsIt() {
        UUID courseId = UUID.randomUUID();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();

        ChapterJpaEntity chapter = ChapterJpaEntity.builder()
                .id(chapterId)
                .courseId(courseId)
                .title("Chapter")
                .orderIndex(0)
                .build();

        LessonJpaEntity lesson = LessonJpaEntity.builder()
                .id(lessonId)
                .chapterId(chapterId)
                .title("Original title")
                .description("Keep me")
                .type(LessonJpaEntity.LessonType.LECTURE)
                .orderIndex(0)
                .build();

        when(chapterJpaRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        when(lessonJpaRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonJpaRepository.save(any(LessonJpaEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CourseStructureCommandPort.LessonSnapshot snapshot = adapter.updateLesson(
                courseId,
                chapterId,
                lessonId,
                new CourseStructureCommandPort.LessonUpdateData(
                        "Renamed lesson",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        );

        assertThat(snapshot.title()).isEqualTo("Renamed lesson");
        assertThat(lesson.getDescription()).isEqualTo("Keep me");
    }
}
