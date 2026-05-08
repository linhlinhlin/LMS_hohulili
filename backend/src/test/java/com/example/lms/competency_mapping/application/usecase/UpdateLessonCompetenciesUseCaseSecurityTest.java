package com.example.lms.competency_mapping.application.usecase;

import com.example.lms.competency_mapping.application.dto.UpdateLessonCompetenciesCommand;
import com.example.lms.competency_mapping.application.port.LessonQueryPort;
import com.example.lms.competency_mapping.domain.repository.LessonCompetencyMappingRepository;
import com.example.lms.competency_mapping.domain.repository.StandardCompetencyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpdateLessonCompetenciesUseCaseSecurityTest {

    @Mock private LessonCompetencyMappingRepository mappingRepository;
    @Mock private LessonQueryPort lessonQueryPort;
    @Mock private StandardCompetencyRepository competencyRepository;

    private UpdateLessonCompetenciesUseCase useCase;
    private UUID lessonId;
    private UUID courseId;
    private UUID teacherId;

    @BeforeEach
    void setUp() {
        useCase = new UpdateLessonCompetenciesUseCase(
                mappingRepository,
                lessonQueryPort,
                competencyRepository
        );
        lessonId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
    }

    @Test
    @DisplayName("update: assigned teacher can update competency mappings")
    void update_assignedTeacherCanUpdate() {
        when(lessonQueryPort.findById(lessonId)).thenReturn(lessonInfo());
        when(lessonQueryPort.canTeachLesson(lessonId, teacherId)).thenReturn(true);
        when(mappingRepository.findByLessonId(lessonId)).thenReturn(List.of());

        assertThatCode(() -> useCase.execute(
                lessonId,
                teacherId,
                false,
                new UpdateLessonCompetenciesCommand(List.of(), null)
        )).doesNotThrowAnyException();

        verify(mappingRepository).findByLessonId(lessonId);
    }

    @Test
    @DisplayName("update: unrelated teacher is rejected before mutating mappings")
    void update_unrelatedTeacherRejectedBeforeMutation() {
        when(lessonQueryPort.findById(lessonId)).thenReturn(lessonInfo());
        when(lessonQueryPort.canTeachLesson(lessonId, teacherId)).thenReturn(false);

        assertThatThrownBy(() -> useCase.execute(
                lessonId,
                teacherId,
                false,
                new UpdateLessonCompetenciesCommand(List.of(), null)
        )).isInstanceOf(AccessDeniedException.class);

        verify(mappingRepository, never()).findByLessonId(lessonId);
        verify(mappingRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    private LessonQueryPort.LessonInfo lessonInfo() {
        return new LessonQueryPort.LessonInfo(
                lessonId,
                "Bài học thử nghiệm",
                "Chương thử nghiệm",
                UUID.randomUUID(),
                courseId
        );
    }
}
