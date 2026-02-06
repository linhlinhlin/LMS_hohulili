package com.example.lms.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Initializer for runtime data fixes on application startup.
 *
 * IMPORTANT: Enum normalization has been moved to Flyway migrations:
 * - V26__normalize_enums.sql: Converts all enum values to UPPERCASE
 * - V27__add_performance_indexes.sql: Adds missing FK indexes
 *
 * This class now only handles:
 * - Constraint updates that need to be idempotent on every startup
 * - Any runtime fixes that cannot be done in migrations
 */
@Component
@RequiredArgsConstructor
public class DataFixInitializer {
    private static final Logger log = LoggerFactory.getLogger(DataFixInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixDataOnStartup() {
        log.info("=== DataFixInitializer: Checking runtime constraints ===");

        // Only run constraint fixes that need to be idempotent
        fixSectionTypeConstraint();

        log.info("=== DataFixInitializer: Completed ===");
    }

    /**
     * Fix section type constraint to include all valid types.
     * This needs to run on every startup because JPA/Hibernate may recreate constraints.
     */
    private void fixSectionTypeConstraint() {
        try {
            // Drop and recreate constraint with all valid types
            jdbcTemplate.execute("ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_type_check");
            jdbcTemplate.execute(
                "ALTER TABLE sections ADD CONSTRAINT sections_type_check " +
                "CHECK (type IN ('VIDEO', 'TEXT', 'QUIZ', 'FILE', 'ASSIGNMENT'))"
            );
            log.debug("Updated sections_type_check constraint");
        } catch (Exception e) {
            // Silently ignore - constraint may not exist or table may not exist
            log.trace("Could not update sections_type_check: {}", e.getMessage());
        }
    }
}
