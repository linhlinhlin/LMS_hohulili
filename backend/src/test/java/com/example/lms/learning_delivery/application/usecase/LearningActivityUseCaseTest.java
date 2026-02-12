package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.learning_delivery.domain.model.LearningEvent;
import com.example.lms.learning_delivery.domain.repository.LearningEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LearningActivityUseCaseTest {

    @Mock private LearningEventRepository learningEventRepository;
    @Mock private GamificationUseCase gamificationUseCase;

    private LearningActivityUseCase useCase;

    private final UUID studentId = UUID.randomUUID();
    private final UUID lessonId = UUID.randomUUID();
    private final String sectionId = "section-1";

    @BeforeEach
    void setUp() {
        useCase = new LearningActivityUseCase(learningEventRepository, gamificationUseCase);
    }

    @Test
    @DisplayName("recordHeartbeat saves HEARTBEAT event with time and content type")
    void recordHeartbeatSavesEvent() {
        when(learningEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.recordHeartbeat(studentId, lessonId, sectionId, 30, "VIDEO");

        ArgumentCaptor<LearningEvent> captor = ArgumentCaptor.forClass(LearningEvent.class);
        verify(learningEventRepository).save(captor.capture());

        LearningEvent saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo(LearningEvent.EventType.HEARTBEAT);
        assertThat(saved.getStudentId()).isEqualTo(studentId);
        assertThat(saved.getLessonId()).isEqualTo(lessonId);
        assertThat(saved.getSectionId()).isEqualTo(sectionId);
        assertThat(saved.getEventData()).containsEntry("timeSpentSeconds", 30);
        assertThat(saved.getEventData()).containsEntry("contentType", "VIDEO");
    }

    @Test
    @DisplayName("recordHeartbeat uses UNKNOWN when contentType is null")
    void recordHeartbeatNullContentType() {
        when(learningEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.recordHeartbeat(studentId, lessonId, sectionId, 30, null);

        ArgumentCaptor<LearningEvent> captor = ArgumentCaptor.forClass(LearningEvent.class);
        verify(learningEventRepository).save(captor.capture());
        assertThat(captor.getValue().getEventData()).containsEntry("contentType", "UNKNOWN");
    }

    @Test
    @DisplayName("recordReadingProgress saves READING_PROGRESS event with scrollPercent")
    void recordReadingProgressSavesEvent() {
        when(learningEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.recordReadingProgress(studentId, lessonId, sectionId, 85.5);

        ArgumentCaptor<LearningEvent> captor = ArgumentCaptor.forClass(LearningEvent.class);
        verify(learningEventRepository).save(captor.capture());

        LearningEvent saved = captor.getValue();
        assertThat(saved.getEventType()).isEqualTo(LearningEvent.EventType.READING_PROGRESS);
        assertThat(saved.getEventData()).containsEntry("scrollPercent", 85.5);
    }

    @Test
    @DisplayName("getContinueWhereLeftOff returns DTO when activity exists")
    void getContinueWhereLeftOffReturnsDTO() {
        LearningEvent event = LearningEvent.create(
                studentId, lessonId, sectionId,
                LearningEvent.EventType.HEARTBEAT,
                Map.of("timeSpentSeconds", 30)
        );
        when(learningEventRepository.findLastActivityEvent(studentId))
                .thenReturn(Optional.of(event));

        var result = useCase.getContinueWhereLeftOff(studentId);

        assertThat(result).isNotNull();
        assertThat(result.lessonId()).isEqualTo(lessonId);
        assertThat(result.sectionId()).isEqualTo(sectionId);
        assertThat(result.lastEventType()).isEqualTo("HEARTBEAT");
    }

    @Test
    @DisplayName("getContinueWhereLeftOff returns null when no activity")
    void getContinueWhereLeftOffReturnsNull() {
        when(learningEventRepository.findLastActivityEvent(studentId))
                .thenReturn(Optional.empty());

        var result = useCase.getContinueWhereLeftOff(studentId);

        assertThat(result).isNull();
    }

    @Test
    @DisplayName("getTodayStudyTimeSeconds delegates to repository")
    void getTodayStudyTimeSeconds() {
        when(learningEventRepository.sumTimeSpentSince(eq(studentId), any(Instant.class)))
                .thenReturn(3600L);

        long result = useCase.getTodayStudyTimeSeconds(studentId);

        assertThat(result).isEqualTo(3600L);
        verify(learningEventRepository).sumTimeSpentSince(eq(studentId), any(Instant.class));
    }

    @Test
    @DisplayName("getTodayStudyTimeSeconds returns 0 when no heartbeats")
    void getTodayStudyTimeSecondsReturnsZero() {
        when(learningEventRepository.sumTimeSpentSince(eq(studentId), any(Instant.class)))
                .thenReturn(0L);

        long result = useCase.getTodayStudyTimeSeconds(studentId);

        assertThat(result).isZero();
    }

    @Test
    @DisplayName("StudyTimeResponse formats hours and minutes correctly")
    void studyTimeResponseFormatsCorrectly() {
        var response = LearningActivityUseCase.StudyTimeResponse.from(3661); // 1h 1m
        assertThat(response.todayFormatted()).isEqualTo("1h 1m");
        assertThat(response.todaySeconds()).isEqualTo(3661);
    }

    @Test
    @DisplayName("StudyTimeResponse formats minutes only when under 1 hour")
    void studyTimeResponseMinutesOnly() {
        var response = LearningActivityUseCase.StudyTimeResponse.from(900); // 15m
        assertThat(response.todayFormatted()).isEqualTo("15 phút");
    }

    @Test
    @DisplayName("StudyTimeResponse formats 0 seconds")
    void studyTimeResponseZero() {
        var response = LearningActivityUseCase.StudyTimeResponse.from(0);
        assertThat(response.todayFormatted()).isEqualTo("0 phút");
    }
}
