package com.example.lms.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * DatabaseMigrationFixer
 * 
 * A safety component that ensures critical database schema changes are applied,
 * even if Flyway is disabled or misconfigured.
 * 
 * Specifically fixes:
 * 1. Dropping legacy NOT NULL column 'type' in 'assignments' table
 */
@Component
public class DatabaseMigrationFixer implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        System.out.println(">>> DatabaseMigrationFixer: Checking for legacy schema issues...");
        
        try {
            // Check if column 'type' exists in 'assignments'
            Integer columnExists = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'type'",
                Integer.class
            );

            if (columnExists != null && columnExists > 0) {
                System.out.println(">>> DatabaseMigrationFixer: Found legacy 'type' column in 'assignments' table. Attempting to drop...");
                
                // Drop constraints first if any
                try {
                    jdbcTemplate.execute("ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_type_check");
                } catch (Exception e) {
                    System.err.println(">>> DatabaseMigrationFixer Error dropping constraint: " + e.getMessage());
                }

                // Drop the column
                jdbcTemplate.execute("ALTER TABLE assignments DROP COLUMN type CASCADE");
                System.out.println(">>> DatabaseMigrationFixer: Successfully dropped 'type' column.");
            } else {
                System.out.println(">>> DatabaseMigrationFixer: 'type' column already removed or does not exist.");
            }
        } catch (Exception e) {
            System.err.println(">>> DatabaseMigrationFixer: Error during migration fix: " + e.getMessage());
            // We don't want to stop the application from starting if this fails, 
            // but we want to log it clearly.
        }
    }
}
