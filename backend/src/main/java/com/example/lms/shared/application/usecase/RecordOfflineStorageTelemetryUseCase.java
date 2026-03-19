package com.example.lms.shared.application.usecase;

import com.example.lms.shared.application.dto.OfflineStorageTelemetryCommand;
import com.example.lms.shared.application.dto.OfflineStorageTelemetryResponse;
import com.example.lms.shared.domain.model.OfflineStorageTelemetry;
import com.example.lms.shared.domain.repository.OfflineStorageTelemetryRepository;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecordOfflineStorageTelemetryUseCase {

    private static final Set<String> ALLOWED_EVENT_TYPES = Set.of(
            "recreate-failed",
            "disabled",
            "manual-reset"
    );
    private static final Set<String> ALLOWED_AVAILABILITY = Set.of(
            "ready",
            "recovering",
            "online-only"
    );
    private static final Set<String> ALLOWED_RECOVERY_ACTIONS = Set.of(
            "none",
            "recreated-db",
            "rotated-db",
            "manual-reset"
    );

    private final OfflineStorageTelemetryRepository telemetryRepository;

    @Transactional
    public OfflineStorageTelemetryResponse record(String userId, OfflineStorageTelemetryCommand command) {
        String normalizedEventType = normalizeRequired(command.eventType(), 50);
        String normalizedAvailability = normalizeRequired(command.availability(), 30);
        String normalizedRecoveryAction = normalizeOptional(command.recoveryAction(), 30, "none");
        String normalizedDbName = normalizeRequired(command.dbName(), 255);

        if (!ALLOWED_EVENT_TYPES.contains(normalizedEventType)) {
            throw new ValidationException("eventType không hợp lệ");
        }
        if (!ALLOWED_AVAILABILITY.contains(normalizedAvailability)) {
            throw new ValidationException("availability không hợp lệ");
        }
        if (!ALLOWED_RECOVERY_ACTIONS.contains(normalizedRecoveryAction)) {
            throw new ValidationException("recoveryAction không hợp lệ");
        }

        OfflineStorageTelemetry telemetry = OfflineStorageTelemetry.create(
                UUID.fromString(userId),
                normalizedEventType,
                normalizedAvailability,
                normalizedRecoveryAction,
                normalizedDbName,
                command.requiresRedownload(),
                normalizeOptional(command.errorName(), 255),
                normalizeOptional(command.errorMessage(), 4000),
                normalizeOptional(command.route(), 1024),
                normalizeOptional(command.userAgent(), 2048),
                normalizeOptional(command.platform(), 255),
                normalizeOptional(command.connectionType(), 64),
                command.occurredAt(),
                command.payload() == null ? Map.of() : command.payload()
        );

        OfflineStorageTelemetry saved = telemetryRepository.save(telemetry);
        return new OfflineStorageTelemetryResponse(saved.getId(), saved.getCreatedAt());
    }

    private String normalizeRequired(String value, int maxLength) {
        String normalized = normalizeOptional(value, maxLength);
        if (normalized == null || normalized.isBlank()) {
            throw new ValidationException("Thiếu trường bắt buộc");
        }
        return normalized;
    }

    private String normalizeOptional(String value, int maxLength) {
        return normalizeOptional(value, maxLength, null);
    }

    private String normalizeOptional(String value, int maxLength, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return defaultValue;
        }
        return normalized.length() > maxLength
                ? normalized.substring(0, maxLength)
                : normalized;
    }
}
