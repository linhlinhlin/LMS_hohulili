package com.example.lms.communication.infrastructure.persistence.repository;

import com.example.lms.communication.infrastructure.persistence.entity.AnnouncementReadJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public interface AnnouncementReadJpaRepository
        extends JpaRepository<AnnouncementReadJpaEntity, AnnouncementReadJpaEntity.AnnouncementReadId> {

    List<AnnouncementReadJpaEntity> findByUserId(UUID userId);

    @Query("SELECT ar.announcementId FROM AnnouncementReadJpaEntity ar WHERE ar.userId = :userId")
    Set<UUID> findReadAnnouncementIdsByUserId(@Param("userId") UUID userId);

    @Query("""
        SELECT COUNT(a.id) FROM AnnouncementJpaEntity a
        WHERE a.courseId IN :courseIds
        AND a.id NOT IN (SELECT ar.announcementId FROM AnnouncementReadJpaEntity ar WHERE ar.userId = :userId)
    """)
    long countUnreadByCourseIds(@Param("courseIds") List<UUID> courseIds, @Param("userId") UUID userId);
}
