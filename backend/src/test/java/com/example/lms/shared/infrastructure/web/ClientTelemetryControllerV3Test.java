package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.dto.OfflineStorageTelemetryCommand;
import com.example.lms.shared.application.dto.OfflineStorageTelemetryResponse;
import com.example.lms.shared.application.usecase.RecordOfflineStorageTelemetryUseCase;
import com.example.lms.shared.infrastructure.persistence.OfflineStorageTelemetryJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.OfflineStorageTelemetryJpaEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientTelemetryControllerV3Test {

    @Mock
    private RecordOfflineStorageTelemetryUseCase recordUseCase;

    @Mock
    private OfflineStorageTelemetryJpaRepository telemetryJpaRepository;

    @Mock
    private UserJpaRepository userJpaRepository;

    @InjectMocks
    private ClientTelemetryControllerV3 controller;

    @Test
    @DisplayName("recordOfflineStorageTelemetry returns success payload")
    void recordOfflineStorageTelemetryReturnsSuccess() {
        UUID userId = UUID.randomUUID();
        OfflineStorageTelemetryCommand command = new OfflineStorageTelemetryCommand(
                "disabled",
                "online-only",
                "none",
                "lms-maritime-offline",
                false,
                "UnknownError",
                "Internal error opening backing store for indexedDB.open.",
                "/student/storage",
                "Mozilla/5.0",
                "Win32",
                "4g",
                Instant.now(),
                Map.of("sample", "value")
        );
        OfflineStorageTelemetryResponse response = new OfflineStorageTelemetryResponse(UUID.randomUUID(), Instant.now());
        when(recordUseCase.record(userId.toString(), command)).thenReturn(response);

        var result = controller.recordOfflineStorageTelemetry(
                user(userId, UserJpaEntity.UserRole.STUDENT, "student@maritime.edu", "Hoc vien"),
                command
        );

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().isSuccess()).isTrue();
        assertThat(result.getBody().getData()).isEqualTo(response);
    }

    @Test
    @DisplayName("listOfflineStorageTelemetry returns paged admin payload")
    @SuppressWarnings("unchecked")
    void listOfflineStorageTelemetryReturnsPagedPayload() {
        UUID userId = UUID.randomUUID();
        OfflineStorageTelemetryJpaEntity entity = OfflineStorageTelemetryJpaEntity.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .eventType("disabled")
                .availability("online-only")
                .recoveryAction("none")
                .dbName("lms-maritime-offline")
                .requiresRedownload(false)
                .errorName("UnknownError")
                .errorMessage("Internal error opening backing store for indexedDB.open.")
                .route("/student/storage")
                .platform("Win32")
                .connectionType("4g")
                .occurredAt(Instant.now())
                .payloadJson(Map.of("sample", "value"))
                .build();

        when(telemetryJpaRepository.findFiltered(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(userJpaRepository.findAllById(any()))
                .thenReturn(List.of(user(userId, UserJpaEntity.UserRole.STUDENT, "student@maritime.edu", "Hoc vien")));

        var result = controller.listOfflineStorageTelemetry(0, 20, null, null, null);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().isSuccess()).isTrue();
        Map<String, Object> payload = result.getBody().getData();
        assertThat(payload).isNotNull();
        assertThat(payload.get("totalElements")).isEqualTo(1L);
        List<Map<String, Object>> content = (List<Map<String, Object>>) payload.get("content");
        assertThat(content).hasSize(1);
        assertThat(content.get(0)).containsEntry("eventType", "disabled");
        assertThat(content.get(0)).containsEntry("userEmail", "student@maritime.edu");
    }

    @Test
    @DisplayName("getOfflineStorageTelemetryAnalytics returns aggregates")
    @SuppressWarnings("unchecked")
    void getOfflineStorageTelemetryAnalyticsReturnsAggregates() {
        when(telemetryJpaRepository.countSince(any(), any(), any(), any())).thenReturn(5L);
        when(telemetryJpaRepository.countDistinctUsersSince(any(), any(), any(), any())).thenReturn(2L);
        when(telemetryJpaRepository.countRequiresRedownloadSince(any(), any(), any(), any())).thenReturn(3L);
        when(telemetryJpaRepository.aggregateEventTypesSince(any(), any(), any(), any()))
                .thenReturn(List.of(bucket("disabled", 3L), bucket("manual-reset", 2L)));
        when(telemetryJpaRepository.aggregateAvailabilitySince(any(), any(), any(), any()))
                .thenReturn(List.of(bucket("online-only", 4L), bucket("recovering", 1L)));
        when(telemetryJpaRepository.topRoutesSince(any(), any(), any(), any()))
                .thenReturn(List.of(bucket("/student/storage", 4L)));
        when(telemetryJpaRepository.aggregatePlatformsSince(any(), any(), any(), any()))
                .thenReturn(List.of(bucket("Win32", 2L), bucket("windows", 2L)));
        when(telemetryJpaRepository.aggregateUserAgentsSince(any(), any(), any(), any()))
                .thenReturn(List.of(bucket("Mozilla/5.0 Chrome/122.0", 4L)));
        when(telemetryJpaRepository.dailyTrendSince(any(), any(), any(), any()))
                .thenReturn(List.of(daily(LocalDate.now(), 2L, 1L, 1L, 0L)));

        var result = controller.getOfflineStorageTelemetryAnalytics(7, null, null, null);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().isSuccess()).isTrue();

        Map<String, Object> payload = result.getBody().getData();
        assertThat(payload.get("totalEvents")).isEqualTo(5L);
        assertThat(payload.get("affectedUsers")).isEqualTo(2L);
        assertThat(payload.get("requiresRedownloadCount")).isEqualTo(3L);
        assertThat((Map<String, Long>) payload.get("byEventType")).containsEntry("disabled", 3L);
        assertThat((List<Map<String, Object>>) payload.get("topRoutes")).hasSize(1);
        assertThat((List<Map<String, Object>>) payload.get("topPlatforms"))
                .extracting(item -> item.get("label"))
                .contains("Windows");
        assertThat((List<Map<String, Object>>) payload.get("topBrowsers"))
                .extracting(item -> item.get("label"))
                .contains("Chrome");
        assertThat(((List<Map<String, Object>>) payload.get("dailyTrend"))).hasSize(7);
    }

    private UserJpaEntity user(UUID id, UserJpaEntity.UserRole role, String email, String fullName) {
        return UserJpaEntity.builder()
                .id(id)
                .username(email)
                .email(email)
                .password("secret")
                .fullName(fullName)
                .role(role)
                .enabled(true)
                .build();
    }

    private OfflineStorageTelemetryJpaRepository.BucketCountProjection bucket(String label, Long count) {
        return new OfflineStorageTelemetryJpaRepository.BucketCountProjection() {
            @Override
            public String getBucket() {
                return label;
            }

            @Override
            public Long getTotalCount() {
                return count;
            }
        };
    }

    private OfflineStorageTelemetryJpaRepository.DailyTrendProjection daily(
            LocalDate date,
            Long total,
            Long disabled,
            Long manualReset,
            Long recreateFailed
    ) {
        return new OfflineStorageTelemetryJpaRepository.DailyTrendProjection() {
            @Override
            public LocalDate getBucketDate() {
                return date;
            }

            @Override
            public Long getTotalCount() {
                return total;
            }

            @Override
            public Long getDisabledCount() {
                return disabled;
            }

            @Override
            public Long getManualResetCount() {
                return manualReset;
            }

            @Override
            public Long getRecreateFailedCount() {
                return recreateFailed;
            }
        };
    }
}
