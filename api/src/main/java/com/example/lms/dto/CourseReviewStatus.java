package com.example.lms.dto;

import com.example.lms.entity.Course;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseReviewStatus {
    
    private String status;
    private String reviewComment;
    private Instant reviewedAt;
    private String reviewerName;
    private String reviewerEmail;
    
    // Convert from Course entity to DTO
    public static CourseReviewStatus fromCourse(Course course) {
        if (course == null) return null;
        
        return CourseReviewStatus.builder()
                .status(course.getStatus() != null ? course.getStatus().name() : null)
                .reviewComment(course.getReviewComment())
                .reviewedAt(course.getReviewedAt())
                .reviewerName(course.getReviewedBy() != null ? course.getReviewedBy().getFullName() : null)
                .reviewerEmail(course.getReviewedBy() != null ? course.getReviewedBy().getEmail() : null)
                .build();
    }
}
