package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Drag-drop reorder + reparent endpoint backing for the admin Categories page
 * (issue #199, epic #186 F-CAT1).
 *
 * <p>Two-level taxonomy invariants this use case enforces:
 * <ol>
 *   <li>Category cannot become its own parent (cycle).</li>
 *   <li>Destination parent must itself be a root category — we do not allow
 *       grandchildren ("level 3").</li>
 *   <li>A root category that already has children cannot be demoted to a
 *       sub (its children would become level 3).</li>
 * </ol>
 *
 * <p>After the move, sibling sort orders are renumbered 0..n-1 in the new
 * destination so the FE can render a stable order on reload (UI sends a
 * single intended index — BE owns the canonical numbering).
 */
@Service
@RequiredArgsConstructor
public class MoveCategoryUseCase {

    private final CourseCategoryRepository categoryRepo;

    @Transactional
    public List<CourseCategory> execute(UUID categoryId, UUID newParentId, int newSortOrder) {
        if (categoryId == null) {
            throw new IllegalArgumentException("categoryId is required");
        }
        if (newSortOrder < 0) {
            throw new IllegalArgumentException("sortOrder must be >= 0");
        }

        var category = categoryRepo.findById(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("Danh muc", categoryId));

        // Cycle guard — domain also enforces, but we surface a friendlier code
        // before touching anything else.
        if (newParentId != null && newParentId.equals(categoryId)) {
            throw new BusinessRuleException(
                    "INVALID_PARENT",
                    "Danh muc khong the la cha cua chinh no");
        }

        // Demoting a root that has children would push its children to level 3.
        // Note: findById() does not eagerly populate children — query the
        // children list directly so the rule fires regardless of fetch
        // strategy.
        if (newParentId != null && category.isRoot()) {
            var existingChildren = categoryRepo.findChildrenOf(categoryId);
            if (!existingChildren.isEmpty()) {
                throw new BusinessRuleException(
                        "MAX_DEPTH_EXCEEDED",
                        "Khong the chuyen danh muc cha xuong lam danh muc con vi se vuot qua 2 cap.");
            }
        }

        // Destination parent must be a root.
        if (newParentId != null) {
            var newParent = categoryRepo.findById(newParentId)
                    .orElseThrow(() -> new EntityNotFoundException("Danh muc cha", newParentId));
            if (!newParent.isRoot()) {
                throw new BusinessRuleException(
                        "MAX_DEPTH_EXCEEDED",
                        "Chi ho tro 2 cap danh muc. Danh muc dich phai la danh muc goc.");
            }
        }

        category.moveTo(newParentId, newSortOrder);
        categoryRepo.save(category);

        // Renumber siblings in the destination collection so that ordering is
        // contiguous and matches the user's intent. We refetch the full tree
        // to source the post-move state, then renumber the destination level.
        renumberSiblings(newParentId, categoryId, newSortOrder);

        return categoryRepo.findAll();
    }

    /**
     * Renumbers siblings in the destination collection so the moved category
     * lands at {@code targetIndex} and remaining siblings shift around it.
     *
     * <p>We collect the destination siblings via dedicated repository queries
     * ({@code findAllRoots} or {@code findChildrenOf}) rather than walking the
     * tree returned by {@code findAll} — the moved category lives in its
     * destination level after save, but the tree projection can place it
     * inside a parent's {@code children} list which made flat-stream filters
     * miss it.
     */
    private void renumberSiblings(UUID parentId, UUID movedId, int targetIndex) {
        List<CourseCategory> destinationSiblings = parentId == null
                ? categoryRepo.findAllRoots()
                : categoryRepo.findChildrenOf(parentId);

        // Separate the moved category — we'll re-insert at targetIndex so
        // siblings shift around it deterministically.
        var moved = destinationSiblings.stream()
                .filter(c -> c.getId().equals(movedId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Moved category not found in destination after save: " + movedId));

        var others = destinationSiblings.stream()
                .filter(c -> !c.getId().equals(movedId))
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));

        int insertAt = Math.min(targetIndex, others.size());
        others.add(insertAt, moved);

        for (int i = 0; i < others.size(); i++) {
            var s = others.get(i);
            if (s.getSortOrder() != i) {
                s.reorder(i);
                categoryRepo.save(s);
            }
        }
    }
}
