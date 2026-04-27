package com.example.lms.identity.application.usecase;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Issue #258 (Phase 4 PR 3): bổ nhiệm member trở thành ORG_ADMIN của 1 tổ
 * chức + hạ cấp ngược lại. ADMIN-only operation.
 *
 * Validation rules:
 *  - User phải đã là member của org (organization_id = orgId)
 *  - Không promote user role=ADMIN (system role bảo toàn)
 *  - Không demote chính mình (caller != target)
 *  - Demote về TEACHER mặc định (nếu cần STUDENT, ADMIN có thể edit
 *    qua user role CRUD generic sau)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PromoteOrgAdminUseCase {

    private final UserJpaRepository userRepo;

    @Transactional
    public void promote(UUID orgId, UUID userId, UUID actorId) {
        UserJpaEntity user = findMember(orgId, userId);

        if (user.getRole() == UserJpaEntity.UserRole.ADMIN) {
            throw new ValidationException("role",
                "Không thể bổ nhiệm Quản trị viên hệ thống thành ORG_ADMIN — vai trò ADMIN bảo toàn ngoài org scope");
        }

        if (user.getRole() == UserJpaEntity.UserRole.ORG_ADMIN) {
            // Idempotent — already ORG_ADMIN, không thay đổi
            log.info("Promote no-op: user={} already ORG_ADMIN of org={}", userId, orgId);
            return;
        }

        user.setRole(UserJpaEntity.UserRole.ORG_ADMIN);
        userRepo.save(user);
        log.info("Promoted user={} → ORG_ADMIN of org={} by actor={}", userId, orgId, actorId);
    }

    @Transactional
    public void demote(UUID orgId, UUID userId, UUID actorId) {
        if (userId.equals(actorId)) {
            throw new ValidationException("self",
                "Không thể hạ cấp chính mình. Hãy nhờ Quản trị viên hệ thống thực hiện nếu cần.");
        }

        UserJpaEntity user = findMember(orgId, userId);

        if (user.getRole() != UserJpaEntity.UserRole.ORG_ADMIN) {
            throw new ValidationException("role",
                "Người dùng không phải ORG_ADMIN của tổ chức này — không thể hạ cấp");
        }

        user.setRole(UserJpaEntity.UserRole.TEACHER);
        userRepo.save(user);
        log.info("Demoted user={} ORG_ADMIN → TEACHER of org={} by actor={}", userId, orgId, actorId);
    }

    private UserJpaEntity findMember(UUID orgId, UUID userId) {
        UserJpaEntity user = userRepo.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Người dùng", userId));
        if (!orgId.equals(user.getOrganizationId())) {
            throw new EntityNotFoundException("Thành viên trong tổ chức", userId);
        }
        return user;
    }
}
