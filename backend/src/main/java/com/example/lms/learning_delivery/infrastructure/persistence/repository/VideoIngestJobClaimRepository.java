package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class VideoIngestJobClaimRepository {

    private static final long STALE_PROCESSING_THRESHOLD_MINUTES = 30;
    private static final int MAX_RETRY_ATTEMPTS = 5;

    private final JdbcTemplate jdbcTemplate;

    public VideoIngestJobClaimRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<UUID> claimRunnableJobIds(Instant now, int limit) {
        if (limit <= 0) {
            return List.of();
        }

        recoverStaleProcessingJobs(now);

        return jdbcTemplate.execute(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    with claimed as (
                        select id
                        from video_ingest_jobs
                        where status in ('PENDING', 'RETRY')
                          and next_run_at <= ?
                        order by next_run_at asc, created_at asc
                        for update skip locked
                        limit ?
                    )
                    update video_ingest_jobs job
                    set status = 'PROCESSING',
                        attempt_count = coalesce(job.attempt_count, 0) + 1,
                        started_at = now(),
                        last_error = null,
                        updated_at = now()
                    from claimed
                    where job.id = claimed.id
                    returning job.id
                    """);
            statement.setTimestamp(1, Timestamp.from(now));
            statement.setInt(2, limit);
            return statement;
        }, (PreparedStatement statement) -> {
            List<UUID> claimedIds = new ArrayList<>();
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    claimedIds.add((UUID) resultSet.getObject(1));
                }
            }
            return claimedIds;
        });
    }

    private void recoverStaleProcessingJobs(Instant now) {
        Instant threshold = now.minus(java.time.Duration.ofMinutes(STALE_PROCESSING_THRESHOLD_MINUTES));
        jdbcTemplate.update("""
                update video_ingest_jobs
                set status = 'RETRY',
                    last_error = 'Recovered from stale PROCESSING state (container crash or timeout)',
                    next_run_at = now(),
                    updated_at = now()
                where status = 'PROCESSING'
                  and started_at < ?
                  and attempt_count < ?
                """,
                Timestamp.from(threshold), MAX_RETRY_ATTEMPTS);
    }
}
