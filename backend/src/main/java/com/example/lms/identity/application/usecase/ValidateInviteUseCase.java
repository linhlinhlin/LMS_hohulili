package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.InviteResponse;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationInvite;
import com.example.lms.identity.domain.model.TokenHasher;
import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Validate an invite code or email token and return org info.
 * Public endpoint — no auth required. Rate-limited.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ValidateInviteUseCase {

    private final OrganizationInviteRepository inviteRepo;
    private final OrganizationRepository orgRepo;

    /**
     * Validate invite by code (bulk invite codes).
     */
    @Transactional(readOnly = true)
    public InviteResponse validateByCode(String code) {
        // Audit fix: NO toUpperCase on email tokens — only on invite codes
        OrganizationInvite invite = inviteRepo.findActiveByCode(code.toUpperCase().trim())
                .orElseThrow(() -> {
                    log.warn("Invalid invite code attempted: {}***", code.length() > 3 ? code.substring(0, 3) : "???");
                    return new EntityNotFoundException("Mã mời", code);
                });

        // Audit fix: Check org is still enabled
        Organization org = orgRepo.findById(invite.getOrganizationId())
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", invite.getOrganizationId()));
        if (!org.isEnabled()) {
            throw new IllegalStateException("Tổ chức đã bị vô hiệu hóa");
        }

        return InviteResponse.from(invite, org.getName());
    }

    /**
     * Validate invite by email token (personal invites).
     */
    @Transactional(readOnly = true)
    public InviteResponse validateByToken(String rawToken) {
        // Audit fix: do NOT toUpperCase email tokens — Base64URL is case-sensitive
        String tokenHash = TokenHasher.hash(rawToken.trim());

        OrganizationInvite invite = inviteRepo.findActiveByTokenHash(tokenHash)
                .orElseThrow(() -> {
                    log.warn("Invalid invite token attempted");
                    return new EntityNotFoundException("Lời mời", "token");
                });

        Organization org = orgRepo.findById(invite.getOrganizationId())
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", invite.getOrganizationId()));
        if (!org.isEnabled()) {
            throw new IllegalStateException("Tổ chức đã bị vô hiệu hóa");
        }

        return InviteResponse.from(invite, org.getName());
    }
}
