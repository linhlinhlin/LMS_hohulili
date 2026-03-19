package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.OfflineStorageTelemetry;

public interface OfflineStorageTelemetryRepository {

    OfflineStorageTelemetry save(OfflineStorageTelemetry telemetry);
}
