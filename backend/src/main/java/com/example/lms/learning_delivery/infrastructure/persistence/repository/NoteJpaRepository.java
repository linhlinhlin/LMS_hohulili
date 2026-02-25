package com.example.lms.learning_delivery.infrastructure.persistence.repository;

import com.example.lms.learning_delivery.infrastructure.persistence.entity.NoteJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NoteJpaRepository extends JpaRepository<NoteJpaEntity, UUID> {

    List<NoteJpaEntity> findByUserIdAndCourseIdOrderByUpdatedAtDesc(UUID userId, UUID courseId);

    List<NoteJpaEntity> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}
