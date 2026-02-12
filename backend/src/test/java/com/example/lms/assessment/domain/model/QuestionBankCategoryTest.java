package com.example.lms.assessment.domain.model;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class QuestionBankCategoryTest {

    private final UUID bankId = UUID.randomUUID();

    @Test
    void createRoot_shouldHaveNullParent() {
        QuestionBankCategory cat = QuestionBankCategory.createRoot(bankId, "Root", "Desc", 0);

        assertThat(cat.getId()).isNotNull();
        assertThat(cat.getBankId()).isEqualTo(bankId);
        assertThat(cat.getParentId()).isNull();
        assertThat(cat.getName()).isEqualTo("Root");
        assertThat(cat.isRoot()).isTrue();
        assertThat(cat.getQuestionCount()).isZero();
    }

    @Test
    void createChild_shouldHaveParent() {
        UUID parentId = UUID.randomUUID();
        QuestionBankCategory cat = QuestionBankCategory.createChild(bankId, parentId, "Child", null, 1);

        assertThat(cat.getParentId()).isEqualTo(parentId);
        assertThat(cat.isRoot()).isFalse();
        assertThat(cat.getSortOrder()).isEqualTo(1);
    }

    @Test
    void createChild_shouldRejectNullParent() {
        assertThatThrownBy(() -> QuestionBankCategory.createChild(bankId, null, "Bad", null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("parentId");
    }

    @Test
    void rename_shouldUpdateName() {
        QuestionBankCategory cat = QuestionBankCategory.createRoot(bankId, "Old", null, 0);
        cat.rename("New");
        assertThat(cat.getName()).isEqualTo("New");
        assertThat(cat.getUpdatedAt()).isNotNull();
    }

    @Test
    void rename_shouldRejectBlank() {
        QuestionBankCategory cat = QuestionBankCategory.createRoot(bankId, "Cat", null, 0);
        assertThatThrownBy(() -> cat.rename(""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void reorder_shouldUpdateSortOrder() {
        QuestionBankCategory cat = QuestionBankCategory.createRoot(bankId, "Cat", null, 0);
        cat.reorder(5);
        assertThat(cat.getSortOrder()).isEqualTo(5);
    }

    @Test
    void questionCount_shouldIncrementAndDecrement() {
        QuestionBankCategory cat = QuestionBankCategory.createRoot(bankId, "Cat", null, 0);
        cat.incrementQuestionCount();
        cat.incrementQuestionCount();
        assertThat(cat.getQuestionCount()).isEqualTo(2);

        cat.decrementQuestionCount();
        assertThat(cat.getQuestionCount()).isEqualTo(1);
    }

    @Test
    void decrementQuestionCount_shouldNotGoBelowZero() {
        QuestionBankCategory cat = QuestionBankCategory.createRoot(bankId, "Cat", null, 0);
        cat.decrementQuestionCount();
        assertThat(cat.getQuestionCount()).isZero();
    }

    @Test
    void addChild_shouldMaintainList() {
        QuestionBankCategory root = QuestionBankCategory.createRoot(bankId, "Root", null, 0);
        QuestionBankCategory child = QuestionBankCategory.createChild(bankId, root.getId(), "Child", null, 0);
        root.addChild(child);

        assertThat(root.getChildren()).hasSize(1);
        assertThat(root.getChildren().get(0).getName()).isEqualTo("Child");
    }
}
