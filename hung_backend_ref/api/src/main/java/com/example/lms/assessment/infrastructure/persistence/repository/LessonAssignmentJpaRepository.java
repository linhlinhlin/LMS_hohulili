package com.example.lms.assessment.infrastructure.persistence.repository;

import com.example.lms.course_authoring.infrastructure.persistence.entity.LessonAssignmentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface LessonAssignmentJpaRepository extends JpaRepository<LessonAssignmentJpaEntity, UUID> {
    void deleteByAssignmentId(UUID assignmentId);
}
