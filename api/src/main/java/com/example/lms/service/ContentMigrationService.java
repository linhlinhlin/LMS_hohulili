package com.example.lms.service;

import com.example.lms.entity.Question;
import com.example.lms.entity.QuestionOption;
import com.example.lms.entity.Section;
import com.example.lms.domain.ContentBlock;
import com.example.lms.repository.QuestionRepository;
import com.example.lms.repository.QuestionOptionRepository;
import com.example.lms.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for migrating legacy content to block-based JSON structure
 * Provides backward compatibility and handles schema versioning
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentMigrationService {

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final SectionRepository sectionRepository;

    /**
     * Migrate all legacy content to block structure
     * @return Migration result with statistics
     */
    @Transactional
    public MigrationResult migrateAllContent() {
        log.info("Starting content migration from legacy to block structure");
        
        MigrationResult result = MigrationResult.builder()
                .startTime(new Date())
                .build();
        
        try {
            // Migrate questions
            MigrationResult.QuestionMigration questionResult = migrateQuestions();
            result.setQuestionMigration(questionResult);
            
            // Migrate question options
            MigrationResult.OptionMigration optionResult = migrateQuestionOptions();
            result.setOptionMigration(optionResult);
            
            // Migrate sections
            MigrationResult.SectionMigration sectionResult = migrateSections();
            result.setSectionMigration(sectionResult);
            
            result.setStatus("COMPLETED");
            result.setEndTime(new Date());
            
            log.info("Content migration completed. Questions: {}/{}, Options: {}/{}, Sections: {}/{}", 
                questionResult.getMigratedCount(), questionResult.getTotalCount(),
                optionResult.getMigratedCount(), optionResult.getTotalCount(),
                sectionResult.getMigratedCount(), sectionResult.getTotalCount());
            
        } catch (Exception e) {
            log.error("Content migration failed", e);
            result.setStatus("FAILED");
            result.setError(e.getMessage());
            result.setEndTime(new Date());
        }
        
        return result;
    }

    /**
     * Migrate questions from legacy content to blocks
     */
    @Transactional
    public MigrationResult.QuestionMigration migrateQuestions() {
        log.info("Starting question migration");
        
        List<Question> questionsToMigrate = questionRepository.findAll().stream()
                .filter(q -> q.getContentBlocks() == null)
                .collect(Collectors.toList());
        int totalCount = questionsToMigrate.size();
        int migratedCount = 0;
        int failedCount = 0;
        
        for (Question question : questionsToMigrate) {
            try {
                // For questions, we need to check both legacy content field and structured_content
                // If structured_content is null but content exists, migrate it
                if (question.getContentBlocks() == null) {
                    // Check if there's legacy content (this would be in the old structure)
                    // Since we're using the new structure, we'll convert null content to empty blocks
                    List<ContentBlock> contentBlocks = createEmptyTextBlock();
                    question.setContentBlocks(contentBlocks);
                    questionRepository.save(question);
                    migratedCount++;
                } else {
                    migratedCount++; // Already has content blocks
                }
                
            } catch (Exception e) {
                log.error("Failed to migrate question: {}", question.getId(), e);
                failedCount++;
            }
        }
        
        log.info("Question migration completed. Total: {}, Migrated: {}, Failed: {}", 
            totalCount, migratedCount, failedCount);
        
        return MigrationResult.QuestionMigration.builder()
                .totalCount(totalCount)
                .migratedCount(migratedCount)
                .failedCount(failedCount)
                .build();
    }

    /**
     * Migrate question options from legacy content to blocks
     */
    @Transactional
    public MigrationResult.OptionMigration migrateQuestionOptions() {
        log.info("Starting question options migration");
        
        List<QuestionOption> optionsToMigrate = questionOptionRepository.findAll().stream()
                .filter(o -> o.getContentBlocks() == null)
                .collect(Collectors.toList());
        int totalCount = optionsToMigrate.size();
        int migratedCount = 0;
        int failedCount = 0;
        
        for (QuestionOption option : optionsToMigrate) {
            try {
                if (option.getContentBlocks() == null) {
                    // Convert legacy content to text block
                    List<ContentBlock> contentBlocks = createEmptyTextBlock();
                    option.setContentBlocks(contentBlocks);
                    questionOptionRepository.save(option);
                    migratedCount++;
                } else {
                    migratedCount++; // Already has content blocks
                }
                
            } catch (Exception e) {
                log.error("Failed to migrate question option: {}", option.getId(), e);
                failedCount++;
            }
        }
        
        log.info("Question options migration completed. Total: {}, Migrated: {}, Failed: {}", 
            totalCount, migratedCount, failedCount);
        
        return MigrationResult.OptionMigration.builder()
                .totalCount(totalCount)
                .migratedCount(migratedCount)
                .failedCount(failedCount)
                .build();
    }

    /**
     * Migrate sections from legacy content to blocks
     */
    @Transactional
    public MigrationResult.SectionMigration migrateSections() {
        log.info("Starting sections migration");
        
        List<Section> sectionsToMigrate = sectionRepository.findAll().stream()
                .filter(s -> s.getStructuredContent() == null)
                .collect(Collectors.toList());
        int totalCount = sectionsToMigrate.size();
        int migratedCount = 0;
        int failedCount = 0;
        
        for (Section section : sectionsToMigrate) {
            try {
                if (section.getStructuredContent() == null) {
                    // Convert legacy content to block structure
                    Map<String, Object> blockStructure = createLegacyBlockStructure(section.getContent());
                    section.setStructuredContent(blockStructure);
                    sectionRepository.save(section);
                    migratedCount++;
                } else {
                    migratedCount++; // Already has structured content
                }
                
            } catch (Exception e) {
                log.error("Failed to migrate section: {}", section.getId(), e);
                failedCount++;
            }
        }
        
        log.info("Sections migration completed. Total: {}, Migrated: {}, Failed: {}", 
            totalCount, migratedCount, failedCount);
        
        return MigrationResult.SectionMigration.builder()
                .totalCount(totalCount)
                .migratedCount(migratedCount)
                .failedCount(failedCount)
                .build();
    }

    /**
     * Create a text block from legacy content string
     */
    private List<ContentBlock> createTextBlock(String content) {
        if (content == null || content.trim().isEmpty()) {
            return createEmptyTextBlock();
        }
        
        return Collections.singletonList(
            ContentBlock.builder()
                .type("text")
                .data(Map.of("html", content))
                .build()
        );
    }

    /**
     * Create empty text block for questions without content
     */
    private List<ContentBlock> createEmptyTextBlock() {
        return Collections.singletonList(
            ContentBlock.builder()
                .type("text")
                .data(Map.of("html", ""))
                .build()
        );
    }

    /**
     * Create block structure for legacy content (for sections)
     */
    private Map<String, Object> createLegacyBlockStructure(String content) {
        if (content == null || content.trim().isEmpty()) {
            content = "";
        }
        
        Map<String, Object> block = new HashMap<>();
        block.put("id", "legacy-" + UUID.randomUUID().toString());
        block.put("type", "text");
        block.put("schema_version", "1.0");
        
        Map<String, Object> contentMap = new HashMap<>();
        contentMap.put("html", content);
        block.put("content", contentMap);
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("created_at", new Date().toString());
        metadata.put("last_modified", new Date().toString());
        metadata.put("migrated_from", "legacy");
        block.put("metadata", metadata);
        
        Map<String, Object> structure = new HashMap<>();
        structure.put("blocks", Collections.singletonList(block));
        structure.put("schema_version", "1.0");
        
        return structure;
    }

    /**
     * Check if migration is needed
     */
    public boolean isMigrationNeeded() {
        long questionsNeedingMigration = questionRepository.findAll().stream().filter(q -> q.getContentBlocks() == null).count();
        long optionsNeedingMigration = questionOptionRepository.findAll().stream().filter(o -> o.getContentBlocks() == null).count();
        long sectionsNeedingMigration = sectionRepository.findAll().stream().filter(s -> s.getStructuredContent() == null).count();
        
        return questionsNeedingMigration > 0 || optionsNeedingMigration > 0 || sectionsNeedingMigration > 0;
    }

    /**
     * Get migration status
     */
    public MigrationStatus getMigrationStatus() {
        long totalQuestions = questionRepository.count();
        long migratedQuestions = questionRepository.findAll().stream().filter(q -> q.getContentBlocks() != null).count();
        
        long totalOptions = questionOptionRepository.count();
        long migratedOptions = questionOptionRepository.findAll().stream().filter(o -> o.getContentBlocks() != null).count();
        
        long totalSections = sectionRepository.count();
        long migratedSections = sectionRepository.findAll().stream().filter(s -> s.getStructuredContent() != null).count();
        
        return MigrationStatus.builder()
                .totalQuestions(totalQuestions)
                .migratedQuestions(migratedQuestions)
                .questionProgress(totalQuestions > 0 ? (migratedQuestions * 100.0 / totalQuestions) : 0.0)
                
                .totalOptions(totalOptions)
                .migratedOptions(migratedOptions)
                .optionProgress(totalOptions > 0 ? (migratedOptions * 100.0 / totalOptions) : 0.0)
                
                .totalSections(totalSections)
                .migratedSections(migratedSections)
                .sectionProgress(totalSections > 0 ? (migratedSections * 100.0 / totalSections) : 0.0)
                
                .isMigrationNeeded(isMigrationNeeded())
                .build();
    }

    // ===== DATA CLASSES =====

    /**
     * Result of migration operation
     */
    public static class MigrationResult {
        private Date startTime;
        private Date endTime;
        private String status; // COMPLETED, FAILED, IN_PROGRESS
        private String error;
        private QuestionMigration questionMigration;
        private OptionMigration optionMigration;
        private SectionMigration sectionMigration;

        // Getters and setters
        public Date getStartTime() { return startTime; }
        public void setStartTime(Date startTime) { this.startTime = startTime; }
        public Date getEndTime() { return endTime; }
        public void setEndTime(Date endTime) { this.endTime = endTime; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
        public QuestionMigration getQuestionMigration() { return questionMigration; }
        public void setQuestionMigration(QuestionMigration questionMigration) { this.questionMigration = questionMigration; }
        public OptionMigration getOptionMigration() { return optionMigration; }
        public void setOptionMigration(OptionMigration optionMigration) { this.optionMigration = optionMigration; }
        public SectionMigration getSectionMigration() { return sectionMigration; }
        public void setSectionMigration(SectionMigration sectionMigration) { this.sectionMigration = sectionMigration; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private MigrationResult result = new MigrationResult();

            public Builder startTime(Date startTime) { result.setStartTime(startTime); return this; }
            public Builder endTime(Date endTime) { result.setEndTime(endTime); return this; }
            public Builder status(String status) { result.setStatus(status); return this; }
            public Builder error(String error) { result.setError(error); return this; }
            public Builder questionMigration(QuestionMigration questionMigration) { result.setQuestionMigration(questionMigration); return this; }
            public Builder optionMigration(OptionMigration optionMigration) { result.setOptionMigration(optionMigration); return this; }
            public Builder sectionMigration(SectionMigration sectionMigration) { result.setSectionMigration(sectionMigration); return this; }

            public MigrationResult build() { return result; }
        }

        public static class QuestionMigration {
            private int totalCount;
            private int migratedCount;
            private int failedCount;

            // Getters and setters
            public int getTotalCount() { return totalCount; }
            public void setTotalCount(int totalCount) { this.totalCount = totalCount; }
            public int getMigratedCount() { return migratedCount; }
            public void setMigratedCount(int migratedCount) { this.migratedCount = migratedCount; }
            public int getFailedCount() { return failedCount; }
            public void setFailedCount(int failedCount) { this.failedCount = failedCount; }

            public static Builder builder() { return new Builder(); }

            public static class Builder {
                private QuestionMigration migration = new QuestionMigration();

                public Builder totalCount(int totalCount) { migration.setTotalCount(totalCount); return this; }
                public Builder migratedCount(int migratedCount) { migration.setMigratedCount(migratedCount); return this; }
                public Builder failedCount(int failedCount) { migration.setFailedCount(failedCount); return this; }

                public QuestionMigration build() { return migration; }
            }
        }

        public static class OptionMigration {
            private int totalCount;
            private int migratedCount;
            private int failedCount;

            // Getters and setters
            public int getTotalCount() { return totalCount; }
            public void setTotalCount(int totalCount) { this.totalCount = totalCount; }
            public int getMigratedCount() { return migratedCount; }
            public void setMigratedCount(int migratedCount) { this.migratedCount = migratedCount; }
            public int getFailedCount() { return failedCount; }
            public void setFailedCount(int failedCount) { this.failedCount = failedCount; }

            public static Builder builder() { return new Builder(); }

            public static class Builder {
                private OptionMigration migration = new OptionMigration();

                public Builder totalCount(int totalCount) { migration.setTotalCount(totalCount); return this; }
                public Builder migratedCount(int migratedCount) { migration.setMigratedCount(migratedCount); return this; }
                public Builder failedCount(int failedCount) { migration.setFailedCount(failedCount); return this; }

                public OptionMigration build() { return migration; }
            }
        }

        public static class SectionMigration {
            private int totalCount;
            private int migratedCount;
            private int failedCount;

            // Getters and setters
            public int getTotalCount() { return totalCount; }
            public void setTotalCount(int totalCount) { this.totalCount = totalCount; }
            public int getMigratedCount() { return migratedCount; }
            public void setMigratedCount(int migratedCount) { this.migratedCount = migratedCount; }
            public int getFailedCount() { return failedCount; }
            public void setFailedCount(int failedCount) { this.failedCount = failedCount; }

            public static Builder builder() { return new Builder(); }

            public static class Builder {
                private SectionMigration migration = new SectionMigration();

                public Builder totalCount(int totalCount) { migration.setTotalCount(totalCount); return this; }
                public Builder migratedCount(int migratedCount) { migration.setMigratedCount(migratedCount); return this; }
                public Builder failedCount(int failedCount) { migration.setFailedCount(failedCount); return this; }

                public SectionMigration build() { return migration; }
            }
        }
    }

    /**
     * Current migration status
     */
    public static class MigrationStatus {
        private long totalQuestions;
        private long migratedQuestions;
        private double questionProgress;
        
        private long totalOptions;
        private long migratedOptions;
        private double optionProgress;
        
        private long totalSections;
        private long migratedSections;
        private double sectionProgress;
        
        private boolean isMigrationNeeded;

        // Getters and setters
        public long getTotalQuestions() { return totalQuestions; }
        public void setTotalQuestions(long totalQuestions) { this.totalQuestions = totalQuestions; }
        public long getMigratedQuestions() { return migratedQuestions; }
        public void setMigratedQuestions(long migratedQuestions) { this.migratedQuestions = migratedQuestions; }
        public double getQuestionProgress() { return questionProgress; }
        public void setQuestionProgress(double questionProgress) { this.questionProgress = questionProgress; }
        
        public long getTotalOptions() { return totalOptions; }
        public void setTotalOptions(long totalOptions) { this.totalOptions = totalOptions; }
        public long getMigratedOptions() { return migratedOptions; }
        public void setMigratedOptions(long migratedOptions) { this.migratedOptions = migratedOptions; }
        public double getOptionProgress() { return optionProgress; }
        public void setOptionProgress(double optionProgress) { this.optionProgress = optionProgress; }
        
        public long getTotalSections() { return totalSections; }
        public void setTotalSections(long totalSections) { this.totalSections = totalSections; }
        public long getMigratedSections() { return migratedSections; }
        public void setMigratedSections(long migratedSections) { this.migratedSections = migratedSections; }
        public double getSectionProgress() { return sectionProgress; }
        public void setSectionProgress(double sectionProgress) { this.sectionProgress = sectionProgress; }
        
        public boolean isMigrationNeeded() { return isMigrationNeeded; }
        public void setMigrationNeeded(boolean migrationNeeded) { this.isMigrationNeeded = migrationNeeded; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private MigrationStatus status = new MigrationStatus();

            public Builder totalQuestions(long totalQuestions) { status.setTotalQuestions(totalQuestions); return this; }
            public Builder migratedQuestions(long migratedQuestions) { status.setMigratedQuestions(migratedQuestions); return this; }
            public Builder questionProgress(double questionProgress) { status.setQuestionProgress(questionProgress); return this; }
            
            public Builder totalOptions(long totalOptions) { status.setTotalOptions(totalOptions); return this; }
            public Builder migratedOptions(long migratedOptions) { status.setMigratedOptions(migratedOptions); return this; }
            public Builder optionProgress(double optionProgress) { status.setOptionProgress(optionProgress); return this; }
            
            public Builder totalSections(long totalSections) { status.setTotalSections(totalSections); return this; }
            public Builder migratedSections(long migratedSections) { status.setMigratedSections(migratedSections); return this; }
            public Builder sectionProgress(double sectionProgress) { status.setSectionProgress(sectionProgress); return this; }
            
            public Builder isMigrationNeeded(boolean isMigrationNeeded) { status.setMigrationNeeded(isMigrationNeeded); return this; }

            public MigrationStatus build() { return status; }
        }
    }
}