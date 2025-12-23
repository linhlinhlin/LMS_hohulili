package com.example.lms.dto;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StudentSummaryDTO {
    private UUID id; // User ID
    private String fullName;
    private String email;
    private Instant enrolledAt;
    private Integer progress; // Percent
    private String status; // Enrollment Status
}
