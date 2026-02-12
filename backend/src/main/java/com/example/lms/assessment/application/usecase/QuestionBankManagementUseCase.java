package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.domain.model.QuestionBank;
import com.example.lms.assessment.domain.model.QuestionBankCategory;
import com.example.lms.assessment.domain.model.Question;
import com.example.lms.assessment.domain.repository.QuestionBankCategoryRepository;
import com.example.lms.assessment.domain.repository.QuestionBankRepository;
import com.example.lms.assessment.domain.repository.QuestionRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.BusinessRuleException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Use case: QuestionBank management (CRUD bank, CRUD category, move questions).
 */
@Service
@Slf4j
public class QuestionBankManagementUseCase {

    private final QuestionBankRepository bankRepository;
    private final QuestionBankCategoryRepository categoryRepository;
    private final QuestionRepository questionRepository;

    public QuestionBankManagementUseCase(QuestionBankRepository bankRepository,
                                         QuestionBankCategoryRepository categoryRepository,
                                         QuestionRepository questionRepository) {
        this.bankRepository = bankRepository;
        this.categoryRepository = categoryRepository;
        this.questionRepository = questionRepository;
    }

    // ============ Bank CRUD ============

    @Transactional
    public QuestionBank createBank(CreateBankCommand command) {
        log.info("Creating question bank: {} for user: {}", command.name(), command.ownerId());

        QuestionBank bank = QuestionBank.create(
                command.name(), command.description(), command.subject(),
                command.ownerId(), command.bankType(), command.visibility()
        );

        return bankRepository.save(bank);
    }

    @Transactional
    public QuestionBank updateBank(UUID bankId, UpdateBankCommand command, UUID userId) {
        QuestionBank bank = bankRepository.findById(bankId)
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", bankId));

        if (!bank.isOwnedBy(userId)) {
            throw new BusinessRuleException("You do not own this question bank");
        }

        if (command.name() != null) bank.rename(command.name());
        if (command.description() != null) bank.updateDescription(command.description());
        if (command.subject() != null) bank.updateSubject(command.subject());
        if (command.visibility() != null) bank.changeVisibility(command.visibility());

        return bankRepository.save(bank);
    }

    @Transactional
    public void archiveBank(UUID bankId, UUID userId) {
        QuestionBank bank = bankRepository.findById(bankId)
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", bankId));

        if (!bank.isOwnedBy(userId)) {
            throw new BusinessRuleException("You do not own this question bank");
        }

        bank.archive();
        bankRepository.save(bank);
        log.info("Archived question bank: {}", bankId);
    }

    @Transactional(readOnly = true)
    public QuestionBank getBankById(UUID bankId) {
        return bankRepository.findById(bankId)
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", bankId));
    }

    @Transactional(readOnly = true)
    public List<QuestionBank> getMyBanks(UUID ownerId) {
        return bankRepository.findByOwnerId(ownerId);
    }

    @Transactional(readOnly = true)
    public List<QuestionBank> searchBanks(String query) {
        return bankRepository.searchByName(query);
    }

    // ============ Category CRUD ============

    @Transactional
    public QuestionBankCategory addCategory(UUID bankId, AddCategoryCommand command, UUID userId) {
        QuestionBank bank = bankRepository.findById(bankId)
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", bankId));

        if (!bank.isOwnedBy(userId)) {
            throw new BusinessRuleException("You do not own this question bank");
        }

        QuestionBankCategory category;
        if (command.parentId() != null) {
            // Verify parent exists and belongs to the same bank
            QuestionBankCategory parent = categoryRepository.findById(command.parentId())
                    .orElseThrow(() -> new EntityNotFoundException("QuestionBankCategory", command.parentId()));
            if (!parent.getBankId().equals(bankId)) {
                throw new BusinessRuleException("Parent category does not belong to this bank");
            }
            category = QuestionBankCategory.createChild(bankId, command.parentId(), command.name(), command.description(), command.sortOrder());
        } else {
            category = QuestionBankCategory.createRoot(bankId, command.name(), command.description(), command.sortOrder());
        }

        return categoryRepository.save(category);
    }

    @Transactional
    public QuestionBankCategory updateCategory(UUID categoryId, UpdateCategoryCommand command, UUID userId) {
        QuestionBankCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("QuestionBankCategory", categoryId));

        // Verify ownership via bank
        QuestionBank bank = bankRepository.findById(category.getBankId())
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", category.getBankId()));
        if (!bank.isOwnedBy(userId)) {
            throw new BusinessRuleException("You do not own this question bank");
        }

        if (command.name() != null) category.rename(command.name());
        if (command.description() != null) category.updateDescription(command.description());
        if (command.sortOrder() != null) category.reorder(command.sortOrder());

        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(UUID categoryId, UUID userId) {
        QuestionBankCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("QuestionBankCategory", categoryId));

        QuestionBank bank = bankRepository.findById(category.getBankId())
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", category.getBankId()));
        if (!bank.isOwnedBy(userId)) {
            throw new BusinessRuleException("You do not own this question bank");
        }

        // Questions in this category will have category_id set to NULL (FK ON DELETE SET NULL)
        categoryRepository.deleteById(categoryId);
        log.info("Deleted category: {}", categoryId);
    }

    @Transactional(readOnly = true)
    public List<QuestionBankCategory> getCategoryTree(UUID bankId) {
        List<QuestionBankCategory> allCategories = categoryRepository.findByBankId(bankId);

        // Build tree structure
        Map<UUID, QuestionBankCategory> categoryMap = new LinkedHashMap<>();
        for (QuestionBankCategory cat : allCategories) {
            categoryMap.put(cat.getId(), cat);
        }

        List<QuestionBankCategory> roots = new ArrayList<>();
        for (QuestionBankCategory cat : allCategories) {
            if (cat.getParentId() == null) {
                roots.add(cat);
            } else {
                QuestionBankCategory parent = categoryMap.get(cat.getParentId());
                if (parent != null) {
                    parent.addChild(cat);
                }
            }
        }

        return roots;
    }

    // ============ Move Questions ============

    @Transactional
    public void moveQuestionsToBank(MoveQuestionsCommand command, UUID userId) {
        QuestionBank targetBank = bankRepository.findById(command.targetBankId())
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", command.targetBankId()));

        if (!targetBank.isOwnedBy(userId)) {
            throw new BusinessRuleException("You do not own the target question bank");
        }

        List<Question> questions = questionRepository.findAllByIds(command.questionIds());
        if (questions.isEmpty()) {
            throw new BusinessRuleException("No questions found with provided IDs");
        }

        for (Question question : questions) {
            question.moveToBank(command.targetBankId(), command.targetCategoryId());
        }
        questionRepository.saveAll(questions);

        // Update question counts
        targetBank.setQuestionCount((int) questionRepository.countByBankId(command.targetBankId()));
        bankRepository.save(targetBank);

        log.info("Moved {} questions to bank: {}", questions.size(), command.targetBankId());
    }

    @Transactional
    public void moveQuestionsToCategory(UUID categoryId, List<UUID> questionIds, UUID userId) {
        QuestionBankCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new EntityNotFoundException("QuestionBankCategory", categoryId));

        QuestionBank bank = bankRepository.findById(category.getBankId())
                .orElseThrow(() -> new EntityNotFoundException("QuestionBank", category.getBankId()));
        if (!bank.isOwnedBy(userId)) {
            throw new BusinessRuleException("You do not own this question bank");
        }

        List<Question> questions = questionRepository.findAllByIds(questionIds);
        for (Question question : questions) {
            question.moveToCategory(categoryId);
        }
        questionRepository.saveAll(questions);

        // Update category question count
        category.setQuestionCount((int) questionRepository.countByCategoryId(categoryId));
        categoryRepository.save(category);

        log.info("Moved {} questions to category: {}", questions.size(), categoryId);
    }

    @Transactional(readOnly = true)
    public List<Question> getBankQuestions(UUID bankId, UUID categoryId) {
        if (categoryId != null) {
            return questionRepository.findByBankIdAndCategoryId(bankId, categoryId);
        }
        return questionRepository.findByBankId(bankId);
    }

    // ============ Commands ============

    public record CreateBankCommand(
            String name,
            String description,
            String subject,
            UUID ownerId,
            QuestionBank.BankType bankType,
            QuestionBank.Visibility visibility
    ) {}

    public record UpdateBankCommand(
            String name,
            String description,
            String subject,
            QuestionBank.Visibility visibility
    ) {}

    public record AddCategoryCommand(
            String name,
            String description,
            UUID parentId,
            int sortOrder
    ) {}

    public record UpdateCategoryCommand(
            String name,
            String description,
            Integer sortOrder
    ) {}

    public record MoveQuestionsCommand(
            List<UUID> questionIds,
            UUID targetBankId,
            UUID targetCategoryId
    ) {}
}
