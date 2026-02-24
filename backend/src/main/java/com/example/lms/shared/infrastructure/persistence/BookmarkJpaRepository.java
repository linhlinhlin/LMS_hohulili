package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.infrastructure.persistence.entity.BookmarkJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for BookmarkJpaEntity.
 */
@Repository
public interface BookmarkJpaRepository extends JpaRepository<BookmarkJpaEntity, UUID> {

    List<BookmarkJpaEntity> findByUserIdOrderByPositionAscCreatedAtDesc(UUID userId);

    List<BookmarkJpaEntity> findByUserIdAndCourseIdOrderByPositionAscCreatedAtDesc(UUID userId, UUID courseId);

    boolean existsByUserIdAndUrl(UUID userId, String url);
}
