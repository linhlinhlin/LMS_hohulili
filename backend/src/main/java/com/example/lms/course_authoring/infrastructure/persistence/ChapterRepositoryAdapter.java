package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.repository.ChapterRepositoryPort;
import com.example.lms.course_authoring.infrastructure.persistence.entity.ChapterJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.ChapterJpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA Adapter implementing ChapterRepositoryPort domain port.
 */
@Repository
public class ChapterRepositoryAdapter implements ChapterRepositoryPort {

    private final ChapterJpaRepository jpaRepository;

    public ChapterRepositoryAdapter(ChapterJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public UUID save(UUID courseId, String title, String description, Integer orderIndex) {
        ChapterJpaEntity entity = ChapterJpaEntity.builder()
                .courseId(courseId)
                .title(title)
                .description(description)
                .orderIndex(orderIndex != null ? orderIndex : 0)
                .build();
        ChapterJpaEntity saved = jpaRepository.save(entity);
        return saved.getId();
    }

    @Override
    public Optional<UUID> findIdByCourseIdAndOrderIndex(UUID courseId, Integer orderIndex) {
        int normalizedOrderIndex = orderIndex != null ? orderIndex : 0;
        return jpaRepository.findByCourseIdAndOrderIndex(courseId, normalizedOrderIndex)
                .map(ChapterJpaEntity::getId);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public long countByCourseId(UUID courseId) {
        return jpaRepository.countByCourseId(courseId);
    }
}
