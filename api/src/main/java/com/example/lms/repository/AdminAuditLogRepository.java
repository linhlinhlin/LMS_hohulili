package com.example.lms.repository;

import com.example.lms.entity.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, UUID> {

    /**
     * Get audit logs by admin
     */
    Page<AdminAuditLog> findByAdminIdOrderByTimestampDesc(UUID adminId, Pageable pageable);

    /**
     * Get audit logs by target owner (teacher)
     */
    Page<AdminAuditLog> findByTargetOwnerIdOrderByTimestampDesc(UUID ownerId, Pageable pageable);

    /**
     * Get audit logs for a specific course
     */
    @Query("SELECT a FROM AdminAuditLog a WHERE a.targetType = 'COURSE' AND a.targetId = :courseId ORDER BY a.timestamp DESC")
    List<AdminAuditLog> findByCourseId(@Param("courseId") UUID courseId);

    /**
     * Get recent audit logs (for admin dashboard)
     */
    @Query("SELECT a FROM AdminAuditLog a WHERE a.timestamp > :since ORDER BY a.timestamp DESC")
    Page<AdminAuditLog> findRecentLogs(@Param("since") Instant since, Pageable pageable);
}
