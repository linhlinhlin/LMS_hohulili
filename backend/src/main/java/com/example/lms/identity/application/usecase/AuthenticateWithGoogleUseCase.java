package com.example.lms.identity.application.usecase;

import com.example.lms.identity.application.dto.AuthResponse;
import com.example.lms.identity.application.dto.AuthenticateWithGoogleCommand;
import com.example.lms.identity.application.dto.UserResponse;
import com.example.lms.identity.application.dto.VerifiedGoogleIdentity;
import com.example.lms.identity.application.port.GoogleIdentityVerifierPort;
import com.example.lms.identity.application.port.TokenService;
import com.example.lms.identity.domain.model.ExternalIdentityProvider;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.identity.domain.model.User;
import com.example.lms.identity.domain.model.UserExternalIdentity;
import com.example.lms.identity.domain.repository.ExternalIdentityRepository;
import com.example.lms.identity.domain.repository.OrganizationRepository;
import com.example.lms.identity.domain.repository.UserRepository;
import com.example.lms.shared.domain.valueobject.Email;
import com.example.lms.shared.exception.DomainException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticateWithGoogleUseCase {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Qualifier("newUserRepositoryAdapter")
    private final UserRepository userRepository;
    private final ExternalIdentityRepository externalIdentityRepository;
    private final GoogleIdentityVerifierPort googleIdentityVerifier;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final AcceptInviteUseCase acceptInviteUseCase;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public AuthResponse execute(AuthenticateWithGoogleCommand command) {
        VerifiedGoogleIdentity googleIdentity = googleIdentityVerifier.verifyIdToken(command.idToken());
        log.info("Authenticating with Google: {}", googleIdentity.email());

        User user = externalIdentityRepository.findByProviderAndExternalSubject(
                        ExternalIdentityProvider.GOOGLE,
                        googleIdentity.subject()
                )
                .map(identity -> authenticateLinkedUser(identity, googleIdentity))
                .orElseGet(() -> provisionOrRejectUser(googleIdentity, command.inviteCode()));

        String email = user.getEmail() != null ? user.getEmail().getValue() : user.getUsername();
        long refreshExpiryMs = computeRefreshExpiryMs(user);

        return new AuthResponse(
                tokenService.generateAccessToken(user.getId().value(), email, user.getRole().name(), user.getOrganizationId()),
                tokenService.generateRefreshToken(user.getId().value(), email, user.getRole().name(), refreshExpiryMs),
                UserResponse.fromDomain(user)
        );
    }

    private User authenticateLinkedUser(UserExternalIdentity identity, VerifiedGoogleIdentity googleIdentity) {
        User user = userRepository.findById(identity.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Nguoi dung lien ket Google", identity.getUserId().value()));

        if (!user.isEnabled()) {
            throw new DomainException("ACCOUNT_DISABLED", "Tai khoan da bi vo hieu hoa");
        }

        identity.markLogin();
        externalIdentityRepository.save(identity);
        log.info("Google sign-in matched linked account: {}", googleIdentity.email());
        return user;
    }

    private User provisionOrRejectUser(VerifiedGoogleIdentity googleIdentity, String inviteCode) {
        User existingUser = userRepository.findByEmail(googleIdentity.email()).orElse(null);
        if (existingUser != null) {
            if (!existingUser.isEnabled()) {
                throw new DomainException("ACCOUNT_DISABLED", "Tai khoan da bi vo hieu hoa");
            }
            throw new DomainException(
                    "ACCOUNT_LINK_REQUIRED",
                    "Email nay da co tai khoan LMS. Vui long dang nhap bang mat khau truoc roi lien ket Google sau."
            );
        }

        User newUser = createGoogleUser(googleIdentity, inviteCode);
        User savedUser = userRepository.save(newUser);

        UserExternalIdentity identity = UserExternalIdentity.linkGoogle(
                savedUser.getId(),
                googleIdentity.subject(),
                googleIdentity.email(),
                Instant.now()
        );
        externalIdentityRepository.save(identity);

        log.info("Provisioned new Google-backed LMS account: {}", googleIdentity.email());
        return savedUser;
    }

    private User createGoogleUser(VerifiedGoogleIdentity googleIdentity, String inviteCode) {
        String normalizedEmail = googleIdentity.email().trim().toLowerCase(Locale.ROOT);
        String username = determineUsername(normalizedEmail, googleIdentity.subject());
        String fullName = deriveFullName(googleIdentity.fullName(), normalizedEmail);
        String encodedPassword = passwordEncoder.encode(generateUnusablePasswordSeed());

        User user = User.createNew(
                username,
                Email.of(normalizedEmail),
                encodedPassword,
                fullName,
                Role.STUDENT
        );
        user.updateAvatarUrl(googleIdentity.avatarUrl());

        String normalizedInviteCode = inviteCode != null ? inviteCode.trim() : "";
        if (!normalizedInviteCode.isBlank()) {
            try {
                UUID orgId = acceptInviteUseCase.acceptForNewUser(normalizedInviteCode);
                user.assignToOrganization(orgId);
            } catch (EntityNotFoundException e) {
                throw new DomainException("INVITE_INVALID", "Ma moi khong hop le hoac da het han");
            } catch (IllegalStateException e) {
                throw new DomainException("INVITE_INVALID", e.getMessage());
            }
        } else {
            organizationRepository.findByCode("WIII")
                    .filter(org -> org.isEnabled())
                    .ifPresent(org -> user.assignToOrganization(org.getId()));
        }

        return user;
    }

    private String determineUsername(String email, String googleSubject) {
        if (email.length() <= 50 && !userRepository.existsByUsername(email)) {
            return email;
        }

        String normalizedSubject = googleSubject.replaceAll("[^A-Za-z0-9]", "");
        String suffix = normalizedSubject.length() > 12
                ? normalizedSubject.substring(normalizedSubject.length() - 12)
                : normalizedSubject;
        if (suffix.isBlank()) {
            suffix = "google";
        }

        String candidate = "google_" + suffix;
        if (!userRepository.existsByUsername(candidate)) {
            return candidate;
        }

        return "google_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String deriveFullName(String fullName, String email) {
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    private String generateUnusablePasswordSeed() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return "google-only-" + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private long computeRefreshExpiryMs(User user) {
        if (user.getTokenExpiryDays() != null) {
            return user.getTokenExpiryDays() * 86_400_000L;
        }
        if (user.getOrganizationId() != null) {
            return organizationRepository.findById(user.getOrganizationId())
                    .map(org -> org.getTokenExpiryDays() * 86_400_000L)
                    .orElse(30L * 86_400_000L);
        }
        return 30L * 86_400_000L;
    }
}
