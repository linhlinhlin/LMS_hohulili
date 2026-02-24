package com.example.lms.assessment.domain.model;

import java.time.Instant;
import java.util.UUID;

/**
 * Aggregate root: QuestionBank.
 * Maps to existing 'packages' table (evolved with bank_type, status, question_count).
 */
public class QuestionBank {

    private UUID id;
    private String name;
    private String description;
    private String subject;
    private UUID ownerId;
    private BankType bankType;
    private Visibility visibility;
    private Status status;
    private int questionCount;
    private Instant createdAt;
    private Instant updatedAt;

    public QuestionBank(UUID id, String name, String description, String subject,
                        UUID ownerId, BankType bankType, Visibility visibility,
                        Status status, int questionCount, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.subject = subject;
        this.ownerId = ownerId;
        this.bankType = bankType != null ? bankType : BankType.PERSONAL;
        this.visibility = visibility != null ? visibility : Visibility.PRIVATE;
        this.status = status != null ? status : Status.ACTIVE;
        this.questionCount = questionCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // ============ Factory ============

    public static QuestionBank create(String name, String description, String subject,
                                       UUID ownerId, BankType bankType, Visibility visibility) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Tên ngân hàng câu hỏi không được để trống");
        }
        if (ownerId == null) {
            throw new IllegalArgumentException("ID chủ sở hữu là bắt buộc");
        }
        return new QuestionBank(
                UUID.randomUUID(), name, description, subject, ownerId,
                bankType, visibility, Status.ACTIVE, 0,
                Instant.now(), null
        );
    }

    // ============ Domain Behavior ============

    public void rename(String newName) {
        if (newName == null || newName.isBlank()) {
            throw new IllegalArgumentException("Tên ngân hàng câu hỏi không được để trống");
        }
        this.name = newName;
        this.updatedAt = Instant.now();
    }

    public void updateDescription(String description) {
        this.description = description;
        this.updatedAt = Instant.now();
    }

    public void updateSubject(String subject) {
        this.subject = subject;
        this.updatedAt = Instant.now();
    }

    public void changeVisibility(Visibility visibility) {
        this.visibility = visibility;
        this.updatedAt = Instant.now();
    }

    public void archive() {
        if (this.status == Status.ARCHIVED) {
            throw new IllegalStateException("Ngân hàng câu hỏi đã được lưu trữ");
        }
        this.status = Status.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    public void activate() {
        if (this.status == Status.ACTIVE) {
            throw new IllegalStateException("Ngân hàng câu hỏi đã hoạt động");
        }
        this.status = Status.ACTIVE;
        this.updatedAt = Instant.now();
    }

    public void incrementQuestionCount() {
        this.questionCount++;
        this.updatedAt = Instant.now();
    }

    public void decrementQuestionCount() {
        if (this.questionCount > 0) {
            this.questionCount--;
        }
        this.updatedAt = Instant.now();
    }

    public void setQuestionCount(int count) {
        this.questionCount = Math.max(0, count);
        this.updatedAt = Instant.now();
    }

    public boolean isOwnedBy(UUID userId) {
        return this.ownerId.equals(userId);
    }

    public boolean isActive() {
        return this.status == Status.ACTIVE;
    }

    public boolean isPublic() {
        return this.visibility == Visibility.PUBLIC;
    }

    // ============ Getters ============

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getSubject() { return subject; }
    public UUID getOwnerId() { return ownerId; }
    public BankType getBankType() { return bankType; }
    public Visibility getVisibility() { return visibility; }
    public Status getStatus() { return status; }
    public int getQuestionCount() { return questionCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // ============ Enums ============

    public enum BankType {
        PERSONAL, DEPARTMENT, INSTITUTIONAL
    }

    public enum Visibility {
        PUBLIC, PRIVATE
    }

    public enum Status {
        ACTIVE, ARCHIVED
    }
}
