package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningEvent;
import com.example.lms.learning_delivery.domain.model.VideoProgress;
import com.example.lms.learning_delivery.domain.repository.LearningEventRepository;
import com.example.lms.learning_delivery.domain.repository.VideoProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrackVideoProgressUseCaseTest {

    @Mock private VideoProgressRepository videoProgressRepository;
    @Mock private LearningEventRepository learningEventRepository;

    private TrackVideoProgressUseCase useCase;

    private final UUID studentId = UUID.randomUUID();
    private final UUID lessonId = UUID.randomUUID();
    private final String sectionId = "section-1";

    @BeforeEach
    void setUp() {
        useCase = new TrackVideoProgressUseCase(videoProgressRepository, learningEventRepository);
    }

    @Test
    @DisplayName("trackSegments creates new progress when none exists")
    void trackSegmentsCreatesNew() {
        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.empty());
        when(videoProgressRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        var result = useCase.trackSegments(studentId, lessonId, sectionId, 100, 0, 30, 30.0, null);

        assertThat(result.watchedSeconds()).isEqualTo(30);
        assertThat(result.progressPercent()).isEqualTo(30.0);
        assertThat(result.completed()).isFalse();
        verify(videoProgressRepository).save(any());
    }

    @Test
    @DisplayName("trackSegments accumulates on existing progress")
    void trackSegmentsAccumulates() {
        VideoProgress existing = VideoProgress.create(studentId, lessonId, sectionId, 100);
        existing.markWatched(0, 30);

        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.of(existing));
        when(videoProgressRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        var result = useCase.trackSegments(studentId, lessonId, sectionId, 100, 30, 60, 60.0, null);

        assertThat(result.watchedSeconds()).isEqualTo(60);
        assertThat(result.progressPercent()).isEqualTo(60.0);
    }

    @Test
    @DisplayName("trackSegments logs COMPLETE event when threshold reached")
    void trackSegmentsLogsCompletionEvent() {
        VideoProgress existing = VideoProgress.create(studentId, lessonId, sectionId, 100);
        existing.markWatched(0, 89);

        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.of(existing));
        when(videoProgressRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));
        when(learningEventRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        var result = useCase.trackSegments(studentId, lessonId, sectionId, 100, 89, 95, 95.0, null);

        assertThat(result.completed()).isTrue();

        ArgumentCaptor<LearningEvent> eventCaptor = ArgumentCaptor.forClass(LearningEvent.class);
        verify(learningEventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo(LearningEvent.EventType.COMPLETE);
    }

    @Test
    @DisplayName("trackSegments does NOT log event when under threshold")
    void trackSegmentsNoEventWhenUnderThreshold() {
        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.empty());
        when(videoProgressRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        useCase.trackSegments(studentId, lessonId, sectionId, 100, 0, 30, 30.0, null);

        verify(learningEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("getProgress returns empty DTO for unknown section")
    void getProgressReturnsEmptyForUnknown() {
        when(videoProgressRepository.findByStudentAndSection(studentId, "unknown"))
                .thenReturn(Optional.empty());

        var result = useCase.getProgress(studentId, "unknown");

        assertThat(result.sectionId()).isEqualTo("unknown");
        assertThat(result.watchedSeconds()).isZero();
        assertThat(result.progressPercent()).isZero();
    }

    @Test
    @DisplayName("getProgress returns existing progress")
    void getProgressReturnsExisting() {
        VideoProgress vp = VideoProgress.create(studentId, lessonId, sectionId, 100);
        vp.markWatched(0, 50);

        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.of(vp));

        var result = useCase.getProgress(studentId, sectionId);

        assertThat(result.watchedSeconds()).isEqualTo(50);
        assertThat(result.progressPercent()).isEqualTo(50.0);
    }

    @Test
    @DisplayName("canProceed returns false when under default threshold (50%)")
    void canProceedFalseUnderThreshold() {
        VideoProgress vp = VideoProgress.create(studentId, lessonId, sectionId, 100);
        vp.markWatched(0, 30);

        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.of(vp));

        assertThat(useCase.canProceed(studentId, sectionId)).isFalse();
    }

    @Test
    @DisplayName("canProceed returns true when at default threshold (50%)")
    void canProceedTrueAtThreshold() {
        VideoProgress vp = VideoProgress.create(studentId, lessonId, sectionId, 100);
        vp.markWatched(0, 50);

        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.of(vp));

        assertThat(useCase.canProceed(studentId, sectionId)).isTrue();
    }

    @Test
    @DisplayName("canProceed returns false for unknown section")
    void canProceedFalseForUnknown() {
        when(videoProgressRepository.findByStudentAndSection(studentId, "unknown"))
                .thenReturn(Optional.empty());

        assertThat(useCase.canProceed(studentId, "unknown")).isFalse();
    }

    @Test
    @DisplayName("getResumePosition returns 0 for unknown section")
    void getResumePositionZeroForUnknown() {
        when(videoProgressRepository.findByStudentAndSection(studentId, "unknown"))
                .thenReturn(Optional.empty());

        assertThat(useCase.getResumePosition(studentId, "unknown")).isZero();
    }

    @Test
    @DisplayName("getResumePosition returns last position")
    void getResumePositionReturnsLastPosition() {
        VideoProgress vp = VideoProgress.create(studentId, lessonId, sectionId, 100);
        vp.markWatched(0, 50);
        vp.updateLastPosition(45.5);

        when(videoProgressRepository.findByStudentAndSection(studentId, sectionId))
                .thenReturn(Optional.of(vp));

        assertThat(useCase.getResumePosition(studentId, sectionId)).isEqualTo(45.5);
    }

    @Test
    @DisplayName("getLessonProgress returns all sections for a lesson")
    void getLessonProgressReturnsAllSections() {
        VideoProgress vp1 = VideoProgress.create(studentId, lessonId, "s1", 100);
        vp1.markWatched(0, 50);
        VideoProgress vp2 = VideoProgress.create(studentId, lessonId, "s2", 200);
        vp2.markWatched(0, 100);

        when(videoProgressRepository.findByStudentAndLesson(studentId, lessonId))
                .thenReturn(List.of(vp1, vp2));

        var results = useCase.getLessonProgress(studentId, lessonId);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).sectionId()).isEqualTo("s1");
        assertThat(results.get(1).sectionId()).isEqualTo("s2");
    }
}
