package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.dto.OfflineStorageTelemetryCommand;
import com.example.lms.shared.domain.model.OfflineStorageTelemetry;
import com.example.lms.shared.domain.repository.OfflineStorageTelemetryRepository;
import com.example.lms.shared.exception.ValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecordOfflineStorageTelemetryUseCase")
class RecordOfflineStorageTelemetryUseCaseTest {

    @Mock
    private OfflineStorageTelemetryRepository telemetryRepository;

    @InjectMocks
    private RecordOfflineStorageTelemetryUseCase useCase;

    @Test
    @DisplayName("records supported offline storage telemetry event")
    void recordsSupportedEvent() {
        UUID userId = UUID.randomUUID();
        Instant occurredAt = Instant.now();
        OfflineStorageTelemetryCommand command = new OfflineStorageTelemetryCommand(
                "disabled",
                "online-only",
                "none",
                "lms-maritime-offline-recovery-1",
                false,
                "UnknownError",
                "Internal error opening backing store for indexedDB.open.",
                "/student/storage",
                "Mozilla/5.0",
                "Win32",
                "4g",
                occurredAt,
                Map.of("sample", "value")
        );

        when(telemetryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = useCase.record(userId.toString(), command);

        ArgumentCaptor<OfflineStorageTelemetry> captor = ArgumentCaptor.forClass(OfflineStorageTelemetry.class);
        verify(telemetryRepository).save(captor.capture());
        OfflineStorageTelemetry saved = captor.getValue();

        assertThat(saved.getUserId()).isEqualTo(userId);
        assertThat(saved.getEventType()).isEqualTo("disabled");
        assertThat(saved.getAvailability()).isEqualTo("online-only");
        assertThat(saved.getRoute()).isEqualTo("/student/storage");
        assertThat(saved.getPayload()).containsEntry("sample", "value");
        assertThat(response.id()).isEqualTo(saved.getId());
    }

    @Test
    @DisplayName("rejects unsupported event type")
    void rejectsUnsupportedEventType() {
        OfflineStorageTelemetryCommand command = new OfflineStorageTelemetryCommand(
                "recovery-started",
                "recovering",
                "none",
                "lms-maritime-offline",
                false,
                null,
                null,
                "/student/storage",
                null,
                null,
                null,
                Instant.now(),
                Map.of()
        );

        assertThatThrownBy(() -> useCase.record(UUID.randomUUID().toString(), command))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("eventType");
    }
}
