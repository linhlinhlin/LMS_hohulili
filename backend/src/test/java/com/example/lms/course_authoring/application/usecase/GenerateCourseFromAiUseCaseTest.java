package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.domain.repository.LessonRepositoryPort;
import com.example.lms.shared.domain.model.ContentBlock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GenerateCourseFromAiUseCase Tests")
class GenerateCourseFromAiUseCaseTest {

    @Mock
    private CourseAuthoringUseCase courseAuthoringUseCase;

    @Mock
    private ChapterRepositoryPort chapterRepository;

    @Mock
    private CreateChapterUseCaseV3 createChapterUseCase;

    @Mock
    private CreateLessonUseCaseV3 createLessonUseCase;

    @Mock
    private LessonRepositoryPort lessonRepository;

    @InjectMocks
    private GenerateCourseFromAiUseCase useCase;

    @Test
    @DisplayName("Should reuse existing chapter when orderIndex already exists")
    void shouldReuseExistingChapterWhenOrderIndexAlreadyExists() {
        UUID courseId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID existingChapterId = UUID.randomUUID();

        when(chapterRepository.findIdByCourseIdAndOrderIndex(courseId, 1))
                .thenReturn(Optional.of(existingChapterId));

        var request = new GenerateCourseFromAiUseCase.ChapterContentRequest(
                teacherId,
                "Chuong 2",
                "Mo ta",
                1,
                List.of(
                        new GenerateCourseFromAiUseCase.LessonRequest(
                                "Bai 1",
                                "Mo ta bai",
                                "LECTURE",
                                0,
                                30,
                                false,
                                List.of(
                                        new GenerateCourseFromAiUseCase.SectionRequest("Muc 1", "TEXT", "<p>A</p>", 0),
                                        new GenerateCourseFromAiUseCase.SectionRequest("Muc 2", "TEXT", "<p>B</p>", 1)
                                )
                        )
                )
        );

        var result = useCase.pushChapter(courseId, request);

        assertThat(result.chapterId()).isEqualTo(existingChapterId);
        assertThat(result.orderIndex()).isEqualTo(1);
        assertThat(result.lessonCount()).isEqualTo(1);
        assertThat(result.sectionCount()).isEqualTo(2);
        assertThat(result.status()).isEqualTo("ALREADY_EXISTS");

        verify(createChapterUseCase, never()).execute(any());
        verify(createLessonUseCase, never()).execute(any());
        verify(lessonRepository, never()).saveContentBlocks(any(), any());
    }

    @Test
    @DisplayName("Should persist AI section content under content key and keep quiz placeholder metadata structured")
    void shouldPersistAiSectionContentUnderContentKey() {
        UUID courseId = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        UUID chapterId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();

        when(chapterRepository.findIdByCourseIdAndOrderIndex(courseId, 0))
                .thenReturn(Optional.empty());
        when(createChapterUseCase.execute(any())).thenReturn(chapterId);
        when(createLessonUseCase.execute(any())).thenReturn(lessonId);

        var request = new GenerateCourseFromAiUseCase.ChapterContentRequest(
                teacherId,
                "Chuong 1",
                "Mo ta",
                0,
                List.of(
                        new GenerateCourseFromAiUseCase.LessonRequest(
                                "Bai 1",
                                "Mo ta bai",
                                "LECTURE",
                                0,
                                25,
                                false,
                                List.of(
                                        new GenerateCourseFromAiUseCase.SectionRequest(
                                                "Gioi thieu",
                                                "TEXT",
                                                "<p>Noi dung bai giang</p>",
                                                0
                                        ),
                                        new GenerateCourseFromAiUseCase.SectionRequest(
                                                "Quiz goi y",
                                                "QUIZ_PLACEHOLDER",
                                                "Hay tao bai kiem tra ngan sau khi hoc xong bai nay.",
                                                1
                                        )
                                )
                        )
                )
        );

        var result = useCase.pushChapter(courseId, request);

        assertThat(result.status()).isEqualTo("SUCCESS");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ContentBlock>> blocksCaptor = ArgumentCaptor.forClass(List.class);
        verify(lessonRepository).saveContentBlocks(any(), blocksCaptor.capture());

        List<ContentBlock> blocks = blocksCaptor.getValue();
        assertThat(blocks).hasSize(2);

        Map<String, Object> textData = blocks.get(0).getData();
        assertThat(textData).containsEntry("content", "<p>Noi dung bai giang</p>");
        assertThat(textData).doesNotContainKey("html");

        Map<String, Object> placeholderData = blocks.get(1).getData();
        assertThat(placeholderData).containsEntry("kind", "QUIZ_PLACEHOLDER");
        assertThat(placeholderData).containsEntry("isQuizPlaceholder", true);
        assertThat(placeholderData).containsEntry("message", "Hay tao bai kiem tra ngan sau khi hoc xong bai nay.");
        assertThat(placeholderData).containsEntry("ctaLabel", "Giang vien tao quiz rieng tai day");
        assertThat(placeholderData).containsKey("content");
        assertThat(placeholderData).doesNotContainKey("html");
        assertThat(String.valueOf(placeholderData.get("content"))).contains("quiz-placeholder");
    }
}
