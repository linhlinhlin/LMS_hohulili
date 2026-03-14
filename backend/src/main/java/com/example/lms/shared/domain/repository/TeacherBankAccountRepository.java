package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.TeacherBankAccount;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeacherBankAccountRepository {
    TeacherBankAccount save(TeacherBankAccount account);
    Optional<TeacherBankAccount> findById(UUID id);
    List<TeacherBankAccount> findByIds(Collection<UUID> ids);
    List<TeacherBankAccount> findByTeacherId(UUID teacherId);
    Optional<TeacherBankAccount> findDefaultByTeacherId(UUID teacherId);
    /** Check if a specific bank account already exists for this teacher. */
    boolean existsByTeacherIdAndBankCodeAndAccountNumber(UUID teacherId, String bankCode, String accountNumber);
    /** Sets is_default=FALSE for all accounts of this teacher (used before setting a new default). */
    void clearDefaultForTeacher(UUID teacherId);
    void delete(UUID id);
}
