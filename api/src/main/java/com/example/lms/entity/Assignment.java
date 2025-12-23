package com.example.lms.entity;

import jakarta.persistence.*;
import jakarta.persistence.Convert;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assignment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;
    
    @Column(nullable = false)
    private String title;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String instructions;
    
    @Column(name = "due_date")
    private LocalDateTime dueDate;
    
    @Column(name = "max_score", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal maxScore = BigDecimal.valueOf(100.00);
    
    @Column(name = "assignment_type")
    @Convert(converter = com.example.lms.entity.converter.AssignmentTypeConverter.class)
    @Builder.Default
    private AssignmentType assignmentType = AssignmentType.FILE_SUBMISSION;
    
    @Column(name = "assignment_config", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> assignmentConfig; // JSON object for type-specific config
    
    @Column(name = "status")
    @Convert(converter = com.example.lms.entity.converter.AssignmentStatusConverter.class)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.PUBLISHED;
    
    @OneToOne(mappedBy = "assignment")
    private LessonAssignment lessonAssignment;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Submission> submissions;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AssignmentAllocation> allocations;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AssignmentAttachment> attachments;

    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AssignmentRubric> rubrics;
    
    public enum AssignmentType {
        ESSAY, QUIZ, PROGRAMMING, PROJECT, FILE_SUBMISSION
    }
    
    public enum AssignmentStatus {
        DRAFT, PUBLISHED, CLOSED
    }
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // Manual Getters/Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public BigDecimal getMaxScore() { return maxScore; }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }
    public AssignmentType getAssignmentType() { return assignmentType; }
    public void setAssignmentType(AssignmentType assignmentType) { this.assignmentType = assignmentType; }
    public Map<String, Object> getAssignmentConfig() { return assignmentConfig; }
    public void setAssignmentConfig(Map<String, Object> assignmentConfig) { this.assignmentConfig = assignmentConfig; }
    public AssignmentStatus getStatus() { return status; }
    public void setStatus(AssignmentStatus status) { this.status = status; }
    public LessonAssignment getLessonAssignment() { return lessonAssignment; }
    public void setLessonAssignment(LessonAssignment lessonAssignment) { this.lessonAssignment = lessonAssignment; }
    public List<Submission> getSubmissions() { return submissions; }
    public void setSubmissions(List<Submission> submissions) { this.submissions = submissions; }
    public List<AssignmentAllocation> getAllocations() { return allocations; }
    public void setAllocations(List<AssignmentAllocation> allocations) { this.allocations = allocations; }
    
    /**
     * Helper to get the primary allocation for this assignment.
     * In most cases, an assignment has one main distribution setting.
     */
    public AssignmentAllocation getAllocation() {
        if (allocations == null || allocations.isEmpty()) {
            return null;
        }
        return allocations.get(0);
    }

    public List<AssignmentAttachment> getAttachments() { return attachments; }
    public void setAttachments(List<AssignmentAttachment> attachments) { this.attachments = attachments; }
    public List<AssignmentRubric> getRubrics() { return rubrics; }
    public void setRubrics(List<AssignmentRubric> rubrics) { this.rubrics = rubrics; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    // Manual Builder
    public static AssignmentBuilder builder() { return new AssignmentBuilder(); }
    public static class AssignmentBuilder {
        private Assignment a = new Assignment();
        public AssignmentBuilder id(UUID id) { a.setId(id); return this; }
        public AssignmentBuilder course(Course c) { a.setCourse(c); return this; }
        public AssignmentBuilder title(String t) { a.setTitle(t); return this; }
        public AssignmentBuilder description(String d) { a.setDescription(d); return this; }
        public AssignmentBuilder instructions(String i) { a.setInstructions(i); return this; }
        public AssignmentBuilder dueDate(LocalDateTime d) { a.setDueDate(d); return this; }
        public AssignmentBuilder maxScore(BigDecimal m) { a.setMaxScore(m); return this; }
        public AssignmentBuilder assignmentType(AssignmentType t) { a.setAssignmentType(t); return this; }
        public AssignmentBuilder assignmentConfig(Map<String, Object> c) { a.setAssignmentConfig(c); return this; }
        public AssignmentBuilder status(AssignmentStatus s) { a.setStatus(s); return this; }
        public AssignmentBuilder lessonAssignment(LessonAssignment l) { a.setLessonAssignment(l); return this; }
        public AssignmentBuilder submissions(List<Submission> s) { a.setSubmissions(s); return this; }
        public AssignmentBuilder allocations(List<AssignmentAllocation> a) { this.a.setAllocations(a); return this; }
        public AssignmentBuilder attachments(List<AssignmentAttachment> at) { a.setAttachments(at); return this; }
        public AssignmentBuilder rubrics(List<AssignmentRubric> r) { a.setRubrics(r); return this; }
        public AssignmentBuilder createdAt(Instant c) { a.setCreatedAt(c); return this; }
        public AssignmentBuilder updatedAt(Instant u) { a.setUpdatedAt(u); return this; }
        public Assignment build() { return a; }
    }
}
