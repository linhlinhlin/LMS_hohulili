package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.InviteResponse;
import com.example.lms.identity.application.dto.SendEmailInviteCommand;
import com.example.lms.identity.domain.model.Organization;
import com.example.lms.identity.domain.model.OrganizationInvite;
import com.example.lms.identity.domain.model.TokenHasher;
import com.example.lms.identity.domain.repository.OrganizationInviteRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.shared.application.port.EmailServicePort;
import com.example.lms.shared.exception.EntityNotFoundException;
import com.example.lms.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SendEmailInviteUseCase {

    private final OrganizationRepository orgRepo;
    private final OrganizationInviteRepository inviteRepo;
    private final UserJpaRepository userJpaRepo;
    private final EmailServicePort emailService;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @Transactional
    public InviteResponse execute(UUID organizationId, SendEmailInviteCommand command, UUID createdBy) {
        Organization org = orgRepo.findById(organizationId)
                .orElseThrow(() -> new EntityNotFoundException("Tổ chức", organizationId));

        if (!org.isEnabled()) {
            throw new IllegalStateException("Tổ chức đã bị vô hiệu hóa");
        }

        String email = command.email().toLowerCase().trim();

        // Audit fix: Check if email is already a member of this org
        boolean alreadyMember = userJpaRepo.findByEmail(email)
                .map(u -> organizationId.equals(u.getOrganizationId()))
                .orElse(false);
        if (alreadyMember) {
            throw new ValidationException("email", "Người dùng này đã là thành viên của tổ chức");
        }

        // Audit fix: Revoke existing active invite for same org+email (replace pattern)
        inviteRepo.findActiveByOrgAndEmail(organizationId, email)
                .ifPresent(existing -> {
                    existing.revoke();
                    inviteRepo.save(existing);
                });

        // Generate raw token + hash
        String rawToken = TokenHasher.generateRawToken();
        String tokenHash = TokenHasher.hash(rawToken);

        OrganizationInvite invite = OrganizationInvite.createEmailInvite(
                organizationId, email, tokenHash, command.expiryDays(), createdBy);

        OrganizationInvite saved = inviteRepo.save(invite);

        // Send email with raw token (URL-encoded for safety)
        String encodedToken = URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        String inviteLink = frontendUrl + "/auth/join?token=" + encodedToken;
        try {
            emailService.sendOrganizationInvite(email, org.getName(), inviteLink);
        } catch (Exception e) {
            log.warn("Failed to send invite email to {}: {}", email, e.getMessage());
        }

        log.info("Email invite sent for org={} to={} by={}", organizationId, email, createdBy);
        return InviteResponse.from(saved, org.getName());
    }
}
