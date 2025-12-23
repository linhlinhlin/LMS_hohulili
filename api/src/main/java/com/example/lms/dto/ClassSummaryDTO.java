package com.example.lms.dto;

import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassSummaryDTO {
    private UUID id;
    private String name;
    private String code;
    private String teacherName;
    private Instant startDate;
    private Instant endDate;
    private Integer maxStudents;
    private String scheduleType;
    private String semester;
    private String status;
    @Builder.Default
    private Long currentStudents = 0L;
}
