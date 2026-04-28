package com.example.lms.shared.infrastructure.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Periodic refresh cho materialized views analytics.
 *
 * <p>MVs ({@code mv_course_stats}, {@code mv_teacher_performance}) là pre-aggregated
 * tables phục vụ admin/teacher dashboard. PostgreSQL không tự refresh — phải gọi
 * {@code REFRESH MATERIALIZED VIEW} định kỳ.</p>
 *
 * <p>Chiến lược: {@code REFRESH CONCURRENTLY} mỗi 30 phút. Yêu cầu UNIQUE INDEX
 * trên MV (đã thoả) để KHÔNG block SELECT readers — production-safe.</p>
 *
 * <p>Cấu hình {@code lms.materialized-view.refresh.enabled=false} để tắt trong
 * test/CI environment nếu cần.</p>
 *
 * @see <a href="https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html">PostgreSQL REFRESH MV docs</a>
 */
@Component
@Slf4j
public class MaterializedViewRefreshScheduler {

    private static final String[] MATERIALIZED_VIEWS = {
        "mv_course_stats",
        "mv_teacher_performance"
    };

    private final JdbcTemplate jdbcTemplate;

    @Value("${lms.materialized-view.refresh.enabled:true}")
    private boolean refreshEnabled;

    public MaterializedViewRefreshScheduler(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Refresh tất cả MVs mỗi 30 phút. {@code initialDelay} 5 phút để startup
     * không trùng V128 migration một-lần đã refresh.
     */
    @Scheduled(fixedDelay = 1_800_000L, initialDelay = 300_000L)
    public void refreshAll() {
        if (!refreshEnabled) {
            log.debug("[MV-Refresh] disabled via config, skipping cycle.");
            return;
        }

        for (String mv : MATERIALIZED_VIEWS) {
            refreshOne(mv);
        }
    }

    private void refreshOne(String mvName) {
        Instant start = Instant.now();
        try {
            // CONCURRENTLY: không lock readers, yêu cầu UNIQUE INDEX trên MV.
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY " + mvName);
            Duration elapsed = Duration.between(start, Instant.now());
            log.info("[MV-Refresh] refreshed {} in {} ms", mvName, elapsed.toMillis());
        } catch (Exception ex) {
            // Graceful degrade: log error, MV giữ data cũ. Không crash app.
            log.error("[MV-Refresh] FAILED to refresh {}: {}", mvName, ex.getMessage(), ex);
        }
    }
}
