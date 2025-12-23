package com.example.lms.repository;

import com.example.lms.entity.VideoProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoProgressRepository extends JpaRepository<VideoProgress, UUID> {

    /**
     * Find progress by user and section
     */
    Optional<VideoProgress> findByUserIdAndSectionId(UUID userId, UUID sectionId);

    /**
     * Find all progress for a user
     */
    List<VideoProgress> findByUserId(UUID userId);

    /**
     * Find all completed videos for a user
     */
    List<VideoProgress> findByUserIdAndCompletedTrue(UUID userId);

    /**
     * Check if user has completed a specific video (≥75%)
     */
    @Query("SELECT CASE WHEN COUNT(vp) > 0 THEN true ELSE false END " +
           "FROM VideoProgress vp " +
           "WHERE vp.userId = :userId AND vp.sectionId = :sectionId AND vp.completed = true")
    boolean isVideoCompleted(@Param("userId") UUID userId, @Param("sectionId") UUID sectionId);

    /**
     * Get completion percentage for a specific video
     */
    @Query("SELECT vp.progressPercentage FROM VideoProgress vp " +
           "WHERE vp.userId = :userId AND vp.sectionId = :sectionId")
    Optional<Double> getProgressPercentage(@Param("userId") UUID userId, @Param("sectionId") UUID sectionId);
}
