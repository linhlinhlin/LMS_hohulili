package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ManageCourseCategoryUseCase {

    private final CourseCategoryRepository categoryRepo;

    public List<CourseCategory> getAllTree() {
        return categoryRepo.findAll();
    }

    public List<CourseCategory> getActiveTree() {
        return categoryRepo.findAllActiveTree();
    }

    /**
     * Returns a map of {@code categoryId → number of APPROVED courses} for
     * populating the {@code courseCount} field on category DTOs (issue #189).
     * Categories absent from the map have zero published courses.
     */
    public Map<UUID, Long> getApprovedCourseCountsByCategory() {
        return categoryRepo.countApprovedCoursesByCategory();
    }

    @Transactional
    public CourseCategory createRoot(String code, String name, String slug, String prefix, String description, String icon) {
        if (categoryRepo.existsByCode(code))
            throw new BusinessRuleException("CATEGORY_CODE_EXISTS", "Ma danh muc da ton tai: " + code);
        if (categoryRepo.existsBySlug(slug))
            throw new BusinessRuleException("CATEGORY_SLUG_EXISTS", "Slug da ton tai: " + slug);
        if (prefix != null && !prefix.isBlank() && categoryRepo.existsByPrefix(prefix))
            throw new BusinessRuleException("CATEGORY_PREFIX_EXISTS", "Prefix da ton tai: " + prefix);

        var category = CourseCategory.createRoot(code, name, slug, prefix, description, icon);
        return categoryRepo.save(category);
    }

    @Transactional
    public CourseCategory createSub(UUID parentId, String code, String name, String slug, String description) {
        var parent = categoryRepo.findById(parentId)
                .orElseThrow(() -> new EntityNotFoundException("Danh muc cha", parentId));
        if (!parent.isRoot())
            throw new BusinessRuleException("MAX_DEPTH_EXCEEDED", "Chi ho tro 2 cap danh muc. Khong the tao danh muc con cho danh muc con.");
        if (categoryRepo.existsByCode(code))
            throw new BusinessRuleException("CATEGORY_CODE_EXISTS", "Ma danh muc da ton tai: " + code);
        if (categoryRepo.existsBySlug(slug))
            throw new BusinessRuleException("CATEGORY_SLUG_EXISTS", "Slug da ton tai: " + slug);

        var sub = CourseCategory.createSub(parentId, code, name, slug, description);
        return categoryRepo.save(sub);
    }

    @Transactional
    public CourseCategory update(UUID id, String name, String slug, String description, String icon, String prefix) {
        var category = categoryRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Danh muc", id));
        category.update(name, slug, description, icon);
        if (category.isRoot() && prefix != null) {
            category.updatePrefix(prefix);
        }
        return categoryRepo.save(category);
    }

    @Transactional
    public void deactivate(UUID id) {
        var category = categoryRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Danh muc", id));
        category.deactivate();
        categoryRepo.save(category);
    }

    @Transactional
    public void reorder(List<UUID> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            final int index = i;
            var category = categoryRepo.findById(orderedIds.get(index))
                    .orElseThrow(() -> new EntityNotFoundException("Danh muc", orderedIds.get(index)));
            category.reorder(index);
            categoryRepo.save(category);
        }
    }
}
