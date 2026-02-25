package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.QuestionBank;
import com.example.lms.assessment.domain.repository.QuestionBankCategoryRepository;
import com.example.lms.assessment.domain.repository.QuestionBankRepository;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests for QuestionBankManagementUseCase — Vietnamese error messages (P1-1).
 */
@ExtendWith(MockitoExtension.class)
class QuestionBankManagementUseCaseSecurityTest {

    @Mock private QuestionBankRepository bankRepository;
    @Mock private QuestionBankCategoryRepository categoryRepository;
    @Mock private QuestionRepository questionRepository;

    private QuestionBankManagementUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new QuestionBankManagementUseCase(bankRepository, categoryRepository, questionRepository);
    }

    @Test
    @DisplayName("updateBank: Từ chối khi không phải chủ sở hữu (Vietnamese message)")
    void updateBank_rejectsNonOwner_vietnamese() {
        UUID bankId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        QuestionBank bank = mock(QuestionBank.class);
        when(bank.isOwnedBy(otherUserId)).thenReturn(false);
        when(bankRepository.findById(bankId)).thenReturn(Optional.of(bank));

        var command = new QuestionBankManagementUseCase.UpdateBankCommand("New Name", null, null, null);

        assertThatThrownBy(() -> useCase.updateBank(bankId, command, otherUserId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Bạn không sở hữu ngân hàng câu hỏi này");
    }

    @Test
    @DisplayName("archiveBank: Từ chối khi không phải chủ sở hữu (Vietnamese message)")
    void archiveBank_rejectsNonOwner_vietnamese() {
        UUID bankId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();

        QuestionBank bank = mock(QuestionBank.class);
        when(bank.isOwnedBy(otherUserId)).thenReturn(false);
        when(bankRepository.findById(bankId)).thenReturn(Optional.of(bank));

        assertThatThrownBy(() -> useCase.archiveBank(bankId, otherUserId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Bạn không sở hữu ngân hàng câu hỏi này");
    }
}
