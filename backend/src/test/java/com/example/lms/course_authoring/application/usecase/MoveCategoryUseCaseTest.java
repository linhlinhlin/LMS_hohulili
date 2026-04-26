package com.example.lms.course_authoring.application.usecase;

import com.example.lms.course_authoring.domain.model.CourseCategory;
import com.example.lms.course_authoring.domain.repository.CourseCategoryRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link MoveCategoryUseCase} (issue #199, F-CAT1).
 *
 * <p>Coverage matrix:
 * <ul>
 *   <li>Same-level reorder (root ↔ root, sub ↔ sub)</li>
 *   <li>Reparent root → sub (only allowed if root has no children)</li>
 *   <li>Reparent sub → root (promote)</li>
 *   <li>Reparent sub → other root</li>
 *   <li>Reject moving into a sub-category (would create level 3)</li>
 *   <li>Reject demoting a root that has children (would push them to level 3)</li>
 *   <li>Reject self-as-parent</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MoveCategoryUseCase Tests")
class MoveCategoryUseCaseTest {

    @Mock
    private CourseCategoryRepository categoryRepo;

    private MoveCategoryUseCase useCase;

    private UUID rootAId;
    private UUID rootBId;
    private UUID subA1Id;
    private UUID subA2Id;
    private UUID subB1Id;

    private CourseCategory rootA;
    private CourseCategory rootB;
    private CourseCategory subA1;
    private CourseCategory subA2;
    private CourseCategory subB1;

    @BeforeEach
    void setUp() {
        useCase = new MoveCategoryUseCase(categoryRepo);

        rootAId = UUID.randomUUID();
        rootBId = UUID.randomUUID();
        subA1Id = UUID.randomUUID();
        subA2Id = UUID.randomUUID();
        subB1Id = UUID.randomUUID();

        rootA = CourseCategory.reconstitute(rootAId, null, "RA", "Root A", "root-a",
                "RA", "desc", "icon", 0, true, Instant.now(), Instant.now());
        rootB = CourseCategory.reconstitute(rootBId, null, "RB", "Root B", "root-b",
                "RB", "desc", "icon", 1, true, Instant.now(), Instant.now());
        subA1 = CourseCategory.reconstitute(subA1Id, rootAId, "SA1", "Sub A1", "sub-a1",
                null, "desc", null, 0, true, Instant.now(), Instant.now());
        subA2 = CourseCategory.reconstitute(subA2Id, rootAId, "SA2", "Sub A2", "sub-a2",
                null, "desc", null, 1, true, Instant.now(), Instant.now());
        subB1 = CourseCategory.reconstitute(subB1Id, rootBId, "SB1", "Sub B1", "sub-b1",
                null, "desc", null, 0, true, Instant.now(), Instant.now());
    }

    @Test
    @DisplayName("Same-level reorder: move root B before root A → both renumbered")
    void sameLevelReorder_rootToRoot() {
        when(categoryRepo.findById(rootBId)).thenReturn(Optional.of(rootB));
        // After move: both roots in the root collection (rootB now at the front).
        when(categoryRepo.findAllRoots()).thenReturn(List.of(rootA, rootB));
        when(categoryRepo.findAll()).thenReturn(List.of(rootA, rootB));
        lenient().when(categoryRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(rootBId, null, 0);

        // rootB should now have parentId = null and sortOrder = 0
        assertThat(rootB.getParentId()).isNull();
        assertThat(rootB.getSortOrder()).isEqualTo(0);
        // rootA should be renumbered to 1
        assertThat(rootA.getSortOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("Reparent sub → root (promote): subA1 promoted to root level")
    void reparent_subToRoot_promote() {
        // rootA has children — but we're moving the SUB (not the root) so it's fine.
        when(categoryRepo.findById(subA1Id)).thenReturn(Optional.of(subA1));
        // After moveTo, subA1.parentId is null → it appears in findAllRoots.
        when(categoryRepo.findAllRoots()).thenReturn(List.of(rootA, rootB, subA1));
        when(categoryRepo.findAll()).thenReturn(List.of(rootA, rootB, subA1, subA2, subB1));
        lenient().when(categoryRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(subA1Id, null, 1);

        assertThat(subA1.getParentId()).isNull();
        assertThat(subA1.isRoot()).isTrue();
    }

    @Test
    @DisplayName("Reparent root → sub: rootB (no children) demoted under rootA")
    void reparent_rootToSub_demote_allowed_when_no_children() {
        // rootB has no children in this scenario.
        when(categoryRepo.findById(rootBId)).thenReturn(Optional.of(rootB));
        when(categoryRepo.findById(rootAId)).thenReturn(Optional.of(rootA));
        when(categoryRepo.findChildrenOf(rootBId)).thenReturn(List.of());
        // After move: rootB now under rootA, so findChildrenOf(rootAId) includes it.
        when(categoryRepo.findChildrenOf(rootAId)).thenReturn(List.of(subA1, subA2, rootB));
        when(categoryRepo.findAll()).thenReturn(List.of(rootA, rootB, subA1, subA2));
        lenient().when(categoryRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(rootBId, rootAId, 2);

        assertThat(rootB.getParentId()).isEqualTo(rootAId);
        assertThat(rootB.isSubcategory()).isTrue();
    }

    @Test
    @DisplayName("Reject demoting a root that has children (would push children to level 3)")
    void reject_demoting_root_with_children() {
        when(categoryRepo.findById(rootBId)).thenReturn(Optional.of(rootB));
        // The rule queries children via findChildrenOf(), not via the in-memory
        // children list — adapter loads children lazily. Stub it accordingly.
        when(categoryRepo.findChildrenOf(rootBId)).thenReturn(List.of(subB1));

        assertThatThrownBy(() -> useCase.execute(rootBId, rootAId, 0))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("2 cap");

        verify(categoryRepo, never()).save(any());
    }

    @Test
    @DisplayName("Reject moving INTO a sub-category (would create level 3)")
    void reject_move_into_subcategory() {
        when(categoryRepo.findById(subA2Id)).thenReturn(Optional.of(subA2));
        when(categoryRepo.findById(subA1Id)).thenReturn(Optional.of(subA1));

        // Trying to make subA1 the parent of subA2 — subA1 is not a root.
        assertThatThrownBy(() -> useCase.execute(subA2Id, subA1Id, 0))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("2 cap");

        verify(categoryRepo, never()).save(any());
    }

    @Test
    @DisplayName("Reject self-as-parent (cycle)")
    void reject_self_as_parent() {
        when(categoryRepo.findById(rootAId)).thenReturn(Optional.of(rootA));

        assertThatThrownBy(() -> useCase.execute(rootAId, rootAId, 0))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("chinh no");

        verify(categoryRepo, never()).save(any());
    }

    @Test
    @DisplayName("Reparent sub → other root: subA1 moved under rootB")
    void reparent_sub_to_other_root() {
        when(categoryRepo.findById(subA1Id)).thenReturn(Optional.of(subA1));
        when(categoryRepo.findById(rootBId)).thenReturn(Optional.of(rootB));
        // After move: subA1 now lives under rootB.
        when(categoryRepo.findChildrenOf(rootBId)).thenReturn(List.of(subB1, subA1));
        when(categoryRepo.findAll()).thenReturn(List.of(rootA, rootB, subA1, subA2, subB1));
        lenient().when(categoryRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(subA1Id, rootBId, 1);

        assertThat(subA1.getParentId()).isEqualTo(rootBId);
        assertThat(subA1.getSortOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("Reject negative sortOrder")
    void reject_negative_sortOrder() {
        assertThatThrownBy(() -> useCase.execute(rootAId, null, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Reject null categoryId")
    void reject_null_categoryId() {
        assertThatThrownBy(() -> useCase.execute(null, null, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
