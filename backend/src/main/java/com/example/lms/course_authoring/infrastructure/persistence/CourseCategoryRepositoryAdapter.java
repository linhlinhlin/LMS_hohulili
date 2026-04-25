package com.example.lms.course_authoring.infrastructure.persistence;

import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.course_authoring.infrastructure.persistence.entity.CourseCategoryJpaEntity;
import com.example.lms.course_authoring.infrastructure.persistence.repository.CourseCategoryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
public class CourseCategoryRepositoryAdapter implements CourseCategoryRepository {

    private final CourseCategoryJpaRepository jpaRepo;

    @Override
    public Optional<CourseCategory> findById(UUID id) {
        return jpaRepo.findById(id).map(this::toDomain);
    }

    @Override
    public List<CourseCategory> findAllRoots() {
        return jpaRepo.findByParentIdIsNullOrderBySortOrder().stream()
                .map(this::toDomain).toList();
    }

    @Override
    public List<CourseCategory> findChildrenOf(UUID parentId) {
        return jpaRepo.findByParentIdOrderBySortOrder(parentId).stream()
                .map(this::toDomain).toList();
    }

    @Override
    public List<CourseCategory> findAllActiveTree() {
        var all = jpaRepo.findByActiveTrue();
        return buildTree(all);
    }

    @Override
    public List<CourseCategory> findAll() {
        var all = jpaRepo.findAllOrdered();
        return buildTree(all);
    }

    @Override
    public CourseCategory save(CourseCategory category) {
        var entity = toEntity(category);
        var saved = jpaRepo.save(entity);
        return toDomain(saved);
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepo.deleteById(id);
    }

    @Override
    public boolean existsByCode(String code) { return jpaRepo.existsByCode(code); }

    @Override
    public boolean existsBySlug(String slug) { return jpaRepo.existsBySlug(slug); }

    @Override
    public boolean existsByPrefix(String prefix) { return jpaRepo.existsByPrefix(prefix); }

    @Override
    public Map<UUID, Long> countApprovedCoursesByCategory() {
        Map<UUID, Long> result = new HashMap<>();
        for (Object[] row : jpaRepo.countApprovedCoursesByCategory()) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) continue;
            result.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return result;
    }

    // --- Mapping ---

    private CourseCategory toDomain(CourseCategoryJpaEntity e) {
        return CourseCategory.reconstitute(
                e.getId(), e.getParentId(), e.getCode(), e.getName(), e.getSlug(),
                e.getPrefix(), e.getDescription(), e.getIcon(),
                e.getSortOrder(), e.isActive(), e.getCreatedAt(), e.getUpdatedAt()
        );
    }

    private CourseCategoryJpaEntity toEntity(CourseCategory c) {
        return CourseCategoryJpaEntity.builder()
                .id(c.getId())
                .parentId(c.getParentId())
                .code(c.getCode())
                .name(c.getName())
                .slug(c.getSlug())
                .prefix(c.getPrefix())
                .description(c.getDescription())
                .icon(c.getIcon())
                .sortOrder(c.getSortOrder())
                .active(c.isActive())
                .build();
    }

    private List<CourseCategory> buildTree(List<CourseCategoryJpaEntity> all) {
        Map<UUID, CourseCategory> map = new LinkedHashMap<>();
        List<CourseCategory> roots = new ArrayList<>();

        for (var e : all) {
            map.put(e.getId(), toDomain(e));
        }
        for (var cat : map.values()) {
            if (cat.isRoot()) {
                roots.add(cat);
            } else if (map.containsKey(cat.getParentId())) {
                map.get(cat.getParentId()).addChild(cat);
            }
        }
        return roots;
    }
}
