package com.example.lms.config;

import com.example.lms.assessment.infrastructure.persistence.repository.QuestionJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class CleanupLegacyDataRunner implements CommandLineRunner {

    private final QuestionJpaRepository questionRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("STARTING LEGACY DATA CLEANUP...");
        try {
            long questionsCount = questionRepository.count();
            
            if (questionsCount > 0) {
                log.warn("Found {} questions. Deleting legacy data to prevent JSON parsing errors...", questionsCount);
                // CascadeAll should handle options
                questionRepository.deleteAll();
                log.info("Successfully deleted all questions.");
            } else {
                log.info("No questions found. Database is clean.");
            }
        } catch (Exception e) {
            log.error("Failed to clean legacy data: {}", e.getMessage());
        }
    }
}
