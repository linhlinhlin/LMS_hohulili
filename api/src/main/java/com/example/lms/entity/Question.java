package com.example.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.Collections;
import com.example.lms.domain.ContentBlock;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes; // Need this for JSONB if I didn't add it before, but Question.java seemed to have it later. Checking line 4 now.

@Entity
@Table(name = "questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    @Convert(converter = com.example.lms.converter.ContentBlockListConverter.class)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private List<com.example.lms.domain.ContentBlock> contentBlocks;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false)
    @Builder.Default
    private Difficulty difficulty = Difficulty.MEDIUM;

    @Column(columnDefinition = "TEXT")
    private String tags; // JSON array of tags

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "correct_option", nullable = false)
    private String correctOption; // A, B, C, D

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Package packageEntity;

    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "correct_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal correctRate = BigDecimal.ZERO; // percentage (0.0 to 100.0)

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("optionKey ASC")
    @Builder.Default
    private List<QuestionOption> options = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // ============ DOMAIN METHODS ============

    /**
     * Check if this question belongs to a specific course
     * @param courseId the course ID to check
     * @return true if question belongs to the course
     */
    public boolean belongsToCourse(UUID courseId) {
        return this.course != null && this.course.getId().equals(courseId);
    }

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }

    public enum Status {
        DRAFT, ACTIVE, INACTIVE
    }

    // New Block Accessors - Lombok @Data handles generic getters/setters, but if specific logic was here, we check:
    // Old code had: setContent() which converted string to blocks. This IS important logic.
    // I must KEEP the backward compatibility methods `getContent` and `setContent`.
    
    // Backward compatibility method
    public String getContent() {
        if (contentBlocks == null || contentBlocks.isEmpty()) {
            return "";
        }
        // Extract text from first text block for backward compatibility
        for (ContentBlock block : contentBlocks) {
            if ("text".equals(block.getType()) && block.getData() != null) {
                Object html = block.getData().get("html");
                return html != null ? html.toString() : "";
            }
        }
        return "";
    }
    
    public void setContent(String content) {
        // Convert legacy string to text block for backward compatibility
        if (content == null) {
            this.contentBlocks = null;
        } else {
            ContentBlock textBlock = ContentBlock.builder()
                .type("text")
                .data(java.util.Map.of("html", content))
                .build();
            this.contentBlocks = java.util.Collections.singletonList(textBlock);
        }
    }
}
