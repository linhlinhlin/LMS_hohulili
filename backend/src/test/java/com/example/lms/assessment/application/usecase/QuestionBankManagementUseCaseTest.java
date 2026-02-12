package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.model.QuestionBank;
import com.example.lms.assessment.domain.model.QuestionBankCategory;
import com.example.lms.assessment.domain.repository.QuestionBankCategoryRepository;
import com.example.lms.assessment.domain.repository.QuestionBankRepository;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuestionBankManagementUseCaseTest {

    @Mock private QuestionBankRepository bankRepository;
    @Mock private QuestionBankCategoryRepository categoryRepository;
    @Mock private QuestionRepository questionRepository;

    private QuestionBankManagementUseCase useCase;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        useCase = new QuestionBankManagementUseCase(bankRepository, categoryRepository, questionRepository);
    }

    // ============ Bank CRUD ============

    @Test
    void createBank_shouldSaveAndReturn() {
        var command = new QuestionBankManagementUseCase.CreateBankCommand(
                "Math Bank", "Description", "Math", userId,
                QuestionBank.BankType.PERSONAL, QuestionBank.Visibility.PRIVATE
        );

        when(bankRepository.save(any(QuestionBank.class))).thenAnswer(inv -> inv.getArgument(0));

        QuestionBank result = useCase.createBank(command);

        assertThat(result.getName()).isEqualTo("Math Bank");
        assertThat(result.getOwnerId()).isEqualTo(userId);
        verify(bankRepository).save(any());
    }

    @Test
    void updateBank_shouldUpdateFields() {
        QuestionBank bank = QuestionBank.create("Old", null, null, userId, null, null);
        when(bankRepository.findById(bank.getId())).thenReturn(Optional.of(bank));
        when(bankRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new QuestionBankManagementUseCase.UpdateBankCommand(
                "New Name", "New Desc", "Physics", QuestionBank.Visibility.PUBLIC
        );

        QuestionBank result = useCase.updateBank(bank.getId(), command, userId);

        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getDescription()).isEqualTo("New Desc");
        assertThat(result.getVisibility()).isEqualTo(QuestionBank.Visibility.PUBLIC);
    }

    @Test
    void updateBank_notOwner_shouldThrow() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, userId, null, null);
        when(bankRepository.findById(bank.getId())).thenReturn(Optional.of(bank));

        UUID otherUser = UUID.randomUUID();
        var command = new QuestionBankManagementUseCase.UpdateBankCommand("New", null, null, null);

        assertThatThrownBy(() -> useCase.updateBank(bank.getId(), command, otherUser))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("do not own");
    }

    @Test
    void archiveBank_shouldChangeStatus() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, userId, null, null);
        when(bankRepository.findById(bank.getId())).thenReturn(Optional.of(bank));

        useCase.archiveBank(bank.getId(), userId);

        assertThat(bank.getStatus()).isEqualTo(QuestionBank.Status.ARCHIVED);
        verify(bankRepository).save(bank);
    }

    @Test
    void getBankById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(bankRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.getBankById(id))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ============ Category CRUD ============

    @Test
    void addCategory_root_shouldCreateRootCategory() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, userId, null, null);
        when(bankRepository.findById(bank.getId())).thenReturn(Optional.of(bank));
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new QuestionBankManagementUseCase.AddCategoryCommand("Root Cat", "Desc", null, 0);
        QuestionBankCategory result = useCase.addCategory(bank.getId(), command, userId);

        assertThat(result.getName()).isEqualTo("Root Cat");
        assertThat(result.isRoot()).isTrue();
        assertThat(result.getBankId()).isEqualTo(bank.getId());
    }

    @Test
    void addCategory_child_shouldCreateChildCategory() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, userId, null, null);
        QuestionBankCategory parent = QuestionBankCategory.createRoot(bank.getId(), "Parent", null, 0);

        when(bankRepository.findById(bank.getId())).thenReturn(Optional.of(bank));
        when(categoryRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new QuestionBankManagementUseCase.AddCategoryCommand("Child", null, parent.getId(), 1);
        QuestionBankCategory result = useCase.addCategory(bank.getId(), command, userId);

        assertThat(result.getName()).isEqualTo("Child");
        assertThat(result.getParentId()).isEqualTo(parent.getId());
        assertThat(result.isRoot()).isFalse();
    }

    @Test
    void deleteCategory_shouldDelete() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, userId, null, null);
        QuestionBankCategory category = QuestionBankCategory.createRoot(bank.getId(), "Cat", null, 0);

        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(bankRepository.findById(bank.getId())).thenReturn(Optional.of(bank));

        useCase.deleteCategory(category.getId(), userId);
        verify(categoryRepository).deleteById(category.getId());
    }

    @Test
    void getCategoryTree_shouldBuildTree() {
        UUID bankId = UUID.randomUUID();
        QuestionBankCategory root = QuestionBankCategory.createRoot(bankId, "Root", null, 0);
        QuestionBankCategory child = QuestionBankCategory.createChild(bankId, root.getId(), "Child", null, 1);

        when(categoryRepository.findByBankId(bankId)).thenReturn(List.of(root, child));

        List<QuestionBankCategory> tree = useCase.getCategoryTree(bankId);

        assertThat(tree).hasSize(1);
        assertThat(tree.get(0).getName()).isEqualTo("Root");
        assertThat(tree.get(0).getChildren()).hasSize(1);
        assertThat(tree.get(0).getChildren().get(0).getName()).isEqualTo("Child");
    }

    // ============ Move Questions ============

    @Test
    void moveQuestionsToBank_shouldUpdateQuestions() {
        QuestionBank targetBank = QuestionBank.create("Target", null, null, userId, null, null);
        Question q1 = Question.builder().id(UUID.randomUUID()).createdBy(userId).packageId(UUID.randomUUID()).build();
        Question q2 = Question.builder().id(UUID.randomUUID()).createdBy(userId).packageId(UUID.randomUUID()).build();

        when(bankRepository.findById(targetBank.getId())).thenReturn(Optional.of(targetBank));
        when(questionRepository.findAllByIds(any())).thenReturn(List.of(q1, q2));
        when(questionRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(questionRepository.countByBankId(targetBank.getId())).thenReturn(2L);
        when(bankRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var command = new QuestionBankManagementUseCase.MoveQuestionsCommand(
                List.of(q1.getId(), q2.getId()), targetBank.getId(), null
        );

        useCase.moveQuestionsToBank(command, userId);

        assertThat(q1.getPackageId()).isEqualTo(targetBank.getId());
        assertThat(q2.getPackageId()).isEqualTo(targetBank.getId());
        verify(questionRepository).saveAll(any());
    }

    @Test
    void moveQuestionsToBank_notOwner_shouldThrow() {
        QuestionBank bank = QuestionBank.create("Bank", null, null, userId, null, null);
        when(bankRepository.findById(bank.getId())).thenReturn(Optional.of(bank));

        UUID otherUser = UUID.randomUUID();
        var command = new QuestionBankManagementUseCase.MoveQuestionsCommand(
                List.of(UUID.randomUUID()), bank.getId(), null
        );

        assertThatThrownBy(() -> useCase.moveQuestionsToBank(command, otherUser))
                .isInstanceOf(BusinessRuleException.class);
    }
}
