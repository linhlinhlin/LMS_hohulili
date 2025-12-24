package com.example.lms.service;

import com.example.lms.entity.AdminAuditLog;
import com.example.lms.entity.AdminAuditLog.AuditAction;
import com.example.lms.entity.AdminAuditLog.TargetType;
import com.example.lms.entity.User;
import com.example.lms.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Service for logging Admin audit actions.
 * Uses async logging to not block main request flow.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditService {

    private final AdminAuditLogRepository auditLogRepository;

    /**
     * Log an admin action asynchronously
     */
    @Async
    @Transactional
    public void logAction(
            User admin,
            AuditAction action,
            TargetType targetType,
            UUID targetId,
            User targetOwner,
            String details,
            String ipAddress
    ) {
        try {
            AdminAuditLog auditLog = AdminAuditLog.builder()
                    .admin(admin)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .targetOwner(targetOwner)
                    .details(details)
                    .ipAddress(ipAddress)
                    .timestamp(Instant.now())
                    .build();

            auditLogRepository.save(auditLog);
            
            log.info("AUDIT: Admin {} performed {} on {} (id={})", 
                     admin.getEmail(), action, targetType, targetId);
        } catch (Exception e) {
            // Log error but don't fail the main request
            log.error("Failed to save audit log: {}", e.getMessage());
        }
    }

    /**
     * Simplified logging method
     */
    public void logAction(User admin, AuditAction action, TargetType targetType, UUID targetId, User targetOwner) {
        logAction(admin, action, targetType, targetId, targetOwner, null, null);
    }

    /**
     * Get audit logs by admin
     */
    @Transactional(readOnly = true)
    public Page<AdminAuditLog> getLogsByAdmin(UUID adminId, Pageable pageable) {
        return auditLogRepository.findByAdminIdOrderByTimestampDesc(adminId, pageable);
    }

    /**
     * Get audit logs by target owner (teacher)
     */
    @Transactional(readOnly = true)
    public Page<AdminAuditLog> getLogsByTargetOwner(UUID ownerId, Pageable pageable) {
        return auditLogRepository.findByTargetOwnerIdOrderByTimestampDesc(ownerId, pageable);
    }

    /**
     * Get recent audit logs
     */
    @Transactional(readOnly = true)
    public Page<AdminAuditLog> getRecentLogs(int hoursBack, Pageable pageable) {
        Instant since = Instant.now().minusSeconds(hoursBack * 3600L);
        return auditLogRepository.findRecentLogs(since, pageable);
    }
}
