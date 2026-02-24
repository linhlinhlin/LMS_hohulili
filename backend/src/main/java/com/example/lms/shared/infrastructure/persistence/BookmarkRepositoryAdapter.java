package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.domain.model.Bookmark;
import com.example.lms.shared.domain.repository.BookmarkRepository;
import com.example.lms.shared.infrastructure.persistence.entity.BookmarkJpaEntity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Adapter implementing the BookmarkRepository port.
 * Converts between JPA entity and domain model.
 */
@Component
public class BookmarkRepositoryAdapter implements BookmarkRepository {

    private final BookmarkJpaRepository jpaRepository;

    public BookmarkRepositoryAdapter(BookmarkJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Bookmark save(Bookmark bookmark) {
        Optional<BookmarkJpaEntity> existing = jpaRepository.findById(bookmark.getId());

        BookmarkJpaEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setTitle(bookmark.getTitle());
            entity.setPosition(bookmark.getPosition());
        } else {
            entity = BookmarkJpaEntity.builder()
                    .id(bookmark.getId())
                    .userId(bookmark.getUserId())
                    .courseId(bookmark.getCourseId())
                    .lessonId(bookmark.getLessonId())
                    .title(bookmark.getTitle())
                    .url(bookmark.getUrl())
                    .position(bookmark.getPosition())
                    .metadata(bookmark.getMetadata())
                    .build();
        }

        BookmarkJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Bookmark> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Bookmark> findByUserId(UUID userId) {
        return jpaRepository.findByUserIdOrderByPositionAscCreatedAtDesc(userId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public List<Bookmark> findByUserIdAndCourseId(UUID userId, UUID courseId) {
        return jpaRepository.findByUserIdAndCourseIdOrderByPositionAscCreatedAtDesc(userId, courseId).stream()
                .map(this::toDomain)
                .toList();
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public boolean existsByUserIdAndUrl(UUID userId, String url) {
        return jpaRepository.existsByUserIdAndUrl(userId, url);
    }

    private Bookmark toDomain(BookmarkJpaEntity entity) {
        return Bookmark.reconstitute(
                entity.getId(),
                entity.getUserId(),
                entity.getCourseId(),
                entity.getLessonId(),
                entity.getTitle(),
                entity.getUrl(),
                entity.getPosition(),
                entity.getMetadata(),
                entity.getCreatedAt()
        );
    }
}
