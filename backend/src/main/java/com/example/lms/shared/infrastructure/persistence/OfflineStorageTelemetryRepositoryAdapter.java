package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.domain.model.OfflineStorageTelemetry;
import com.example.lms.shared.domain.repository.OfflineStorageTelemetryRepository;
import com.example.lms.shared.infrastructure.persistence.entity.OfflineStorageTelemetryJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class OfflineStorageTelemetryRepositoryAdapter implements OfflineStorageTelemetryRepository {

    private final OfflineStorageTelemetryJpaRepository jpaRepository;

    public OfflineStorageTelemetryRepositoryAdapter(OfflineStorageTelemetryJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public OfflineStorageTelemetry save(OfflineStorageTelemetry telemetry) {
        OfflineStorageTelemetryJpaEntity entity = OfflineStorageTelemetryJpaEntity.builder()
                .id(telemetry.getId())
                .userId(telemetry.getUserId())
                .eventType(telemetry.getEventType())
                .availability(telemetry.getAvailability())
                .recoveryAction(telemetry.getRecoveryAction())
                .dbName(telemetry.getDbName())
                .requiresRedownload(telemetry.isRequiresRedownload())
                .errorName(telemetry.getErrorName())
                .errorMessage(telemetry.getErrorMessage())
                .route(telemetry.getRoute())
                .userAgent(telemetry.getUserAgent())
                .platform(telemetry.getPlatform())
                .connectionType(telemetry.getConnectionType())
                .occurredAt(telemetry.getOccurredAt())
                .payloadJson(telemetry.getPayload())
                .build();

        OfflineStorageTelemetryJpaEntity saved = jpaRepository.save(entity);
        return OfflineStorageTelemetry.reconstitute(
                saved.getId(),
                saved.getUserId(),
                saved.getEventType(),
                saved.getAvailability(),
                saved.getRecoveryAction(),
                saved.getDbName(),
                Boolean.TRUE.equals(saved.getRequiresRedownload()),
                saved.getErrorName(),
                saved.getErrorMessage(),
                saved.getRoute(),
                saved.getUserAgent(),
                saved.getPlatform(),
                saved.getConnectionType(),
                saved.getOccurredAt(),
                saved.getPayloadJson(),
                saved.getCreatedAt()
        );
    }
}
