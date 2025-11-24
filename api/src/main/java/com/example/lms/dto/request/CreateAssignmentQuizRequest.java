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
 * Request DTO for creating an assignment quiz
 * Used when creating standalone quiz for homework/assignment
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssignmentQuizRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    // Quiz Configuration
    @Min(value = 1, message = "Time limit must be at least 1 minute")
    @Max(value = 300, message = "Time limit must not exceed 300 minutes")
    private Integer timeLimitMinutes;

    @NotNull(message = "Max attempts is required")
    @Min(value = 1, message = "Max attempts must be at least 1")
    @Max(value = 10, message = "Max attempts must not exceed 10")
    @Builder.Default
    private Integer maxAttempts = 3;

    @NotNull(message = "Passing score is required")
    @Min(value = 0, message = "Passing score must be between 0 and 100")
    @Max(value = 100, message = "Passing score must be between 0 and 100")
    @Builder.Default
    private Integer passingScore = 60;

    @Builder.Default
    private Boolean shuffleQuestions = true;

    @Builder.Default
    private Boolean shuffleOptions = false;

    @Builder.Default
    private Boolean showResultsImmediately = true;

    @Builder.Default
    private Boolean showCorrectAnswers = true;

    private Instant startDate;

    private Instant endDate;

    // Question Selection
    @NotEmpty(message = "At least one question is required")
    private List<UUID> questionIds;

    @Builder.Default
    private Boolean publishImmediately = true;
}
