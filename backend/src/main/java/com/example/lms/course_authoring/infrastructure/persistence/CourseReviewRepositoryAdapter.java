package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.CourseReview;
import com.example.lms.course_authoring.domain.repository.CourseReviewRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseReviewJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseReviewJpaRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class CourseReviewRepositoryAdapter implements CourseReviewRepository {

    private final CourseReviewJpaRepository jpaRepository;

    public CourseReviewRepositoryAdapter(CourseReviewJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public CourseReview save(CourseReview review) {
        // Check if it's an update (existing entity in DB)
        Optional<CourseReviewJpaEntity> existing = jpaRepository.findById(review.getId());

        CourseReviewJpaEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setRating(review.getRating());
            entity.setComment(review.getComment());
            entity.setUpdatedAt(Instant.now());
        } else {
            entity = CourseReviewJpaEntity.builder()
                    .courseId(review.getCourseId())
                    .studentId(review.getStudentId())
                    .rating(review.getRating())
                    .comment(review.getComment())
                    .build();
        }

        CourseReviewJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<CourseReview> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<CourseReview> findByCourseId(UUID courseId) {
        return jpaRepository.findByCourseIdOrderByCreatedAtDesc(courseId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public Optional<CourseReview> findByCourseIdAndStudentId(UUID courseId, UUID studentId) {
        return jpaRepository.findByCourseIdAndStudentId(courseId, studentId).map(this::toDomain);
    }

    @Override
    public Double getAverageRating(UUID courseId) {
        return jpaRepository.getAverageRatingByCourseId(courseId);
    }

    @Override
    public long countByCourseId(UUID courseId) {
        return jpaRepository.countByCourseId(courseId);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    private CourseReview toDomain(CourseReviewJpaEntity entity) {
        return CourseReview.reconstitute(
                entity.getId(),
                entity.getCourseId(),
                entity.getStudentId(),
                entity.getRating(),
                entity.getComment(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
