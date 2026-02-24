package com.example.lms.assessment.domain.model;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class QuestionBankTest {

    private final UUID ownerId = UUID.randomUUID();

    @Test
    void create_shouldBuildBankWithDefaults() {
        QuestionBank bank = QuestionBank.create("Math Bank", "Description", "Mathematics", ownerId, null, null);

        assertThat(bank.getId()).isNotNull();
        assertThat(bank.getName()).isEqualTo("Math Bank");
        assertThat(bank.getDescription()).isEqualTo("Description");
        assertThat(bank.getSubject()).isEqualTo("Mathematics");
        assertThat(bank.getOwnerId()).isEqualTo(ownerId);
        assertThat(bank.getBankType()).isEqualTo(QuestionBank.BankType.PERSONAL);
        assertThat(bank.getVisibility()).isEqualTo(QuestionBank.Visibility.PRIVATE);
        assertThat(bank.getStatus()).isEqualTo(QuestionBank.Status.ACTIVE);
        assertThat(bank.getQuestionCount()).isZero();
    }

    @Test
    void create_shouldRejectBlankName() {
        assertThatThrownBy(() -> QuestionBank.create("", "desc", "sub", ownerId, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("trống");
    }

    @Test
    void create_shouldRejectNullOwner() {
        assertThatThrownBy(() -> QuestionBank.create("Bank", "desc", "sub", null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chủ sở hữu");
    }

    @Test
    void rename_shouldUpdateName() {
        QuestionBank bank = QuestionBank.create("Old", null, null, ownerId, null, null);
        bank.rename("New");
        assertThat(bank.getName()).isEqualTo("New");
        assertThat(bank.getUpdatedAt()).isNotNull();
    }

    @Test
    void rename_shouldRejectBlank() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        assertThatThrownBy(() -> bank.rename(""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void archive_shouldChangeStatus() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        bank.archive();
        assertThat(bank.getStatus()).isEqualTo(QuestionBank.Status.ARCHIVED);
        assertThat(bank.isActive()).isFalse();
    }

    @Test
    void archive_alreadyArchived_shouldThrow() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        bank.archive();
        assertThatThrownBy(bank::archive)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã được lưu trữ");
    }

    @Test
    void activate_shouldChangeStatus() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        bank.archive();
        bank.activate();
        assertThat(bank.getStatus()).isEqualTo(QuestionBank.Status.ACTIVE);
        assertThat(bank.isActive()).isTrue();
    }

    @Test
    void isOwnedBy_shouldReturnCorrectResult() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        assertThat(bank.isOwnedBy(ownerId)).isTrue();
        assertThat(bank.isOwnedBy(UUID.randomUUID())).isFalse();
    }

    @Test
    void questionCount_shouldIncrementAndDecrement() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        bank.incrementQuestionCount();
        bank.incrementQuestionCount();
        assertThat(bank.getQuestionCount()).isEqualTo(2);

        bank.decrementQuestionCount();
        assertThat(bank.getQuestionCount()).isEqualTo(1);
    }

    @Test
    void decrementQuestionCount_shouldNotGoBelowZero() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        bank.decrementQuestionCount();
        assertThat(bank.getQuestionCount()).isZero();
    }

    @Test
    void changeVisibility_shouldUpdate() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, ownerId, null, null);
        bank.changeVisibility(QuestionBank.Visibility.PUBLIC);
        assertThat(bank.getVisibility()).isEqualTo(QuestionBank.Visibility.PUBLIC);
        assertThat(bank.isPublic()).isTrue();
    }
}
