package com.example.lms.shared.infrastructure.web;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.dto.OfflineStorageTelemetryCommand;
import com.example.lms.shared.application.dto.OfflineStorageTelemetryResponse;
import com.example.lms.shared.application.usecase.RecordOfflineStorageTelemetryUseCase;
import com.example.lms.shared.infrastructure.persistence.OfflineStorageTelemetryJpaRepository;
import com.example.lms.shared.infrastructure.persistence.entity.OfflineStorageTelemetryJpaEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Client Telemetry V3", description = "Nhan telemetry toi thieu tu frontend/PWA")
public class ClientTelemetryControllerV3 {

    private final RecordOfflineStorageTelemetryUseCase recordUseCase;
    private final OfflineStorageTelemetryJpaRepository telemetryJpaRepository;
    private final UserJpaRepository userJpaRepository;

    @PostMapping("/api/v3/client-telemetry/offline-storage")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Ghi nhan telemetry loi bo nho ngoai tuyen tu client")
    public ResponseEntity<ApiResponse<OfflineStorageTelemetryResponse>> recordOfflineStorageTelemetry(
            @AuthenticationPrincipal UserJpaEntity user,
            @Valid @RequestBody OfflineStorageTelemetryCommand command
    ) {
        OfflineStorageTelemetryResponse response = recordUseCase.record(user.getId().toString(), command);
        return ResponseEntity.ok(ApiResponse.success(response, "Da ghi nhan telemetry offline storage"));
    }

    @GetMapping("/api/v3/admin/client-telemetry/offline-storage")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Lay danh sach telemetry offline storage gan day")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listOfflineStorageTelemetry(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String search
    ) {
        Page<OfflineStorageTelemetryJpaEntity> logs = telemetryJpaRepository.findFiltered(
                normalize(eventType),
                userId,
                normalize(search),
                PageRequest.of(page, Math.min(size, 100))
        );

        Map<UUID, UserJpaEntity> userMap = userJpaRepository.findAllById(
                logs.getContent().stream().map(OfflineStorageTelemetryJpaEntity::getUserId).distinct().toList()
        ).stream().collect(java.util.stream.Collectors.toMap(UserJpaEntity::getId, Function.identity()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", logs.getContent().stream().map(entry -> toMap(entry, userMap.get(entry.getUserId()))).toList());
        result.put("page", logs.getNumber());
        result.put("size", logs.getSize());
        result.put("totalElements", logs.getTotalElements());
        result.put("totalPages", logs.getTotalPages());

        return ResponseEntity.ok(ApiResponse.success(result, "Tai telemetry offline storage thanh cong"));
    }

    @GetMapping("/api/v3/admin/client-telemetry/offline-storage/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    @Operation(summary = "Lay analytics nhe cho telemetry offline storage")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOfflineStorageTelemetryAnalytics(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String search
    ) {
        int normalizedDays = Math.max(1, Math.min(days, 30));
        String normalizedEventType = normalize(eventType);
        String normalizedSearch = normalize(search);
        Instant since = Instant.now().minus(normalizedDays - 1L, ChronoUnit.DAYS).truncatedTo(ChronoUnit.DAYS);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("days", normalizedDays);
        result.put("since", since.toString());
        result.put("totalEvents", telemetryJpaRepository.countSince(normalizedEventType, userId, normalizedSearch, since));
        result.put("affectedUsers", telemetryJpaRepository.countDistinctUsersSince(normalizedEventType, userId, normalizedSearch, since));
        result.put("requiresRedownloadCount", telemetryJpaRepository.countRequiresRedownloadSince(normalizedEventType, userId, normalizedSearch, since));
        result.put("byEventType", toBucketMap(
                telemetryJpaRepository.aggregateEventTypesSince(normalizedEventType, userId, normalizedSearch, since)
        ));
        result.put("byAvailability", toBucketMap(
                telemetryJpaRepository.aggregateAvailabilitySince(normalizedEventType, userId, normalizedSearch, since)
        ));
        result.put("dailyTrend", buildDailyTrend(
                normalizedDays,
                telemetryJpaRepository.dailyTrendSince(normalizedEventType, userId, normalizedSearch, since)
        ));
        result.put("topRoutes", toBucketList(
                telemetryJpaRepository.topRoutesSince(normalizedEventType, userId, normalizedSearch, since)
        ));
        result.put("topPlatforms", normalizeAndLimitBuckets(
                telemetryJpaRepository.aggregatePlatformsSince(normalizedEventType, userId, normalizedSearch, since),
                this::normalizePlatformBucket,
                5
        ));
        result.put("topBrowsers", normalizeAndLimitBuckets(
                telemetryJpaRepository.aggregateUserAgentsSince(normalizedEventType, userId, normalizedSearch, since),
                this::normalizeBrowserBucket,
                5
        ));

        return ResponseEntity.ok(ApiResponse.success(result, "Tai analytics offline storage thanh cong"));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private Map<String, Object> toMap(OfflineStorageTelemetryJpaEntity entry, UserJpaEntity user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entry.getId() != null ? entry.getId().toString() : null);
        map.put("userId", entry.getUserId() != null ? entry.getUserId().toString() : null);
        map.put("userEmail", user != null ? user.getEmail() : null);
        map.put("userName", user != null ? user.getFullName() : null);
        map.put("eventType", entry.getEventType());
        map.put("availability", entry.getAvailability());
        map.put("recoveryAction", entry.getRecoveryAction());
        map.put("dbName", entry.getDbName());
        map.put("requiresRedownload", entry.getRequiresRedownload());
        map.put("errorName", entry.getErrorName());
        map.put("errorMessage", entry.getErrorMessage());
        map.put("route", entry.getRoute());
        map.put("userAgent", entry.getUserAgent());
        map.put("platform", entry.getPlatform());
        map.put("normalizedPlatform", normalizePlatform(entry.getPlatform(), entry.getUserAgent()));
        map.put("browserFamily", detectBrowserFamily(entry.getUserAgent()));
        map.put("connectionType", entry.getConnectionType());
        map.put("occurredAt", entry.getOccurredAt() != null ? entry.getOccurredAt().toString() : null);
        map.put("createdAt", entry.getCreatedAt() != null ? entry.getCreatedAt().toString() : null);
        map.put("payload", entry.getPayloadJson());
        return map;
    }

    private Map<String, Long> toBucketMap(List<OfflineStorageTelemetryJpaRepository.BucketCountProjection> projections) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (OfflineStorageTelemetryJpaRepository.BucketCountProjection projection : projections) {
            result.put(projection.getBucket(), projection.getTotalCount());
        }
        return result;
    }

    private List<Map<String, Object>> toBucketList(List<OfflineStorageTelemetryJpaRepository.BucketCountProjection> projections) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (OfflineStorageTelemetryJpaRepository.BucketCountProjection projection : projections) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("label", projection.getBucket());
            item.put("count", projection.getTotalCount());
            items.add(item);
        }
        return items;
    }

    private List<Map<String, Object>> normalizeAndLimitBuckets(
            List<OfflineStorageTelemetryJpaRepository.BucketCountProjection> projections,
            Function<String, String> normalizer,
            int limit
    ) {
        Map<String, Long> aggregated = new LinkedHashMap<>();
        for (OfflineStorageTelemetryJpaRepository.BucketCountProjection projection : projections) {
            String normalized = normalizer.apply(projection.getBucket());
            aggregated.merge(normalized, projection.getTotalCount(), Long::sum);
        }

        return aggregated.entrySet().stream()
                .sorted((left, right) -> {
                    int byCount = Long.compare(right.getValue(), left.getValue());
                    return byCount != 0 ? byCount : left.getKey().compareToIgnoreCase(right.getKey());
                })
                .limit(limit)
                .map(entry -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("label", entry.getKey());
                    item.put("count", entry.getValue());
                    return item;
                })
                .toList();
    }

    private List<Map<String, Object>> buildDailyTrend(
            int days,
            List<OfflineStorageTelemetryJpaRepository.DailyTrendProjection> projections
    ) {
        Map<LocalDate, OfflineStorageTelemetryJpaRepository.DailyTrendProjection> projectionMap = new LinkedHashMap<>();
        for (OfflineStorageTelemetryJpaRepository.DailyTrendProjection projection : projections) {
            projectionMap.put(projection.getBucketDate(), projection);
        }

        LocalDate startDate = Instant.now().minus(days - 1L, ChronoUnit.DAYS).atZone(ZoneOffset.UTC).toLocalDate();
        List<Map<String, Object>> result = new ArrayList<>();
        for (int offset = 0; offset < days; offset++) {
            LocalDate date = startDate.plusDays(offset);
            OfflineStorageTelemetryJpaRepository.DailyTrendProjection projection = projectionMap.get(date);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date", date.toString());
            item.put("totalCount", projection != null ? projection.getTotalCount() : 0L);
            item.put("disabledCount", projection != null ? projection.getDisabledCount() : 0L);
            item.put("manualResetCount", projection != null ? projection.getManualResetCount() : 0L);
            item.put("recreateFailedCount", projection != null ? projection.getRecreateFailedCount() : 0L);
            result.add(item);
        }
        return result;
    }

    private String normalizePlatformBucket(String raw) {
        return normalizePlatform(raw, raw);
    }

    private String normalizeBrowserBucket(String raw) {
        return detectBrowserFamily(raw);
    }

    private String normalizePlatform(String rawPlatform, String userAgent) {
        String platform = safeLower(rawPlatform);
        String ua = safeLower(userAgent);

        if (platform.contains("win") || ua.contains("windows")) return "Windows";
        if (platform.contains("mac") || ua.contains("mac os") || ua.contains("macintosh")) return "macOS";
        if (platform.contains("iphone") || platform.contains("ipad") || ua.contains("iphone") || ua.contains("ipad")) return "iOS";
        if (platform.contains("android") || ua.contains("android")) return "Android";
        if (platform.contains("linux") || ua.contains("linux")) return "Linux";
        if (platform.contains("cros") || ua.contains("cros")) return "ChromeOS";
        return rawPlatform == null || rawPlatform.isBlank() ? "(unknown)" : rawPlatform.trim();
    }

    private String detectBrowserFamily(String userAgent) {
        String ua = safeLower(userAgent);
        if (ua.isBlank() || "(unknown)".equals(ua)) return "(unknown)";
        if (ua.contains("edg/")) return "Edge";
        if (ua.contains("opr/") || ua.contains("opera")) return "Opera";
        if (ua.contains("samsungbrowser/")) return "Samsung Internet";
        if (ua.contains("chrome/") && !ua.contains("edg/") && !ua.contains("opr/")) return "Chrome";
        if (ua.contains("firefox/")) return "Firefox";
        if ((ua.contains("safari/") && ua.contains("version/")) && !ua.contains("chrome/") && !ua.contains("chromium")) return "Safari";
        if (ua.contains("chromium")) return "Chromium";
        return "Other";
    }

    private String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
