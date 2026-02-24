package com.example.lms.assessment.domain.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Domain entity: hierarchical category within a QuestionBank.
 * Supports self-referencing parent_id (Moodle pattern).
 */
public class QuestionBankCategory {

    private UUID id;
    private UUID bankId;
    private UUID parentId; // null = root category
    private String name;
    private String description;
    private int sortOrder;
    private int questionCount;
    private List<QuestionBankCategory> children;
    private Instant createdAt;
    private Instant updatedAt;

    public QuestionBankCategory(UUID id, UUID bankId, UUID parentId, String name,
                                 String description, int sortOrder, int questionCount,
                                 Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.bankId = bankId;
        this.parentId = parentId;
        this.name = name;
        this.description = description;
        this.sortOrder = sortOrder;
        this.questionCount = questionCount;
        this.children = new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // ============ Factory ============

    public static QuestionBankCategory createRoot(UUID bankId, String name, String description, int sortOrder) {
        return new QuestionBankCategory(
                UUID.randomUUID(), bankId, null, name, description, sortOrder, 0,
                Instant.now(), null
        );
    }

    public static QuestionBankCategory createChild(UUID bankId, UUID parentId, String name, String description, int sortOrder) {
        if (parentId == null) {
            throw new IllegalArgumentException("Danh mục con phải có parentId");
        }
        return new QuestionBankCategory(
                UUID.randomUUID(), bankId, parentId, name, description, sortOrder, 0,
                Instant.now(), null
        );
    }

    // ============ Domain Behavior ============

    public void rename(String newName) {
        if (newName == null || newName.isBlank()) {
            throw new IllegalArgumentException("Tên danh mục không được để trống");
        }
        this.name = newName;
        this.updatedAt = Instant.now();
    }

    public void updateDescription(String description) {
        this.description = description;
        this.updatedAt = Instant.now();
    }

    public void reorder(int newSortOrder) {
        this.sortOrder = newSortOrder;
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

    public boolean isRoot() {
        return parentId == null;
    }

    public void addChild(QuestionBankCategory child) {
        this.children.add(child);
    }

    // ============ Getters ============

    public UUID getId() { return id; }
    public UUID getBankId() { return bankId; }
    public UUID getParentId() { return parentId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getSortOrder() { return sortOrder; }
    public int getQuestionCount() { return questionCount; }
    public List<QuestionBankCategory> getChildren() { return children; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
