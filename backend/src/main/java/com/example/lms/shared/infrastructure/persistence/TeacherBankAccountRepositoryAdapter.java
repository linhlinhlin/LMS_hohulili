package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.domain.model.TeacherBankAccount;
import com.example.lms.shared.domain.repository.TeacherBankAccountRepository;
import com.example.lms.shared.infrastructure.persistence.entity.TeacherBankAccountJpaEntity;
import com.example.lms.shared.infrastructure.persistence.repository.TeacherBankAccountJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TeacherBankAccountRepositoryAdapter implements TeacherBankAccountRepository {

    private final TeacherBankAccountJpaRepository jpaRepo;

    @Override
    public TeacherBankAccount save(TeacherBankAccount account) {
        var entity = toEntity(account);
        return toDomain(jpaRepo.save(entity));
    }

    @Override
    public Optional<TeacherBankAccount> findById(UUID id) {
        return jpaRepo.findById(id).map(this::toDomain);
    }

    @Override
    public List<TeacherBankAccount> findByTeacherId(UUID teacherId) {
        return jpaRepo.findByTeacherIdOrderByCreatedAtDesc(teacherId)
                .stream().map(this::toDomain).toList();
    }

    @Override
    public Optional<TeacherBankAccount> findDefaultByTeacherId(UUID teacherId) {
        return jpaRepo.findByTeacherIdAndIsDefaultTrue(teacherId).map(this::toDomain);
    }

    @Override
    @Transactional
    public void clearDefaultForTeacher(UUID teacherId) {
        jpaRepo.clearDefaultForTeacher(teacherId);
    }

    @Override
    public void delete(UUID id) {
        jpaRepo.deleteById(id);
    }

    private TeacherBankAccountJpaEntity toEntity(TeacherBankAccount a) {
        return TeacherBankAccountJpaEntity.builder()
                .id(a.getId())
                .teacherId(a.getTeacherId())
                .bankCode(a.getBankCode())
                .accountNumber(a.getAccountNumber())
                .accountName(a.getAccountName())
                .isDefault(a.isDefault())
                .verified(a.isVerified())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private TeacherBankAccount toDomain(TeacherBankAccountJpaEntity e) {
        return TeacherBankAccount.reconstitute(e.getId(), e.getTeacherId(),
                e.getBankCode(), e.getAccountNumber(), e.getAccountName(),
                e.isDefault(), e.isVerified(), e.getCreatedAt());
    }
}
