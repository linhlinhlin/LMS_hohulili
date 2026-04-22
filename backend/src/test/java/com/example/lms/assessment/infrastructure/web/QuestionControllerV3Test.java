package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.usecase.CreateQuestionUseCaseV3;
import com.example.lms.assessment.application.usecase.UpdateQuestionUseCaseV3;
import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionBankRepository;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.domain.model.ContentBlock;
import com.example.lms.shared.infrastructure.persistence.entity.FileAttachmentJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.FileAttachmentJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QuestionControllerV3 Tests")
class QuestionControllerV3Test {

    @Mock private CreateQuestionUseCaseV3 createQuestionUseCase;
    @Mock private UpdateQuestionUseCaseV3 updateQuestionUseCase;
    @Mock private QuestionRepository questionRepository;
    @Mock private QuestionBankRepository questionBankRepository;
    @Mock private QuestionJpaRepository questionJpaRepository;
    @Mock private FileAttachmentJpaRepository fileAttachmentJpaRepository;

    @InjectMocks
    private QuestionControllerV3 controller;

    @Test
    @DisplayName("getQuestionById should normalize image UUIDs to file URLs for stem and options")
    void getQuestionByIdShouldNormalizeImageUuidsToFileUrls() {
        UUID teacherId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        UUID stemImageId = UUID.randomUUID();
        UUID optionImageId = UUID.randomUUID();

        UserJpaEntity teacher = new UserJpaEntity();
        teacher.setId(teacherId);
        teacher.setRole(UserJpaEntity.UserRole.TEACHER);
        teacher.setEmail("teacher@maritime.edu");

        ContentBlock stemText = ContentBlock.of("stem-1", "paragraph", Map.of("text", "Question stem"));
        ContentBlock stemImage = ContentBlock.of("stem-2", "image", Map.of(
                "url", stemImageId.toString(),
                "file", Map.of("url", stemImageId.toString(), "id", stemImageId.toString()),
                "caption", ""
        ));

        ContentBlock optionText = ContentBlock.of("opt-1", "text", Map.of("html", "Option A"));
        ContentBlock optionImage = ContentBlock.of("opt-2", "image", Map.of(
                "url", optionImageId.toString(),
                "file", Map.of("url", optionImageId.toString()),
                "caption", ""
        ));

        Question question = Question.builder()
                .id(questionId)
                .createdBy(teacherId)
                .contentBlocks(List.of(stemText, stemImage))
                .difficulty(Question.Difficulty.MEDIUM)
                .status(Question.Status.ACTIVE)
                .questionType(Question.QuestionType.SINGLE_CHOICE)
                .correctOption("A")
                .tags("media")
                .createdAt(Instant.now())
                .options(List.of(
                        Question.QuestionOption.builder()
                                .id(UUID.randomUUID())
                                .key("A")
                                .orderIndex(0)
                                .contentBlocks(List.of(optionText, optionImage))
                                .build()
                ))
                .build();

        FileAttachmentJpaEntity stemAttachment = FileAttachmentJpaEntity.builder()
                .id(stemImageId)
                .fileUrl("http://localhost:8088/uploads/question-images/stem.png")
                .fileName("question-images/stem.png")
                .originalName("stem.png")
                .fileCategory("editor-image")
                .contentType("image/png")
                .fileSize(1L)
                .uploadedBy(teacherId)
                .build();

        FileAttachmentJpaEntity optionAttachment = FileAttachmentJpaEntity.builder()
                .id(optionImageId)
                .fileUrl("http://localhost:8088/uploads/question-images/option.png")
                .fileName("question-images/option.png")
                .originalName("option.png")
                .fileCategory("editor-image")
                .contentType("image/png")
                .fileSize(1L)
                .uploadedBy(teacherId)
                .build();

        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(fileAttachmentJpaRepository.findById(stemImageId)).thenReturn(Optional.of(stemAttachment));
        when(fileAttachmentJpaRepository.findById(optionImageId)).thenReturn(Optional.of(optionAttachment));

        var response = controller.getQuestionById(questionId, teacher);

        assertThat(response.getBody()).isNotNull();
        var detail = response.getBody().getData();
        assertThat(detail.contentBlocks()).hasSize(2);
        assertThat(detail.contentBlocks().get(1).getData().get("url"))
                .isEqualTo("http://localhost:8088/uploads/question-images/stem.png");
        assertThat(((Map<?, ?>) detail.contentBlocks().get(1).getData().get("file")).get("url"))
                .isEqualTo("http://localhost:8088/uploads/question-images/stem.png");

        assertThat(detail.options()).hasSize(1);
        assertThat(detail.options().get(0).contentBlocks()).hasSize(2);
        assertThat(detail.options().get(0).contentBlocks().get(1).getData().get("url"))
                .isEqualTo("http://localhost:8088/uploads/question-images/option.png");
        assertThat(detail.options().get(0).content())
                .isEqualTo("Option A [Hình ảnh]");
    }
}
