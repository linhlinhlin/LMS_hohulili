package com.example.lms.learning_delivery.infrastructure.persistence;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.ClassTeacherJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassTeacherJpaRepository extends JpaRepository<ClassTeacherJpaEntity, UUID> {

    List<ClassTeacherJpaEntity> findByClassId(UUID classId);

    List<ClassTeacherJpaEntity> findByTeacherId(UUID teacherId);

    Optional<ClassTeacherJpaEntity> findByClassIdAndTeacherId(UUID classId, UUID teacherId);

    boolean existsByClassIdAndTeacherId(UUID classId, UUID teacherId);

    void deleteByClassIdAndTeacherId(UUID classId, UUID teacherId);

    long countByClassId(UUID classId);
}
