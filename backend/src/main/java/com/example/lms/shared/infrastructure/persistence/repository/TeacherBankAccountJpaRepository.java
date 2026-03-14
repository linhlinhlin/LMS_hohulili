package com.example.lms.shared.infrastructure.persistence.repository;

import com.example.lms.shared.infrastructure.persistence.entity.TeacherBankAccountJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherBankAccountJpaRepository
        extends JpaRepository<TeacherBankAccountJpaEntity, UUID> {

    List<TeacherBankAccountJpaEntity> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);

    List<TeacherBankAccountJpaEntity> findByIdIn(List<UUID> ids);

    Optional<TeacherBankAccountJpaEntity> findByTeacherIdAndIsDefaultTrue(UUID teacherId);

    boolean existsByTeacherIdAndBankCodeAndAccountNumber(UUID teacherId, String bankCode, String accountNumber);

    @Modifying
    @Query("UPDATE TeacherBankAccountJpaEntity t SET t.isDefault = FALSE WHERE t.teacherId = :teacherId")
    void clearDefaultForTeacher(@Param("teacherId") UUID teacherId);
}
