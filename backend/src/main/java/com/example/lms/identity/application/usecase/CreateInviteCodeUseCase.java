package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.CreateInviteCodeCommand;
import com.example.lms.identity.application.dto.InviteResponse;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationInvite;
import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreateInviteCodeUseCase {

    private final OrganizationRepository orgRepo;
    private final OrganizationInviteRepository inviteRepo;

    @Transactional
    public InviteResponse execute(UUID organizationId, CreateInviteCodeCommand command, UUID createdBy) {
        Organization org = orgRepo.findById(organizationId)
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", organizationId));

        if (!org.isEnabled()) {
            throw new IllegalStateException("Tổ chức đã bị vô hiệu hóa");
        }

        OrganizationInvite invite = OrganizationInvite.createCode(
                organizationId, command.maxUses(), command.expiryDays(), createdBy);

        // Ensure unique code (extremely rare collision)
        int retries = 0;
        while (inviteRepo.existsByCode(invite.getCode()) && retries < 5) {
            invite = OrganizationInvite.createCode(
                    organizationId, command.maxUses(), command.expiryDays(), createdBy);
            retries++;
        }

        OrganizationInvite saved = inviteRepo.save(invite);
        // Audit fix: mask code in logs (show first 3 chars only)
        log.info("Invite code created for org={} code={}*** by={}",
                organizationId, saved.getCode().substring(0, 3), createdBy);

        return InviteResponse.from(saved, org.getName());
    }
}
