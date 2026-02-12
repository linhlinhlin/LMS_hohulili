package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.TeacherInvitationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherInvitationJpaRepository extends JpaRepository<TeacherInvitationJpaEntity, UUID> {

    List<TeacherInvitationJpaEntity> findByInvitedTeacherIdAndStatus(UUID invitedTeacherId, TeacherInvitationJpaEntity.InvitationStatus status);

    List<TeacherInvitationJpaEntity> findByInvitedTeacherIdOrderByCreatedAtDesc(UUID invitedTeacherId);

    List<TeacherInvitationJpaEntity> findByCourseId(UUID courseId);

    Optional<TeacherInvitationJpaEntity> findByCourseIdAndInvitedTeacherId(UUID courseId, UUID invitedTeacherId);
}
