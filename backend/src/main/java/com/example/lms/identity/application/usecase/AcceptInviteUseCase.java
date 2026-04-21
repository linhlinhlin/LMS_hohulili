package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationInvite;
import com.example.lms.identity.domain.model.TokenHasher;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.UserId;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Accept an invite code or email token.
 * Assigns user to organization + increments useCount.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AcceptInviteUseCase {

    private final OrganizationInviteRepository inviteRepo;
    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;

    /**
     * Accept invite by code (for authenticated users post-login).
     */
    @Transactional
    public UUID acceptByCode(String code, UUID userId) {
        OrganizationInvite invite = inviteRepo.findActiveByCode(code.toUpperCase().trim())
                .orElseThrow(() -> new EntityNotFoundException("Mã mời", code));

        return acceptInvite(invite, userId);
    }

    /**
     * Accept invite by email token.
     * Verifies the accepting user's email matches the invite recipient.
     */
    @Transactional
    public UUID acceptByToken(String rawToken, UUID userId) {
        String tokenHash = TokenHasher.hash(rawToken.trim());
        OrganizationInvite invite = inviteRepo.findActiveByTokenHash(tokenHash)
                .orElseThrow(() -> new EntityNotFoundException("Lời mời", "token"));

        User user = userRepo.findById(UserId.of(userId))
                .orElseThrow(() -> new EntityNotFoundException("Người dùng", userId));

        if (invite.getEmail() != null
                && !invite.getEmail().equalsIgnoreCase(user.getEmail().getValue())) {
            throw new ValidationException("invite",
                    "Lời mời này được gửi cho một địa chỉ email khác");
        }

        return acceptInvite(invite, userId);
    }

    /**
     * Accept invite for new user during registration (by invite code).
     * Returns the organization ID for the new user.
     */
    @Transactional
    public UUID acceptForNewUser(String code) {
        OrganizationInvite invite = inviteRepo.findActiveByCode(code.toUpperCase().trim())
                .orElseThrow(() -> new EntityNotFoundException("Mã mời", code));

        Organization org = orgRepo.findById(invite.getOrganizationId())
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", invite.getOrganizationId()));
        if (!org.isEnabled()) {
            throw new IllegalStateException("Tổ chức đã bị vô hiệu hóa");
        }

        // Record use with TOCTOU protection
        try {
            invite.recordUse();
            inviteRepo.save(invite);
        } catch (DataIntegrityViolationException | OptimisticLockingFailureException e) {
            throw new ValidationException("invite", "Mã mời đã hết lượt sử dụng. Vui lòng thử lại.");
        }

        log.info("Invite code accepted for new user registration, org={}", org.getId());
        return org.getId();
    }

    private UUID acceptInvite(OrganizationInvite invite, UUID userId) {
        Organization org = orgRepo.findById(invite.getOrganizationId())
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", invite.getOrganizationId()));
        if (!org.isEnabled()) {
            throw new IllegalStateException("Tổ chức đã bị vô hiệu hóa");
        }

        // Check user not already in this org
        User user = userRepo.findById(UserId.of(userId))
                .orElseThrow(() -> new EntityNotFoundException("Người dùng", userId));

        if (org.getId().equals(user.getOrganizationId())) {
            throw new ValidationException("invite", "Bạn đã là thành viên của tổ chức này");
        }

        // P0: Block if user is already in a different org (must be removed first)
        if (user.getOrganizationId() != null && !org.getId().equals(user.getOrganizationId())) {
            throw new ValidationException("invite",
                "Bạn đang thuộc tổ chức khác. Vui lòng liên hệ quản trị viên để chuyển tổ chức.");
        }

        // Record use with TOCTOU protection
        try {
            invite.recordUse();
            inviteRepo.save(invite);
        } catch (DataIntegrityViolationException | OptimisticLockingFailureException e) {
            throw new ValidationException("invite", "Mã mời đã hết lượt sử dụng. Vui lòng thử lại.");
        }

        // Assign user to organization
        user.assignToOrganization(org.getId());
        userRepo.save(user);

        log.info("User {} joined org {} via invite {}", userId, org.getId(), invite.getId());
        return org.getId();
    }
}
