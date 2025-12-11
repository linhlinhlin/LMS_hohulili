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
    
    // Manual Getters/Setters
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReviewComment() { return reviewComment; }
    public void setReviewComment(String reviewComment) { this.reviewComment = reviewComment; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
    public String getReviewerName() { return reviewerName; }
    public void setReviewerName(String reviewerName) { this.reviewerName = reviewerName; }
    public String getReviewerEmail() { return reviewerEmail; }
    public void setReviewerEmail(String reviewerEmail) { this.reviewerEmail = reviewerEmail; }

    public static CourseReviewStatusBuilder builder() { return new CourseReviewStatusBuilder(); }
    public static class CourseReviewStatusBuilder {
        private CourseReviewStatus dto = new CourseReviewStatus();
        public CourseReviewStatusBuilder status(String s) { dto.setStatus(s); return this; }
        public CourseReviewStatusBuilder reviewComment(String c) { dto.setReviewComment(c); return this; }
        public CourseReviewStatusBuilder reviewedAt(Instant r) { dto.setReviewedAt(r); return this; }
        public CourseReviewStatusBuilder reviewerName(String n) { dto.setReviewerName(n); return this; }
        public CourseReviewStatusBuilder reviewerEmail(String e) { dto.setReviewerEmail(e); return this; }
        public CourseReviewStatus build() { return dto; }
    }
}
