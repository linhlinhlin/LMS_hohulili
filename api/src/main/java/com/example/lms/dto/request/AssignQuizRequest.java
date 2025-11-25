package com.example.lms.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request DTO for assigning a quiz to students
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignQuizRequest {

    @NotEmpty(message = "At least one student is required")
    private List<UUID> studentIds;

    private Instant dueDate;
}
