package com.example.lms.course_authoring.infrastructure.web;

import com.example.lms.course_authoring.application.usecase.CourseReviewUseCase;
import com.example.lms.course_authoring.domain.model.CourseReview;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Tag(name = "Course Reviews V3", description = "Course review and rating endpoints")
@RestController
@RequestMapping("/api/v3/courses/{courseId}/reviews")
@RequiredArgsConstructor
public class CourseReviewControllerV3 {

    private final CourseReviewUseCase reviewUseCase;
    private final UserJpaRepository userJpaRepository;

    @Operation(summary = "Submit or update a review")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitReview(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID courseId,
            @Valid @RequestBody SubmitReviewRequest request) {

        UUID studentId = currentUser.getId();
        CourseReview review = reviewUseCase.submitReview(
                studentId, courseId, request.rating(), request.comment());

        return ResponseEntity.ok(ApiResponse.success(toMap(review), "Đánh giá đã được lưu"));
    }

    @Operation(summary = "Get reviews for a course (public)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReviews(
            @PathVariable UUID courseId) {

        List<CourseReview> reviews = reviewUseCase.getReviewsByCourse(courseId);

        // P1-2: Batch load student names (N+1 fix — single query instead of per-review)
        Set<UUID> studentIds = new HashSet<>();
        reviews.forEach(r -> studentIds.add(r.getStudentId()));
        Map<UUID, String> nameMap = new HashMap<>();
        if (!studentIds.isEmpty()) {
            userJpaRepository.findAllById(studentIds).forEach(u ->
                    nameMap.put(u.getId(), u.getFullName()));
        }

        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> map = toMap(r);
            map.put("studentName", nameMap.getOrDefault(r.getStudentId(), ""));
            return map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(result, "Danh sách đánh giá"));
    }

    @Operation(summary = "Get review summary for a course (public)")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReviewSummary(
            @PathVariable UUID courseId) {

        Map<String, Object> summary = reviewUseCase.getReviewSummary(courseId);
        return ResponseEntity.ok(ApiResponse.success(summary, "Tổng hợp đánh giá"));
    }

    @Operation(summary = "Get my review for a course")
    @GetMapping("/my-review")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyReview(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID courseId) {

        UUID studentId = currentUser.getId();
        return reviewUseCase.getMyReview(studentId, courseId)
                .map(r -> ResponseEntity.ok(ApiResponse.success(toMap(r), "Đánh giá của tôi")))
                .orElse(ResponseEntity.ok(ApiResponse.success(null, "Chưa có đánh giá")));
    }

    @Operation(summary = "Delete own review")
    @DeleteMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @AuthenticationPrincipal UserJpaEntity currentUser,
            @PathVariable UUID courseId,
            @PathVariable UUID reviewId) {

        UUID studentId = currentUser.getId();
        reviewUseCase.deleteReview(studentId, reviewId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đánh giá đã được xóa"));
    }

    // ===== Helpers =====

    private Map<String, Object> toMap(CourseReview review) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", review.getId().toString());
        map.put("courseId", review.getCourseId().toString());
        map.put("studentId", review.getStudentId().toString());
        map.put("rating", review.getRating());
        map.put("comment", review.getComment());
        map.put("createdAt", review.getCreatedAt() != null ? review.getCreatedAt().toString() : null);
        map.put("updatedAt", review.getUpdatedAt() != null ? review.getUpdatedAt().toString() : null);
        return map;
    }

    // ===== Request DTOs =====

    public record SubmitReviewRequest(
            @NotNull @Min(1) @Max(5) Integer rating,
            String comment
    ) {}
}
