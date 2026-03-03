package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.CourseTag;
import com.example.lms.course_authoring.domain.repository.CourseTagRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagAssignmentJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseTagJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseTagAssignmentJpaRepository;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseTagJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Component
@RequiredArgsConstructor
public class CourseTagRepositoryAdapter implements CourseTagRepository {

    private final CourseTagJpaRepository tagRepo;
    private final CourseTagAssignmentJpaRepository assignmentRepo;

    @Override
    public List<CourseTag> findAll() {
        return tagRepo.findAllByOrderByNameAsc().stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<CourseTag> findById(UUID id) {
        return tagRepo.findById(id).map(this::toDomain);
    }

    @Override
    public CourseTag save(CourseTag tag) {
        var entity = CourseTagJpaEntity.builder()
                .id(tag.getId())
                .name(tag.getName())
                .slug(tag.getSlug())
                .build();
        return toDomain(tagRepo.save(entity));
    }

    @Override
    public void deleteById(UUID id) { tagRepo.deleteById(id); }

    @Override
    public boolean existsByName(String name) { return tagRepo.existsByName(name); }

    @Override
    public boolean existsBySlug(String slug) { return tagRepo.existsBySlug(slug); }

    @Override
    public List<CourseTag> findByCourseId(UUID courseId) {
        var tagIds = assignmentRepo.findTagIdsByCourseId(courseId);
        if (tagIds.isEmpty()) return List.of();
        return tagRepo.findAllById(tagIds).stream().map(this::toDomain).toList();
    }

    @Override
    @Transactional
    public void assignTagsToCourse(UUID courseId, Set<UUID> tagIds) {
        assignmentRepo.deleteAllByCourseId(courseId);
        for (var tagId : tagIds) {
            assignmentRepo.save(new CourseTagAssignmentJpaEntity(courseId, tagId));
        }
    }

    @Override
    @Transactional
    public void removeAllTagsFromCourse(UUID courseId) {
        assignmentRepo.deleteAllByCourseId(courseId);
    }

    @Override
    public long countByCourseId(UUID courseId) {
        return assignmentRepo.countByCourseId(courseId);
    }

    private CourseTag toDomain(CourseTagJpaEntity e) {
        return CourseTag.reconstitute(e.getId(), e.getName(), e.getSlug(), e.getCreatedAt());
    }
}
