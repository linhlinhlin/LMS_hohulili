package com.example.lms.assessment.infrastructure.persistence;

import com.example.lms.assessment.domain.model.QuestionBank;
import com.example.lms.assessment.domain.repository.QuestionBankRepository;
import com.example.lms.shared.infrastructure.persistence.entity.PackageJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.PackageJpaRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Adapter: maps PackageJpaEntity ↔ QuestionBank domain model.
 * Evolves the existing packages table for QuestionBank use.
 */
@Component
public class QuestionBankRepositoryAdapter implements QuestionBankRepository {

    private final PackageJpaRepository jpaRepository;

    public QuestionBankRepositoryAdapter(PackageJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public QuestionBank save(QuestionBank bank) {
        PackageJpaEntity entity = toEntity(bank);
        PackageJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<QuestionBank> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<QuestionBank> findByOwnerId(UUID ownerId) {
        return jpaRepository.findByOwnerId(ownerId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<QuestionBank> findByVisibility(QuestionBank.Visibility visibility) {
        // Map domain visibility to JPA enum
        PackageJpaEntity.Visibility jpaVisibility = PackageJpaEntity.Visibility.valueOf(visibility.name());
        return jpaRepository.findAll().stream()
                .filter(e -> e.getVisibility() == jpaVisibility)
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<QuestionBank> searchByName(String query) {
        return jpaRepository.findByNameContainingIgnoreCase(query, org.springframework.data.domain.Pageable.unpaged())
                .getContent().stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    // ============ Mappers ============

    private PackageJpaEntity toEntity(QuestionBank bank) {
        return PackageJpaEntity.builder()
                .id(bank.getId())
                .name(bank.getName())
                .description(bank.getDescription())
                .subject(bank.getSubject())
                .ownerId(bank.getOwnerId())
                .visibility(PackageJpaEntity.Visibility.valueOf(bank.getVisibility().name()))
                .bankType(bank.getBankType().name())
                .status(bank.getStatus().name())
                .questionCount(bank.getQuestionCount())
                .build();
    }

    private QuestionBank toDomain(PackageJpaEntity entity) {
        QuestionBank.BankType bankType = parseBankType(entity.getBankType());
        QuestionBank.Visibility visibility = QuestionBank.Visibility.valueOf(entity.getVisibility().name());
        QuestionBank.Status status = parseStatus(entity.getStatus());

        return new QuestionBank(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getSubject(),
                entity.getOwnerId(),
                bankType,
                visibility,
                status,
                entity.getQuestionCount() != null ? entity.getQuestionCount() : 0,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private QuestionBank.BankType parseBankType(String bankType) {
        if (bankType == null) return QuestionBank.BankType.PERSONAL;
        try {
            return QuestionBank.BankType.valueOf(bankType);
        } catch (IllegalArgumentException e) {
            return QuestionBank.BankType.PERSONAL;
        }
    }

    private QuestionBank.Status parseStatus(String status) {
        if (status == null) return QuestionBank.Status.ACTIVE;
        try {
            return QuestionBank.Status.valueOf(status);
        } catch (IllegalArgumentException e) {
            return QuestionBank.Status.ACTIVE;
        }
    }
}
