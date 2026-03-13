package com.example.lms.shared.domain.repository;

import com.example.lms.shared.domain.model.TeacherBankAccount;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeacherBankAccountRepository {
    TeacherBankAccount save(TeacherBankAccount account);
    Optional<TeacherBankAccount> findById(UUID id);
    List<TeacherBankAccount> findByTeacherId(UUID teacherId);
    Optional<TeacherBankAccount> findDefaultByTeacherId(UUID teacherId);
    /** Sets is_default=FALSE for all accounts of this teacher (used before setting a new default). */
    void clearDefaultForTeacher(UUID teacherId);
    void delete(UUID id);
}
