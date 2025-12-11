package com.example.lms.dto.request;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request DTO for assigning a quiz to students
 */
public class AssignQuizRequest {

    @NotEmpty(message = "At least one student is required")
    private List<UUID> studentIds;

    private Instant dueDate;

    public AssignQuizRequest() {}

    public AssignQuizRequest(List<UUID> studentIds, Instant dueDate) {
        this.studentIds = studentIds;
        this.dueDate = dueDate;
    }

    // Getters and Setters
    public List<UUID> getStudentIds() { return studentIds; }
    public void setStudentIds(List<UUID> studentIds) { this.studentIds = studentIds; }
    public Instant getDueDate() { return dueDate; }
    public void setDueDate(Instant dueDate) { this.dueDate = dueDate; }

    // Builder
    public static AssignQuizRequestBuilder builder() { return new AssignQuizRequestBuilder(); }
    public static class AssignQuizRequestBuilder {
        private AssignQuizRequest r = new AssignQuizRequest();
        public AssignQuizRequestBuilder studentIds(List<UUID> s) { r.setStudentIds(s); return this; }
        public AssignQuizRequestBuilder dueDate(Instant d) { r.setDueDate(d); return this; }
        public AssignQuizRequest build() { return r; }
    }
}
