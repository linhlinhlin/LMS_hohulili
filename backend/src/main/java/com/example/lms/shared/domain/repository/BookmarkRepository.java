package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.Bookmark;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Port interface for Bookmark persistence.
 * Implemented by BookmarkRepositoryAdapter in the infrastructure layer.
 */
public interface BookmarkRepository {

    Bookmark save(Bookmark bookmark);

    Optional<Bookmark> findById(UUID id);

    List<Bookmark> findByUserId(UUID userId);

    List<Bookmark> findByUserIdAndCourseId(UUID userId, UUID courseId);

    void deleteById(UUID id);

    boolean existsByUserIdAndUrl(UUID userId, String url);
}
