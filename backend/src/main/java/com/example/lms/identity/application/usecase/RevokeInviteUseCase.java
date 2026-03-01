package com.example.lms.identity.application.usecase;

import com.example.lms.identity.domain.model.OrganizationInvite;
import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RevokeInviteUseCase {

    private final OrganizationInviteRepository inviteRepo;

    @Transactional
    public void execute(UUID inviteId, UUID organizationId) {
        OrganizationInvite invite = inviteRepo.findById(inviteId)
                .orElseThrow(() -> new EntityNotFoundException("Lời mời", inviteId));

        // Verify invite belongs to the organization
        if (!invite.getOrganizationId().equals(organizationId)) {
            throw new EntityNotFoundException("Lời mời", inviteId);
        }

        invite.revoke();
        inviteRepo.save(invite);
        log.info("Invite {} revoked for org={}", inviteId, organizationId);
    }
}
